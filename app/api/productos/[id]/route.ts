import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { ultimaActPrecio, ...rest } = body;

  const producto = await prisma.producto.update({
    where: { id },
    data: {
      ...rest,
      ultimaActPrecio: ultimaActPrecio ? new Date(ultimaActPrecio) : null,
      updatedByNombre: session.user?.name ?? null,
    },
  });
  return NextResponse.json(producto);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.producto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
