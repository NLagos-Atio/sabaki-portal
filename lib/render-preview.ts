/**
 * Motor de renderizado de vista previa comercial.
 * Usado por:
 *   - GET  /api/cotizaciones/[id]/preview   (cotización guardada)
 *   - POST /api/cotizaciones/preview-draft  (borrador en formulario, sin guardar)
 *
 * NUNCA incluye: costos, márgenes, rentabilidad ni información interna.
 */
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface PreviewItem {
  descripcion: string;
  cantidad: number;
  precioUsd: number;
  subtotalUsd: number;
  tipo: string;
}
export interface PreviewTasa {
  nombre: string;
  porcentaje: number;
}
export interface PreviewCotizacion {
  numero: string;
  fecha: Date | string;
  validezDias: number;
  moneda: string;
  tipoCambio?: number | null;
  clienteEmpresa: string;
  clienteCuit?: string | null;
  clienteContacto?: string | null;
  clienteCargo?: string | null;
  clienteTelefono?: string | null;
  contactoNombre?: string | null;
  contactoCargo?: string | null;
  alcance?: string | null;
  alcanceProyecto?: string | null;
  introduccion?: string | null;
  sitios?: string | null;
  condiciones?: string | null;
  margen: number;
  iva: number;
  mostrarIva?: boolean;
  profileSlot?: number;
  items: PreviewItem[];
  tasas: PreviewTasa[];
}
export interface PreviewSettings {
  nombre: string;
  cuit: string;
  condicionIva: string;
  direccion: string;
  contactoNombre: string;
  contactoCargo: string;
  logoPath?: string | null;
  colorPrimario: string;
  colorSecundario: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtMoney(n: number, moneda: string, tc?: number | null) {
  if (moneda === "USD" || !tc) return `USD ${fmt(n)}`;
  return `USD ${fmt(n)} <span style="color:#888;font-size:0.85em">→ ${moneda} ${fmt(n * tc)}</span>`;
}
function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function richHtml(text: string): string {
  return text.split("\n").map(line => {
    const isBullet = /^[\s]*[•\-▸►*]\s/.test(line);
    const clean = esc(line.replace(/^[\s]*[•\-▸►*]\s*/, "").trim());
    if (!clean) return "<p style='margin:4px 0'>&nbsp;</p>";
    if (isBullet) return `<p style='margin:3px 0 3px 16px'>▸ ${clean}</p>`;
    return `<p style='margin:4px 0'>${clean}</p>`;
  }).join("");
}

// ── Renderizador principal ────────────────────────────────────────────────────
export function renderPreviewHtml(
  cotizacion: PreviewCotizacion,
  settings: PreviewSettings | null,
): string {
  const primary   = settings?.colorPrimario   || "#1B2A4A";
  const secondary = settings?.colorSecundario || "#2E86AB";
  const empresa   = settings?.nombre     || "Empresa";
  const cuit      = settings?.cuit       || "";
  const iva       = settings?.condicionIva || "";
  const moneda    = cotizacion.moneda;
  const tc        = cotizacion.tipoCambio;
  const fechaStr  = format(new Date(cotizacion.fecha), "dd/MM/yyyy", { locale: es });

  const onetimeItems = cotizacion.items.filter(i => i.tipo === "onetime");
  const recItems     = cotizacion.items.filter(i => i.tipo === "recurrente");
  const envioItems   = cotizacion.items.filter(i => i.tipo === "envio");

  const subtotalOnetime   = onetimeItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalRec       = recItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalEnvio     = envioItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt         = (subtotalOnetime + subtotalEnvio) * (cotizacion.margen / 100);
  const subtotalConMargen = subtotalOnetime + subtotalEnvio + margenAmt;
  const showIva           = cotizacion.mostrarIva !== false;
  const ivaAmt            = showIva ? subtotalConMargen * (cotizacion.iva / 100) : 0;
  const tasasTotal        = cotizacion.tasas.reduce((s, t) => s + subtotalConMargen * (t.porcentaje / 100), 0);
  const totalFinal        = subtotalConMargen + ivaAmt + tasasTotal;

  function itemsTableHtml(items: PreviewItem[], totalLabel: string) {
    if (!items.length) return "";
    const rows = items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f5f8ff"}">
        <td style="padding:6px 10px;border:1px solid #ddd">${esc(item.descripcion)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${item.cantidad % 1 === 0 ? item.cantidad : item.cantidad.toFixed(2)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${fmtMoney(item.precioUsd, moneda, tc)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${fmtMoney(item.subtotalUsd, moneda, tc)}</td>
      </tr>`).join("");
    const total = items.reduce((s, i) => s + i.subtotalUsd, 0);
    return `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
        <thead>
          <tr style="background:${secondary};color:#fff">
            <th style="padding:7px 10px;text-align:left;border:1px solid ${secondary}">Detalle</th>
            <th style="padding:7px 10px;text-align:right;border:1px solid ${secondary}">Cant.</th>
            <th style="padding:7px 10px;text-align:right;border:1px solid ${secondary}">Precio x uni.</th>
            <th style="padding:7px 10px;text-align:right;border:1px solid ${secondary}">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:${primary};color:#fff;font-weight:bold">
            <td colspan="3" style="padding:8px 10px;text-align:right;border:1px solid ${primary}">${totalLabel}</td>
            <td style="padding:8px 10px;text-align:right;border:1px solid ${primary}">${fmtMoney(total, moneda, tc)}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  function sectionHeader(text: string) {
    return `<div style="background:${primary};color:#fff;font-weight:bold;font-size:13px;padding:6px 12px;margin:20px 0 8px 0;border-radius:2px">${esc(text)}</div>`;
  }

  const logoHtml = settings?.logoPath
    ? `<img src="${settings.logoPath}" style="height:40px;object-fit:contain" alt="Logo">`
    : `<span style="font-size:18px;font-weight:bold;color:${primary}">${esc(empresa)}</span>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 24px 32px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid ${primary};margin-bottom:16px">
  ${logoHtml}
  <div style="text-align:right;font-size:12px;color:#555">
    <div>${esc(settings?.direccion || "")}</div>
    <div>CUIT: ${esc(cuit)} | ${esc(iva)}</div>
  </div>
</div>

<div style="margin-bottom:16px">
  <div style="font-size:22px;font-weight:bold;color:${primary};text-transform:uppercase">Propuesta Técnico-Comercial</div>
  <div style="font-size:14px;color:${secondary};margin-top:4px">N° ${esc(cotizacion.numero)}</div>
</div>

<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
  <thead>
    <tr style="background:${primary};color:#fff">
      <th style="padding:6px 10px;text-align:left;border:1px solid ${primary}">PROVEEDOR</th>
      <th style="padding:6px 10px;text-align:left;border:1px solid ${primary}">CLIENTE</th>
      <th style="padding:6px 10px;text-align:left;border:1px solid ${primary}">DETALLES</th>
    </tr>
  </thead>
  <tbody>
    <tr style="vertical-align:top">
      <td style="padding:8px 10px;border:1px solid #ccc">
        <b>${esc(empresa)}</b><br>CUIT: ${esc(cuit)}<br>${esc(iva)}<br>${esc(cotizacion.contactoNombre || settings?.contactoNombre || "")}<br><span style="color:#666">${esc(cotizacion.contactoCargo || settings?.contactoCargo || "")}</span>
      </td>
      <td style="padding:8px 10px;border:1px solid #ccc">
        <b>${esc(cotizacion.clienteEmpresa || "(sin empresa)")}</b>
        ${cotizacion.clienteCuit      ? `<br>${esc(cotizacion.clienteCuit)}`      : ""}
        ${cotizacion.clienteContacto  ? `<br>${esc(cotizacion.clienteContacto)}`  : ""}
        ${cotizacion.clienteCargo     ? `<br><span style="color:#666">${esc(cotizacion.clienteCargo)}</span>` : ""}
        ${cotizacion.clienteTelefono  ? `<br>${esc(cotizacion.clienteTelefono)}`  : ""}
      </td>
      <td style="padding:8px 10px;border:1px solid #ccc">
        Propuesta N°: <b>${esc(cotizacion.numero)}</b><br>
        Fecha: <b>${fechaStr}</b><br>
        Validez: <b>${cotizacion.validezDias} días</b><br>
        Moneda: <b>${esc(moneda)}${tc ? ` (TC: ${fmt(tc)})` : ""}</b>
        ${cotizacion.alcance ? `<br>Alcance: <b>${esc(cotizacion.alcance)}</b>` : ""}
      </td>
    </tr>
  </tbody>
</table>

${cotizacion.introduccion ? `${sectionHeader("1. INTRODUCCIÓN")}<div style="font-size:13px;line-height:1.5;color:#333">${richHtml(cotizacion.introduccion)}</div>` : ""}
${cotizacion.alcanceProyecto ? `${sectionHeader("2. ALCANCE DE LA SOLUCIÓN")}<div style="font-size:13px;line-height:1.5;color:#333">${richHtml(cotizacion.alcanceProyecto)}</div>` : ""}
${cotizacion.sitios ? `${sectionHeader("3. SITIOS COMPRENDIDOS")}<div style="font-size:13px;line-height:1.5;color:#333">${richHtml(cotizacion.sitios)}</div>` : ""}

${onetimeItems.length > 0 ? `${sectionHeader("4. INVERSIÓN — COSTOS DE ÚNICA VEZ (ONE-TIME FEE)")}<p style="font-size:12px;color:#555;margin-bottom:6px">Corresponde a un pago único.</p>${itemsTableHtml(onetimeItems, "TOTAL ÚNICA VEZ")}` : ""}
${recItems.length > 0 ? `${sectionHeader("5. INVERSIÓN — SERVICIOS RECURRENTES (MENSUAL)")}<p style="font-size:12px;color:#555;margin-bottom:6px">Corresponde a facturación mensual.</p>${itemsTableHtml(recItems, "TOTAL MENSUAL")}` : ""}
${envioItems.length > 0 ? `${sectionHeader("6. ENVÍO (SHIPPING)")}${itemsTableHtml(envioItems, "TOTAL ENVÍO")}` : ""}

<div style="margin-top:20px;border:1px solid ${primary};border-radius:4px;padding:12px 16px;background:#f8faff">
  <div style="font-weight:bold;font-size:13px;color:${primary};margin-bottom:8px">Resumen de la inversión</div>
  <table style="width:100%;font-size:13px">
    <tr><td>Subtotal One-Time:</td><td style="text-align:right">${fmtMoney(subtotalOnetime, moneda, tc)}</td></tr>
    ${subtotalEnvio > 0 ? `<tr><td>Subtotal Envío:</td><td style="text-align:right">${fmtMoney(subtotalEnvio, moneda, tc)}</td></tr>` : ""}
    ${cotizacion.tasas.map(t => `<tr><td>${esc(t.nombre)} (${t.porcentaje}%):</td><td style="text-align:right">${fmtMoney(subtotalConMargen * (t.porcentaje / 100), moneda, tc)}</td></tr>`).join("")}
    ${showIva ? `<tr><td>IVA (${cotizacion.iva}%):</td><td style="text-align:right">${fmtMoney(ivaAmt, moneda, tc)}</td></tr>` : ""}
    <tr style="border-top:2px solid ${primary};font-weight:bold;font-size:14px;color:${primary}">
      <td style="padding-top:8px">${showIva ? "TOTAL INVERSIÓN ÚNICA c/IVA:" : "TOTAL INVERSIÓN ÚNICA s/IVA:"}</td>
      <td style="padding-top:8px;text-align:right">${fmtMoney(totalFinal, moneda, tc)}</td>
    </tr>
    ${subtotalRec > 0 ? `<tr style="font-weight:bold;color:${secondary}"><td>TOTAL MENSUAL RECURRENTE:</td><td style="text-align:right">${fmtMoney(subtotalRec, moneda, tc)}/mes</td></tr>` : ""}
  </table>
</div>

${cotizacion.condiciones ? `${sectionHeader("CONDICIONES COMERCIALES")}<div style="font-size:13px;line-height:1.6;color:#333">${richHtml(cotizacion.condiciones)}</div>` : ""}

<div style="margin-top:32px;padding-top:8px;border-top:1px solid #ccc;font-size:11px;color:#888;text-align:center">
  ${esc(empresa)} | CUIT: ${esc(cuit)} | ${esc(iva)}
</div>

</body>
</html>`;
}
