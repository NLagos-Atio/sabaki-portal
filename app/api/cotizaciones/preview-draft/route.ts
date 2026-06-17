/**
 * POST /api/cotizaciones/preview-draft
 *
 * Acepta los datos del formulario de cotización (sin guardar en DB)
 * y devuelve el HTML de vista previa comercial — exactamente igual
 * que el preview de cotizaciones guardadas.
 *
 * No guarda nada. No requiere cotización existente.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCompanyProfile } from "@/lib/company-profile";
import { renderPreviewHtml, PreviewCotizacion } from "@/lib/render-preview";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body: PreviewCotizacion = await req.json();

  // Solo necesitamos los settings de empresa (logo, colores, datos) del perfil elegido
  const settings = await getCompanyProfile(body.profileSlot);

  const html = renderPreviewHtml(body, settings as any);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
