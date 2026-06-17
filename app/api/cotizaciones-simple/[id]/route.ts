import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cotizacion = await prisma.cotizacionSimple.findUnique({
    where: { id },
    include: {
      items:       { orderBy: { orden: "asc" } },
      condiciones: { orderBy: { orden: "asc" } },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cotizacion);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    items, condiciones,
    id: _id, createdAt: _c, updatedAt: _u, user: _u2, userId: _uid,
    ...data
  } = body;

  const fecha = data.fecha ? new Date(data.fecha) : undefined;
  if (data.profileSlot != null) data.profileSlot = data.profileSlot === 2 ? 2 : 1;

  const cleanItems = (items || []).map(
    ({ id: _i, cotizacionSimpleId: _cid, ...item }: any) => item,
  );
  const cleanConds = (condiciones || []).map(
    ({ id: _i, cotizacionSimpleId: _cid, ...c }: any) => c,
  );

  await prisma.cotizacionSimpleItem.deleteMany({ where: { cotizacionSimpleId: id } });
  await prisma.cotizacionSimpleCondicion.deleteMany({ where: { cotizacionSimpleId: id } });

  try {
    const cotizacion = await prisma.cotizacionSimple.update({
      where: { id },
      data: {
        ...data,
        ...(fecha ? { fecha } : {}),
        items:       { create: cleanItems },
        condiciones: { create: cleanConds },
      },
      include: { items: true, condiciones: true },
    });
    return NextResponse.json(cotizacion);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: `El número "${data.numero}" ya existe.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: e?.message || "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if ((session.user as any)?.role === "user") {
    const cotizacion = await prisma.cotizacionSimple.findUnique({ where: { id }, select: { userId: true } });
    if (!cotizacion) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (cotizacion.userId !== session.user!.id) {
      return NextResponse.json({ error: "No tenés permiso para eliminar esta cotización." }, { status: 403 });
    }
  }

  await prisma.cotizacionSimple.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
