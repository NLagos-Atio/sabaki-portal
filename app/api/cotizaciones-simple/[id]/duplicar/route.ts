import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const original = await prisma.cotizacionSimple.findUnique({
    where: { id },
    include: { items: true, condiciones: true },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: _id, numero, createdAt, updatedAt, userId, items, condiciones, ...data } = original;

  // Nuevo número: CV-YYYY-NNN basado en el último
  const year = new Date().getFullYear();
  const ultima = await prisma.cotizacionSimple.findFirst({ orderBy: { createdAt: "desc" } });
  const lastNum = ultima?.numero.match(/(\d+)$/)?.[1];
  const next = lastNum ? String(Number(lastNum) + 1).padStart(3, "0") : "001";
  const nuevoNumero = `CV-${year}-${next}`;

  const nuevo = await prisma.cotizacionSimple.create({
    data: {
      ...data,
      numero: nuevoNumero,
      estado: "borrador",
      fecha: new Date(),
      userId: session.user!.id!,
      items: {
        create: items.map(({ id: _i, cotizacionSimpleId: _cid, ...item }) => item),
      },
      condiciones: {
        create: condiciones.map(({ id: _i, cotizacionSimpleId: _cid, ...c }) => c),
      },
    },
    include: { items: true, condiciones: true },
  });

  return NextResponse.json(nuevo, { status: 201 });
}
