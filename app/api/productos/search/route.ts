import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q         = (searchParams.get("q") || "").trim();
  const categorias = searchParams.get("categorias")?.split(",").filter(Boolean) || [];
  const page      = Math.max(1, Number(searchParams.get("page") || "1"));
  const frecuentes = searchParams.get("frecuentes") === "1";

  // Si piden productos frecuentes (sin búsqueda): últimos usados en cotizaciones
  if (frecuentes && !q) {
    const items = await prisma.cotizacionItem.findMany({
      orderBy: { cotizacion: { updatedAt: "desc" } },
      select: { descripcion: true, precioUsd: true },
      distinct: ["descripcion"],
      take: 10,
    });

    // Buscar en catálogo los productos que coincidan por nombre
    const nombres = items.map((i) => i.descripcion);
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        nombre: { in: nombres },
        ...(categorias.length > 0 ? { categoria: { in: categorias } } : {}),
      },
      select: { id: true, nombre: true, descripcion: true, fabricante: true, numeroParte: true, precioUsd: true, precioUsdFabricante: true, categoria: true },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ productos, total: productos.length, page: 1, pages: 1, frecuentes: true });
  }

  // Búsqueda normal con filtros
  const where: any = {
    activo: true,
    ...(categorias.length > 0 ? { categoria: { in: categorias } } : {}),
    ...(q ? {
      OR: [
        { nombre:      { contains: q } },
        { descripcion: { contains: q } },
        { fabricante:  { contains: q } },
        { numeroParte: { contains: q } },
        { categoria:   { contains: q } },
      ],
    } : {}),
  };

  const [total, productos] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      select: { id: true, nombre: true, descripcion: true, fabricante: true, numeroParte: true, precioUsd: true, precioUsdFabricante: true, categoria: true },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    productos,
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
    frecuentes: false,
  });
}
