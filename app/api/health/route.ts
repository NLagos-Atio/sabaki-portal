import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const START_TIME = Date.now();

function uptime() {
  const s = Math.floor((Date.now() - START_TIME) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: Record<string, string> = {};

  // Verificar base de datos
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch (e: any) {
    checks.database = `error: ${e?.message || "unknown"}`;
  }

  // Verificar que los modelos principales respondan
  try {
    const [users, cotizaciones] = await Promise.all([
      prisma.user.count(),
      prisma.cotizacion.count(),
    ]);
    checks.models = `ok (users:${users}, cotizaciones:${cotizaciones})`;
  } catch (e: any) {
    checks.models = `error: ${e?.message || "unknown"}`;
  }

  // Estado de memoria
  const mem = process.memoryUsage();
  const memInfo = {
    heapUsedMB:  Math.round(mem.heapUsed  / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB:       Math.round(mem.rss       / 1024 / 1024),
    externalMB:  Math.round(mem.external  / 1024 / 1024),
  };

  const healthy = checks.database === "connected";

  return NextResponse.json(
    {
      status:    healthy ? "healthy" : "degraded",
      timestamp,
      uptime:    uptime(),
      version:   process.env.npm_package_version || "0.1.0",
      node:      process.version,
      env:       process.env.NODE_ENV || "development",
      ...checks,
      memory:    memInfo,
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    }
  );
}
