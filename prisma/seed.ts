import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";

const rawUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
const url = rawUrl.startsWith("file:")
  ? (() => { const p = rawUrl.replace(/^file:/, ""); return `file:${path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)}`; })()
  : rawUrl;
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sabaki.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@sabaki.com",
      password: passwordHash,
      role: "admin",
    },
  });

  // Preservar logoPath y otros ajustes configurados por el usuario — perfil 1 (slot 1)
  const settingsData = {
    nombre: "Sabaki Technologies S.A.",
    cuit: "30-71234567-8",
    condicionIva: "Responsable Inscripto",
    direccion: "Leandro N Alem 116, San Isidro, Buenos Aires",
    contactoNombre: "Sebastián Torres",
    contactoCargo: "Gerente Comercial",
    colorPrimario: "#1B2A4A",
    colorSecundario: "#2E86AB",
    notasDefault:
      "• Precios expresados en dólares estadounidenses (USD).\n• Validez de la oferta: 30 días desde la fecha de emisión.\n• Forma de pago: 50% anticipado, 50% contra entrega.\n• Garantía de equipos: 12 meses sobre defectos de fabricación.\n• Los precios no incluyen IVA salvo indicación contraria.",
  };
  await prisma.companyProfile.upsert({
    where: { slot: 1 },
    update: settingsData, // logoPath se preserva — no se sobreescribe
    create: { slot: 1, ...settingsData },
  });

  const productos = [
    {
      nombre: "VPI",
      descripcion: "Vehicle Position Indicator - Terminal de identificación vehicular",
      precioUsd: 377.62,
      categoria: "Hardware",
    },
    {
      nombre: "Visy flex 6750 mm",
      descripcion: "Sensor de nivel de combustible tipo flexible 6750mm",
      precioUsd: 4933.66,
      categoria: "Hardware",
    },
    {
      nombre: "CONTROL SITE ATG",
      descripcion: "Control Site ATG - Controlador de tanque automático",
      precioUsd: 2450.0,
      categoria: "Hardware",
    },
    {
      nombre: "ATIONET GATEWAY",
      descripcion: "Gateway de comunicación ATIONET para integración de sistemas",
      precioUsd: 1300.0,
      categoria: "Hardware",
    },
    {
      nombre: "Licencia ATIONET HB",
      descripcion: "Licencia mensual plataforma ATIONET Hub - por sitio",
      precioUsd: 150.0,
      categoria: "Recurrente",
    },
  ];

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { id: p.nombre },
      update: {},
      create: { ...p, id: p.nombre },
    });
  }

  const cotizacion = await prisma.cotizacion.upsert({
    where: { numero: "MSC-2026-002" },
    update: {},
    create: {
      numero: "MSC-2026-002",
      fecha: new Date("2026-01-15"),
      validezDias: 30,
      moneda: "USD",
      estado: "enviada",
      clienteEmpresa: "Minera Santa Cruz S.A.",
      clienteCuit: "30-68901234-5",
      clienteContacto: "Ing. Roberto Villanueva",
      clienteCargo: "Jefe de Infraestructura",
      clienteTelefono: "+54 11 4567-8901",
      alcance: "3 sitios / estaciones de carga",
      introduccion:
        "En respuesta a su solicitud de presupuesto, Sabaki Technologies S.A. se complace en presentar la siguiente propuesta técnico-comercial para la implementación de un sistema de gestión y control de combustible en sus instalaciones.",
      sitios:
        "• Sitio 1: Planta Principal — Río Gallegos\n• Sitio 2: Campamento Norte — Km 45\n• Sitio 3: Campamento Sur — Km 120",
      condiciones:
        "• Precios expresados en dólares estadounidenses (USD).\n• Validez de la oferta: 30 días desde la fecha de emisión.\n• Forma de pago: 50% anticipado, 50% contra entrega.\n• Garantía de equipos: 12 meses sobre defectos de fabricación.\n• Los precios no incluyen IVA.",
      margen: 15,
      iva: 21,
      totalOnetimeUsd: 28880.58,
      totalRecurrenteUsd: 518.4,
      userId: admin.id,
      items: {
        create: [
          { descripcion: "VPI", cantidad: 3, precioUsd: 377.62, subtotalUsd: 1132.86, tipo: "onetime", orden: 1 },
          { descripcion: "Visy flex 6750 mm", cantidad: 3, precioUsd: 4933.66, subtotalUsd: 14800.98, tipo: "onetime", orden: 2 },
          { descripcion: "CONTROL SITE ATG", cantidad: 3, precioUsd: 2450.0, subtotalUsd: 7350.0, tipo: "onetime", orden: 3 },
          { descripcion: "ATIONET GATEWAY", cantidad: 3, precioUsd: 1300.0, subtotalUsd: 3900.0, tipo: "onetime", orden: 4 },
          { descripcion: "Licencia ATIONET HB", cantidad: 3, precioUsd: 150.0, subtotalUsd: 450.0, tipo: "recurrente", orden: 1 },
        ],
      },
    },
  });

  // ── Cotización Simple de ejemplo ──────────────────────────────────
  await prisma.cotizacionSimple.upsert({
    where: { numero: "CV-2026-006" },
    update: {},
    create: {
      numero:          "CV-2026-006",
      titulo:          "COTIZACION – TELEMETRIA",
      fecha:           new Date("2026-06-04"),
      estado:          "enviada",
      moneda:          "USD",
      clienteEmpresa:  "Cerro Vanguardia SA",
      clienteContacto: "Christian Lezcano",
      margen:          0,
      iva:             21,
      mostrarIva:      false,
      total:           12262.51,
      userId:          admin.id,
      items: {
        create: [
          {
            descripcion:    "VISY-RFT-L - Transmisor para VISY-Stick (FAFNIR 900093)",
            notaSecundaria: "Incluye batería de litio certificada UN 3091",
            cantidad:       8,
            precioUsd:      1268.84,
            subtotalUsd:    10150.69,
            orden:          0,
          },
          {
            descripcion:    "Kit de Instalacion para VISY-RFT (FAFNIR 910040)",
            notaSecundaria: null,
            cantidad:       8,
            precioUsd:      100.95,
            subtotalUsd:    807.58,
            orden:          1,
          },
          {
            descripcion:    "Modulo Receptor RF para VISY-Command RF (FAFNIR 908440)",
            notaSecundaria: "Incluye cable coaxial",
            cantidad:       1,
            precioUsd:      1304.23,
            subtotalUsd:    1304.23,
            orden:          2,
          },
        ],
      },
      condiciones: {
        create: [
          { label: "Precios:",          valor: "Los precios indicados son en USD y NO incluyen IVA (21%). El IVA se facturará por separado según la condición impositiva del comprador.", orden: 0 },
          { label: "Pago:",             valor: "100 % contra entrega.",                                              orden: 1 },
          { label: "Plazo de entrega:", valor: "8 a 10 semanas desde confirmación de orden de compra.",              orden: 2 },
          { label: "Garantía:",         valor: "12 meses por defectos de fabricación.",                              orden: 3 },
          { label: "Entrega",           valor: "En transportista a cargo de Cerro Vanguardia.",                      orden: 4 },
          { label: "Validez:",          valor: "30 días.",                                                           orden: 5 },
        ],
      },
    },
  });

  console.log("Seed completado:", { admin: admin.email, cotizacion: cotizacion.numero, simple: "CV-2026-006" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
