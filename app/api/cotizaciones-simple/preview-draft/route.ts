import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCompanyProfile } from "@/lib/company-profile";
import { renderPreviewSimpleHtml } from "@/lib/render-preview-simple";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const settings = await getCompanyProfile(body.profileSlot);

  const html = renderPreviewSimpleHtml(body, settings as any);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
