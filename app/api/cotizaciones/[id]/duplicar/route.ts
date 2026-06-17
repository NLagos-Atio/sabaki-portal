import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCotizacionNumber } from "@/lib/utils";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const original = await prisma.cotizacion.findUnique({
    where: { id },
    include: { items: true, tasas: true },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: _id, numero, createdAt, updatedAt, userId, items, tasas, ...cotData } = original;

  const nuevo = await prisma.cotizacion.create({
    data: {
      ...cotData,
      numero: generateCotizacionNumber("COT"),
      estado: "borrador",
      fecha: new Date(),
      userId: session.user!.id!,
      items: {
        create: items.map(({ id: _iid, cotizacionId: _cid, ...item }) => item),
      },
      tasas: {
        create: tasas.map(({ id: _tid, cotizacionId: _cid, ...tasa }) => tasa),
      },
    },
    include: { items: true, tasas: true },
  });

  return NextResponse.json(nuevo, { status: 201 });
}
