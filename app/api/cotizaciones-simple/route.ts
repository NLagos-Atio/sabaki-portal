import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.cotizacionSimple.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      numero: true,
      titulo: true,
      clienteEmpresa: true,
      fecha: true,
      total: true,
      estado: true,
      moneda: true,
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { items, condiciones, id: _id, createdAt: _c, updatedAt: _u, user: _u2, ...data } = body;

  const fecha = data.fecha ? new Date(data.fecha) : new Date();
  data.profileSlot = data.profileSlot === 2 ? 2 : 1;

  const cleanItems = (items || []).map(
    ({ id: _i, cotizacionSimpleId: _cid, ...item }: any) => item,
  );
  const cleanConds = (condiciones || []).map(
    ({ id: _i, cotizacionSimpleId: _cid, ...c }: any) => c,
  );

  try {
    const cotizacion = await prisma.cotizacionSimple.create({
      data: {
        ...data,
        fecha,
        userId: session.user!.id!,
        items:       { create: cleanItems },
        condiciones: { create: cleanConds },
      },
      include: { items: true, condiciones: true },
    });
    return NextResponse.json(cotizacion, { status: 201 });
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
