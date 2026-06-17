import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, any> = {};
  if ("active" in body) data.active = body.active;
  if ("name" in body) data.name = body.name;
  if ("email" in body) data.email = body.email;
  if ("role" in body) data.role = body.role;
  if ("cargo" in body) data.cargo = body.cargo || null;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, cargo: true, active: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está en uso por otro usuario." }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "Error al actualizar el usuario" }, { status: 500 });
  }
}
