import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import { renderToBuffer } from "@react-pdf/renderer";
import { CotizacionSimplePDF } from "@/components/pdf/CotizacionSimplePDF";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const preview = req.nextUrl.searchParams.get("preview") === "1";

  const cotizacion = await prisma.cotizacionSimple.findUnique({
    where: { id },
    include: {
      items:       { orderBy: { orden: "asc" } },
      condiciones: { orderBy: { orden: "asc" } },
    },
  });

  if (!cotizacion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getCompanyProfile(cotizacion.profileSlot);

  const element = React.createElement(CotizacionSimplePDF, {
    cotizacion: cotizacion as any,
    settings:   settings   as any,
  }) as unknown as React.ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(element);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": preview
        ? `inline; filename="${cotizacion.numero}.pdf"`
        : `attachment; filename="${cotizacion.numero}.pdf"`,
    },
  });
}
