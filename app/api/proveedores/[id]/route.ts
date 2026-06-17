import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: { presupuestos: { orderBy: { createdAt: "desc" } } },
  });
  if (!proveedor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(proveedor);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const proveedor = await prisma.proveedor.update({ where: { id }, data: body });
  return NextResponse.json(proveedor);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any)?.role === "user") {
    return NextResponse.json({ error: "No tenés permiso para eliminar proveedores." }, { status: 403 });
  }
  const { id } = await params;
  await prisma.proveedor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
