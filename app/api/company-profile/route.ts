import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slot = req.nextUrl.searchParams.get("slot") === "2" ? 2 : 1;
  const profile = await prisma.companyProfile.findUnique({ where: { slot } });
  return NextResponse.json(profile); // null si el perfil todavía no fue configurado
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slot: rawSlot, ...data } = body;
  const slot = rawSlot === 2 ? 2 : 1;

  const profile = await prisma.companyProfile.upsert({
    where: { slot },
    update: data,
    create: { slot, ...data },
  });
  return NextResponse.json(profile);
}
