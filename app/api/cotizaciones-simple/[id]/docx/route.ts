import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import { generateCotizacionSimpleDocx } from "@/lib/cotizacion-simple-docx";

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

  const settings = await getCompanyProfile(cotizacion.profileSlot);

  const buffer = await generateCotizacionSimpleDocx(cotizacion as any, settings as any);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${cotizacion.numero}.docx"`,
    },
  });
}
