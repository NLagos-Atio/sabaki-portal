import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: proveedorId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  // Guardar archivo
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `presupuesto_${Date.now()}_${file.name.replace(/\s/g, "_")}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await writeFile(join(uploadDir, filename), buffer);

  const presupuesto = await prisma.presupuestoProveedor.create({
    data: {
      proveedorId,
      nombreArchivo: file.name,
      rutaArchivo: `/uploads/${filename}`,
    },
  });

  return NextResponse.json(presupuesto, { status: 201 });
}
