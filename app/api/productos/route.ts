import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  fabricante: z.string().nullable().optional(),
  precioUsd: z.number().positive(),
  precioUsdFabricante: z.number().nullable().optional(),
  numeroParte: z.string().nullable().optional(),
  ultimaActPrecio: z.string().nullable().optional(),
  categoria: z.string().min(1),
  activo: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const productos = await prisma.producto.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(productos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = schema.parse(body);

  const producto = await prisma.producto.create({
    data: {
      ...data,
      ultimaActPrecio: data.ultimaActPrecio ? new Date(data.ultimaActPrecio) : null,
      updatedByNombre: session.user?.name ?? null,
    },
  });
  return NextResponse.json(producto, { status: 201 });
}
