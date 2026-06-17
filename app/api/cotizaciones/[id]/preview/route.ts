import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import { renderPreviewHtml } from "@/lib/render-preview";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: { items: { orderBy: { orden: "asc" } }, tasas: true },
  });

  if (!cotizacion) return new NextResponse("Not found", { status: 404 });

  const settings = await getCompanyProfile(cotizacion.profileSlot);

  const html = renderPreviewHtml(cotizacion as any, settings as any);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
