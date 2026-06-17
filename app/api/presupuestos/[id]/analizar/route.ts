import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { join } from "path";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Analizá este presupuesto/cotización de proveedor y extraé la información en formato JSON estrictamente válido.

Devolvé ÚNICAMENTE el JSON, sin texto adicional, sin markdown, sin bloques de código.

Estructura exacta requerida:
{
  "numeroQuote": "string o null",
  "fechaDoc": "YYYY-MM-DD o null",
  "validezOferta": "YYYY-MM-DD o null",
  "moneda": "EUR / USD / etc o null",
  "incoterm": "string completo o null",
  "condPago": "string descriptivo o null",
  "impuestos": "descripción o null (ej: tax-free Export, IVA 21%, etc)",
  "descuentos": "descripción o null",
  "subtotal": número o null,
  "totalFinal": número o null,
  "cargos": [
    { "nombre": "string", "monto": número, "porcentaje": número o null }
  ],
  "items": [
    {
      "item": número,
      "codigoParte": "string o null",
      "descripcion": "string",
      "cantidad": número,
      "precioUnitario": número,
      "total": número,
      "notas": "string o null"
    }
  ]
}

Reglas:
- Los números deben ser valores numéricos, no strings (ej: 367.65, no "367,65")
- Las comas decimales europeas (367,65) convertirlas a punto (367.65)
- Los puntos de miles europeos (3.556,35) eliminarlos (3556.35)
- Si un campo no existe en el documento, usar null
- cargos incluye: flete, seguro, embalaje, y cualquier cargo adicional
- No incluyas los ítems en cargos, solo los cargos extra`;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const presupuesto = await prisma.presupuestoProveedor.findUnique({ where: { id } });
  if (!presupuesto) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    logger.info("analizar", `Iniciando análisis IA: ${presupuesto.nombreArchivo}`);
    const t0 = Date.now();
    // Leer el PDF del disco
    const filePath = join(process.cwd(), "public", presupuesto.rutaArchivo.replace("/uploads/", "uploads/"));
    const fileBuffer = await readFile(filePath);
    const base64 = fileBuffer.toString("base64");

    // Llamar a Claude con el PDF
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parsear JSON de la respuesta
    let parsed: any = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      return NextResponse.json(
        { error: "Claude no devolvió un JSON válido. Intentá de nuevo.", raw: rawText },
        { status: 422 }
      );
    }

    // Actualizar en la DB
    const updated = await prisma.presupuestoProveedor.update({
      where: { id },
      data: {
        numeroQuote: parsed.numeroQuote ?? null,
        fechaDoc: parsed.fechaDoc ? new Date(parsed.fechaDoc) : null,
        validezOferta: parsed.validezOferta ? new Date(parsed.validezOferta) : null,
        moneda: parsed.moneda ?? null,
        incoterm: parsed.incoterm ?? null,
        condPago: parsed.condPago ?? null,
        impuestos: parsed.impuestos ?? null,
        descuentos: parsed.descuentos ?? null,
        subtotal: parsed.subtotal ?? null,
        totalFinal: parsed.totalFinal ?? null,
        cargosJson: JSON.stringify(parsed.cargos ?? []),
        itemsJson: JSON.stringify(parsed.items ?? []),
        analisisRaw: rawText,
        procesado: true,
      },
    });

    logger.info("analizar", `Análisis completado: ${presupuesto.nombreArchivo} en ${Date.now() - t0}ms`);
    return NextResponse.json(updated);
  } catch (e: any) {
    logger.error("analizar", `Error analizando ${presupuesto.nombreArchivo}`, e);
    return NextResponse.json(
      { error: `Error al analizar: ${e?.message || "Error desconocido"}` },
      { status: 500 }
    );
  }
}
