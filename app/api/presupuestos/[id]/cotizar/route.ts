import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CostoAdicional {
  nombre: string;
  monto: number;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json();
  const {
    clienteEmpresa,
    clienteCuit,
    clienteContacto,
    clienteCargo,
    clienteTelefono,
    tipoCambio,
    markup,
    iva,
    costosImportacion = [],
    costosNacionalizacion = [],
  } = body;

  if (!clienteEmpresa) {
    return NextResponse.json({ error: "El nombre de la empresa cliente es requerido" }, { status: 400 });
  }

  // Obtener presupuesto analizado
  const presupuesto = await prisma.presupuestoProveedor.findUnique({ where: { id } });
  if (!presupuesto) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  if (!presupuesto.procesado) return NextResponse.json({ error: "El presupuesto aún no fue analizado con IA" }, { status: 400 });

  // Tipo de cambio
  const monedaOrigen = presupuesto.moneda || "USD";
  const tc = (monedaOrigen !== "USD" && tipoCambio && tipoCambio > 0) ? Number(tipoCambio) : 1;

  // Parsear items y cargos del presupuesto
  const itemsProveedor: any[] = presupuesto.itemsJson ? JSON.parse(presupuesto.itemsJson) : [];
  const cargosProveedor: any[] = presupuesto.cargosJson ? JSON.parse(presupuesto.cargosJson) : [];

  // Construir items de la cotización
  const cotizacionItems: any[] = [];
  let orden = 0;

  // 1. Items principales del presupuesto → One-Time
  for (const item of itemsProveedor) {
    const precioUsd = Math.round(item.precioUnitario * tc * 100) / 100;
    const subtotalUsd = Math.round(item.cantidad * precioUsd * 100) / 100;
    const descripcion = monedaOrigen !== "USD" && tc !== 1
      ? `${item.descripcion} (${monedaOrigen} ${item.precioUnitario.toFixed(2)} × TC ${tc})`
      : item.descripcion;

    cotizacionItems.push({
      descripcion,
      cantidad: item.cantidad,
      precioUsd,
      subtotalUsd,
      tipo: "onetime",
      orden: orden++,
    });
  }

  // 2. Cargos del proveedor (flete, seguro, embalaje) → Envío
  for (const cargo of cargosProveedor) {
    if (!cargo.monto || cargo.monto <= 0) continue;
    const precioUsd = Math.round(cargo.monto * tc * 100) / 100;
    cotizacionItems.push({
      descripcion: cargo.nombre,
      cantidad: 1,
      precioUsd,
      subtotalUsd: precioUsd,
      tipo: "envio",
      orden: orden++,
    });
  }

  // 3. Costos de importación → One-Time
  for (const costo of (costosImportacion as CostoAdicional[])) {
    if (!costo.nombre || !costo.monto || costo.monto <= 0) continue;
    cotizacionItems.push({
      descripcion: `[Importación] ${costo.nombre}`,
      cantidad: 1,
      precioUsd: costo.monto,
      subtotalUsd: costo.monto,
      tipo: "onetime",
      orden: orden++,
    });
  }

  // 4. Costos de nacionalización → One-Time
  for (const costo of (costosNacionalizacion as CostoAdicional[])) {
    if (!costo.nombre || !costo.monto || costo.monto <= 0) continue;
    cotizacionItems.push({
      descripcion: `[Nacionalización] ${costo.nombre}`,
      cantidad: 1,
      precioUsd: costo.monto,
      subtotalUsd: costo.monto,
      tipo: "onetime",
      orden: orden++,
    });
  }

  // Calcular totales (misma lógica que CotizacionForm)
  const subtotalOnetime = cotizacionItems.filter(i => i.tipo === "onetime").reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalEnvio = cotizacionItems.filter(i => i.tipo === "envio").reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt = (subtotalOnetime + subtotalEnvio) * ((markup || 0) / 100);
  const subtotalConMargen = subtotalOnetime + subtotalEnvio + margenAmt;
  const ivaAmt = subtotalConMargen * ((iva || 21) / 100);
  const totalOnetimeUsd = Math.round((subtotalConMargen + ivaAmt) * 100) / 100;

  // Generar número correlativo
  const ultimaCot = await prisma.cotizacion.findFirst({ orderBy: { createdAt: "desc" } });
  const year = new Date().getFullYear();
  const lastNum = ultimaCot?.numero.match(/(\d+)$/)?.[1];
  const next = lastNum ? String(Number(lastNum) + 1).padStart(3, "0") : "001";
  const numero = `COT-${year}-${next}`;

  // Condiciones base del presupuesto
  let condiciones = "";
  if (presupuesto.condPago) condiciones += `• Condición de pago: ${presupuesto.condPago}\n`;
  if (presupuesto.incoterm) condiciones += `• Incoterm: ${presupuesto.incoterm}\n`;
  if (presupuesto.impuestos) condiciones += `• Impuestos: ${presupuesto.impuestos}\n`;
  if (presupuesto.validezOferta) {
    const vDias = Math.ceil((new Date(presupuesto.validezOferta).getTime() - Date.now()) / 86400000);
    if (vDias > 0) condiciones += `• Validez de oferta del proveedor: ${vDias} días\n`;
  }

  // Crear cotización borrador
  try {
    const cotizacion = await prisma.cotizacion.create({
      data: {
        numero,
        fecha: new Date(),
        validezDias: 30,
        moneda: "USD",
        estado: "borrador",
        clienteEmpresa,
        clienteCuit: clienteCuit || null,
        clienteContacto: clienteContacto || null,
        clienteCargo: clienteCargo || null,
        clienteTelefono: clienteTelefono || null,
        margen: markup || 0,
        iva: iva || 21,
        totalOnetimeUsd,
        totalRecurrenteUsd: 0,
        condiciones: condiciones.trim() || null,
        presupuestoOrigenId: id,
        userId: session.user!.id!,
        items: { create: cotizacionItems },
        tasas: { create: [] },
      },
    });

    return NextResponse.json({ cotizacionId: cotizacion.id }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: `Número de propuesta "${numero}" duplicado. Intentá de nuevo.` }, { status: 409 });
    }
    return NextResponse.json({ error: `Error al crear cotización: ${e?.message}` }, { status: 500 });
  }
}
