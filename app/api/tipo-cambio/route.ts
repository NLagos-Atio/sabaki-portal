import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// APIs gratuitas sin key, en orden de prioridad
const APIS = [
  {
    nombre: "Frankfurter / BCE",
    url: (from: string, to: string) => `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
    parse: (data: any, to: string) => ({ rate: data?.rates?.[to], date: data?.date }),
  },
  {
    nombre: "Open Exchange Rates",
    url: (from: string, to: string) => `https://open.er-api.com/v6/latest/${from}`,
    parse: (data: any, to: string) => ({
      rate: data?.rates?.[to],
      date: data?.time_last_update_utc?.split(" ").slice(0, 4).join(" "),
    }),
  },
  {
    nombre: "ExchangeRate.host",
    url: (from: string, _to: string) => `https://api.exchangerate.host/latest?base=${from}`,
    parse: (data: any, to: string) => ({ rate: data?.rates?.[to], date: data?.date }),
  },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from")?.toUpperCase() || "EUR";
  const to = req.nextUrl.searchParams.get("to")?.toUpperCase() || "USD";

  if (from === to) return NextResponse.json({ rate: 1, date: new Date().toISOString().split("T")[0], fuente: "Misma moneda" });

  for (const api of APIS) {
    try {
      const res = await fetch(api.url(from, to), {
        headers: { "Accept": "application/json" },
        next: { revalidate: 3600 }, // cachear 1 hora
      });

      if (!res.ok) continue;

      const data = await res.json();
      const { rate, date } = api.parse(data, to);

      if (rate && rate > 0) {
        return NextResponse.json({
          rate: Math.round(rate * 100000) / 100000,
          date: date || new Date().toISOString().split("T")[0],
          fuente: api.nombre,
          from,
          to,
        });
      }
    } catch {
      continue; // probar la siguiente API
    }
  }

  return NextResponse.json(
    { error: `No se pudo obtener el tipo de cambio ${from} → ${to}` },
    { status: 503 }
  );
}
