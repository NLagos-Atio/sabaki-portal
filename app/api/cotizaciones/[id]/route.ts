import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: { items: { orderBy: { orden: "asc" } }, tasas: true, user: { select: { name: true } } },
  });

  if (!cotizacion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cotizacion);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { items, tasas, id: _id, createdAt: _c, updatedAt: _u, user: _user, userId: _uid, ...cotData } = body;

  // Convertir fecha string "YYYY-MM-DD" a DateTime ISO
  const fecha = cotData.fecha ? new Date(cotData.fecha) : undefined;
  if (cotData.profileSlot != null) cotData.profileSlot = cotData.profileSlot === 2 ? 2 : 1;

  // Limpiar items y tasas
  const cleanItems = (items || []).map(({ id: _id, cotizacionId: _cid, ...item }: any) => item);
  const cleanTasas = (tasas || []).map(({ id: _id, cotizacionId: _cid, ...tasa }: any) => tasa);

  await prisma.cotizacionItem.deleteMany({ where: { cotizacionId: id } });
  await prisma.cotizacionTasa.deleteMany({ where: { cotizacionId: id } });

  try {
    const cotizacion = await prisma.cotizacion.update({
      where: { id },
      data: {
        ...cotData,
        ...(fecha ? { fecha } : {}),
        items: { create: cleanItems },
        tasas: { create: cleanTasas },
      },
      include: { items: true, tasas: true },
    });
    return NextResponse.json(cotizacion);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: `El número de propuesta "${cotData.numero}" ya existe. Cambiá el número e intentá de nuevo.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Error al guardar: ${e?.message || "Error desconocido"}` },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if ((session.user as any)?.role === "user") {
    const cotizacion = await prisma.cotizacion.findUnique({ where: { id }, select: { userId: true } });
    if (!cotizacion) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (cotizacion.userId !== session.user!.id) {
      return NextResponse.json({ error: "No tenés permiso para eliminar esta cotización." }, { status: 403 });
    }
  }

  await prisma.cotizacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
