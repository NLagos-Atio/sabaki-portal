import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CIFRequestItem {
  idx: number;
  name: string;
  origin: string;
  weightKg: number;
  fobPrice: number;
  quantity: number;
  extraContext?: string;
}

interface ClaudeResult {
  idx: number;
  freightPct: number;
  insurancePct: number;
  aiNote?: string;
}

export interface CIFResponseItem {
  idx: number;
  name: string;
  fobPrice: number;
  freightPct: number;
  insurancePct: number;
  freightUsd: number;
  insuranceUsd: number;
  cifPrice: number;
  aiNote?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { items }: { items: CIFRequestItem[] } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Se requiere al menos un ítem" }, { status: 400 });
  }

  const itemsDesc = items
    .map(
      (it) =>
        `- idx:${it.idx} | "${it.name}" | Origen: ${it.origin} | Peso: ${it.weightKg} kg | FOB: USD ${it.fobPrice.toFixed(2)} | Cant: ${it.quantity}${it.extraContext ? ` | Contexto: ${it.extraContext}` : ""}`
    )
    .join("\n");

  const systemPrompt = `Sos un experto en logística de importación al puerto de Buenos Aires, Argentina.
Para cada ítem, estimá el porcentaje de flete y seguro sobre el precio FOB según el origen, tipo de producto y peso.

Rangos de referencia para freightPct:
- USA / Europa vía aérea: 8–12%
- China vía marítima: 12–18%
- China vía aérea: 18–25%
- Europa vía marítima: 7–10%
- LATAM (región): 4–7%
- Envíos muy pesados (>50 kg) suelen ir marítimo y bajar el %. Envíos pequeños (<5 kg) suelen ir aéreo.

insurancePct: siempre entre 0.5% y 1.0% sobre FOB.

Respondé ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin comentarios:
{
  "results": [
    { "idx": <número>, "freightPct": <número>, "insurancePct": <número>, "aiNote": "<texto breve opcional en español>" }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Calculá CIF para estos ítems importados a Buenos Aires:\n\n${itemsDesc}`,
        },
      ],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("")
      .trim();

    // Extraer JSON limpio (puede venir con ```json ... ```)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("La IA no devolvió JSON válido");

    const parsed: { results: ClaudeResult[] } = JSON.parse(jsonMatch[0]);

    const results: CIFResponseItem[] = parsed.results.map((r) => {
      const item = items.find((i) => i.idx === r.idx)!;
      const freightPct   = Math.min(Math.max(r.freightPct, 0), 50);
      const insurancePct = Math.min(Math.max(r.insurancePct, 0), 5);
      const fob          = item.fobPrice;
      const freightUsd   = parseFloat((fob * freightPct / 100).toFixed(2));
      const insuranceUsd = parseFloat(((fob + freightUsd) * insurancePct / 100).toFixed(2));
      const cifPrice     = parseFloat((fob + freightUsd + insuranceUsd).toFixed(2));
      return {
        idx: r.idx,
        name: item.name,
        fobPrice: parseFloat(fob.toFixed(2)),
        freightPct,
        insurancePct,
        freightUsd,
        insuranceUsd,
        cifPrice,
        aiNote: r.aiNote,
      };
    });

    return NextResponse.json({ results });
  } catch (e: any) {
    console.error("[CIF Calculator] Error:", e?.message);
    return NextResponse.json({ error: "Error al calcular CIF. Intentá de nuevo." }, { status: 500 });
  }
}
