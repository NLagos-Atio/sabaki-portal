import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proveedores = await prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { presupuestos: true } } },
  });
  return NextResponse.json(proveedores);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const proveedor = await prisma.proveedor.create({ data: body });
  return NextResponse.json(proveedor, { status: 201 });
}
