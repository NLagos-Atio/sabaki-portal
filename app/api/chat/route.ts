import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_MESSAGE_CHARS = 400;
const MAX_HISTORY_MESSAGES = 8; // 4 rondas
const MAX_TOKENS_RESPONSE = 600;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { message, history = [] }: { message: string; history: ChatMessage[] } = body;

  // ── Validaciones de entrada ────────────────────────────────────────
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Mensaje demasiado largo (máx ${MAX_MESSAGE_CHARS} caracteres)` }, { status: 400 });
  }

  // Limitar historial
  const safeHistory = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_MESSAGES).filter(
        (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
    : [];

  // ── Contexto de la BD (en paralelo) ──────────────────────────────────
  const [productos, propuestas, cotSimples, settings] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      select: { nombre: true, categoria: true, precioUsd: true, numeroParte: true, fabricante: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.cotizacion.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        numero: true,
        clienteEmpresa: true,
        totalOnetimeUsd: true,
        totalRecurrenteUsd: true,
        estado: true,
        fecha: true,
      },
    }),
    prisma.cotizacionSimple.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        numero: true,
        titulo: true,
        clienteEmpresa: true,
        total: true,
        estado: true,
        fecha: true,
      },
    }),
    getCompanyProfile(1),
  ]);

  const empresa = settings?.nombre || "Sabaki Technologies";

  // ── Construir contexto condensado ─────────────────────────────────────
  const productosCtx = productos.length > 0
    ? productos.map((p) => {
        const np = p.numeroParte ? ` [${p.numeroParte}]` : "";
        const fab = p.fabricante ? ` (${p.fabricante})` : "";
        return `• ${p.nombre}${np}${fab} — ${p.categoria} — USD ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(p.precioUsd)}`;
      }).join("\n")
    : "Sin productos cargados.";

  const propuestasCtx = propuestas.length > 0
    ? propuestas.map((c) => {
        const fecha = format(new Date(c.fecha), "dd/MM/yyyy", { locale: es });
        const recStr = c.totalRecurrenteUsd > 0 ? ` + USD ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(c.totalRecurrenteUsd)}/mes` : "";
        return `• ${c.numero} | ${c.clienteEmpresa} | USD ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(c.totalOnetimeUsd)}${recStr} | ${c.estado} | ${fecha}`;
      }).join("\n")
    : "Sin propuestas técnicas.";

  const simplesCtx = cotSimples.length > 0
    ? cotSimples.map((c) => {
        const fecha = format(new Date(c.fecha), "dd/MM/yyyy", { locale: es });
        return `• ${c.numero} | ${c.clienteEmpresa} | ${c.titulo} | USD ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(c.total)} | ${c.estado} | ${fecha}`;
      }).join("\n")
    : "Sin cotizaciones simples.";

  // ── System prompt ─────────────────────────────────────────────────────
  const systemPrompt = `Sos el asistente de cotizaciones de ${empresa}.
Respondés ÚNICAMENTE preguntas relacionadas con:
- Productos del catálogo y sus precios
- Cotizaciones y propuestas existentes (estado, totales, clientes, fechas)
- Cómo crear o estructurar cotizaciones
- Cálculos de margen de ganancia, IVA y totales
- Condiciones comerciales estándar
- Diferencias entre "Propuesta Técnico-Comercial" y "Cotización Simple"

Si el usuario pregunta algo fuera de estos temas, respondé en una línea que solo podés ayudar con temas del portal de cotizaciones.
Respondé SIEMPRE en español. Sé conciso y directo. No uses markdown complejo.

=== CATÁLOGO DE PRODUCTOS (${productos.length} activos) ===
${productosCtx}

=== PROPUESTAS TÉCNICAS RECIENTES ===
${propuestasCtx}

=== COTIZACIONES SIMPLES RECIENTES ===
${simplesCtx}`;

  // ── Llamada a Claude Haiku ────────────────────────────────────────────
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: MAX_TOKENS_RESPONSE,
      system: systemPrompt,
      messages: [
        ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message.trim() },
      ],
    });

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("");

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("[Chat API] Error llamando a Claude:", e?.message);
    return NextResponse.json(
      { error: "Error al procesar tu consulta. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
