import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { indices, tipoCambio, monedaOrigen } = await req.json();

  const presupuesto = await prisma.presupuestoProveedor.findUnique({ where: { id } });
  if (!presupuesto || !presupuesto.itemsJson) {
    return NextResponse.json({ error: "Presupuesto sin ítems analizados" }, { status: 400 });
  }

  const items: any[] = JSON.parse(presupuesto.itemsJson);
  const toImport = indices !== undefined
    ? items.filter((_: any, i: number) => indices.includes(i))
    : items;

  // ¿Hay conversión de moneda?
  const needsConversion = monedaOrigen && monedaOrigen !== "USD" && tipoCambio && tipoCambio > 0;
  const tc: number = needsConversion ? Number(tipoCambio) : 1;

  const created = [];
  const skipped = [];

  for (const item of toImport) {
    // Verificar duplicado por código de parte
    if (item.codigoParte) {
      const existing = await prisma.producto.findFirst({
        where: { numeroParte: item.codigoParte },
      });
      if (existing) {
        skipped.push({ codigoParte: item.codigoParte, nombre: item.descripcion });
        continue;
      }
    }

    const precioOriginal: number = item.precioUnitario || 0;
    const precioUsd: number = needsConversion
      ? Math.round(precioOriginal * tc * 100) / 100
      : precioOriginal;

    // Descripción con nota de conversión si aplica
    let descripcion = item.notas || null;
    if (needsConversion) {
      const notaTC = `Precio original: ${monedaOrigen} ${precioOriginal.toFixed(2)} · TC usado: ${tc} USD/${monedaOrigen}`;
      descripcion = descripcion ? `${descripcion} | ${notaTC}` : notaTC;
    }

    const producto = await prisma.producto.create({
      data: {
        nombre: item.descripcion,
        descripcion,
        precioUsd,
        precioUsdFabricante: precioUsd,
        numeroParte: item.codigoParte || null,
        ultimaActPrecio: presupuesto.fechaDoc || new Date(),
        categoria: "Hardware",
        activo: true,
      },
    });
    created.push(producto);
  }

  return NextResponse.json({
    importados: created.length,
    omitidos: skipped.length,
    tipoCambioUsado: needsConversion ? tc : null,
    monedaOrigen: needsConversion ? monedaOrigen : null,
    detalle: {
      creados: created.map(p => p.nombre),
      omitidos: skipped.map(s => s.nombre),
    },
  });
}
