import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import { generateCotizacionDocx } from "@/lib/cotizacion-docx";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: { items: { orderBy: { orden: "asc" } }, tasas: true },
  });

  if (!cotizacion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getCompanyProfile(cotizacion.profileSlot);

  try {
    logger.docgen(`Generando DOCX: ${cotizacion.numero}`);
    const t0 = Date.now();
    const buffer = await generateCotizacionDocx(cotizacion as any, settings as any);
    logger.docgen(`DOCX generado OK: ${cotizacion.numero} en ${Date.now() - t0}ms`);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${cotizacion.numero}.docx"`,
      },
    });
  } catch (e: any) {
    logger.docgen(`Error generando DOCX ${cotizacion.numero}`, e);
    return NextResponse.json({ error: `Error al generar el documento: ${e?.message}` }, { status: 500 });
  }
}
