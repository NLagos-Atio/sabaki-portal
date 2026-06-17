import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cotizaciones = await prisma.cotizacion.findMany({
    include: { items: true, tasas: true, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cotizaciones);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { items, tasas, id: _id, createdAt: _c, updatedAt: _u, user: _user, ...cotData } = body;

  // Convertir fecha string "YYYY-MM-DD" a DateTime ISO
  const fecha = cotData.fecha ? new Date(cotData.fecha) : new Date();
  cotData.profileSlot = cotData.profileSlot === 2 ? 2 : 1;

  // Limpiar items: quitar campos que no pertenecen al modelo
  const cleanItems = (items || []).map(({ id: _id, cotizacionId: _cid, ...item }: any) => item);
  const cleanTasas = (tasas || []).map(({ id: _id, cotizacionId: _cid, ...tasa }: any) => tasa);

  try {
    const cotizacion = await prisma.cotizacion.create({
      data: {
        ...cotData,
        fecha,
        userId: session.user!.id!,
        items: { create: cleanItems },
        tasas: { create: cleanTasas },
      },
      include: { items: true, tasas: true },
    });
    return NextResponse.json(cotizacion, { status: 201 });
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
