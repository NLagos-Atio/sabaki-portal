import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface SimpleItem {
  descripcion: string;
  notaSecundaria?: string | null;
  cantidad: number;
  precioUsd: number;
  subtotalUsd: number;
}
export interface SimpleCondicion { label: string; valor: string; }
export interface PreviewCotizacionSimple {
  numero: string;
  titulo: string;
  fecha: Date | string;
  moneda: string;
  tipoCambio?: number | null;
  clienteEmpresa: string;
  clienteContacto?: string | null;
  margen: number;
  iva: number;
  mostrarIva: boolean;
  profileSlot?: number;
  items: SimpleItem[];
  condiciones: SimpleCondicion[];
}
export interface SimpleSettings {
  nombre: string;
  direccion: string;
  logoPath?: string | null;
  colorPrimario: string;
  colorSecundario: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderPreviewSimpleHtml(
  cotizacion: PreviewCotizacionSimple,
  settings: SimpleSettings | null,
): string {
  const primary   = settings?.colorPrimario   || "#1B2A4A";
  const secondary = settings?.colorSecundario || "#2E86AB";
  const empresa   = settings?.nombre    || "Empresa";
  const direccion = settings?.direccion || "";
  const moneda    = cotizacion.moneda;
  const tc        = cotizacion.tipoCambio;
  const fechaStr  = format(new Date(cotizacion.fecha), "dd/MM/yyyy", { locale: es });

  const fmtM = (n: number) => moneda === "USD" || !tc
    ? `USD ${fmt(n)}`
    : `USD ${fmt(n)} <span style="color:#888;font-size:0.85em">→ ${moneda} ${fmt(n * tc)}</span>`;

  // Totales
  const subtotal          = cotizacion.items.reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt         = subtotal * (cotizacion.margen / 100);
  const subtotalConMargen = subtotal + margenAmt;
  const ivaAmt            = cotizacion.mostrarIva ? subtotalConMargen * (cotizacion.iva / 100) : 0;
  const total             = subtotalConMargen + ivaAmt;

  const logoHtml = settings?.logoPath
    ? `<img src="${settings.logoPath}" style="height:44px;object-fit:contain" alt="Logo">`
    : `<span style="font-size:18px;font-weight:bold;color:${primary}">${esc(empresa)}</span>`;

  const itemRows = cotizacion.items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f5f7fa"}">
      <td style="padding:7px 10px;border:1px solid #ddd">
        <div>${esc(item.descripcion)}</div>
        ${item.notaSecundaria ? `<div style="font-style:italic;color:#888;font-size:11px;margin-top:2px">${esc(item.notaSecundaria)}</div>` : ""}
      </td>
      <td style="padding:7px 10px;border:1px solid #ddd;text-align:center">
        ${item.cantidad % 1 === 0 ? item.cantidad : item.cantidad.toFixed(2)}
      </td>
      <td style="padding:7px 10px;border:1px solid #ddd;text-align:right">${fmtM(item.precioUsd)}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;text-align:right;font-weight:bold">${fmtM(item.subtotalUsd)}</td>
    </tr>`).join("");

  const totalRows = cotizacion.mostrarIva ? `
    <tr style="background:#eef2f7">
      <td colspan="3" style="padding:6px 10px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#444">SUBTOTAL s/IVA</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#444">${fmtM(subtotalConMargen)}</td>
    </tr>
    <tr>
      <td colspan="3" style="padding:5px 10px;border:1px solid #ddd;text-align:right;color:#666">IVA (${cotizacion.iva}%)</td>
      <td style="padding:5px 10px;border:1px solid #ddd;text-align:right;color:#666">${fmtM(ivaAmt)}</td>
    </tr>
    <tr style="background:${primary};color:#fff;font-weight:bold">
      <td colspan="3" style="padding:8px 10px;border:1px solid ${primary};text-align:right">TOTAL c/IVA</td>
      <td style="padding:8px 10px;border:1px solid ${primary};text-align:right">${fmtM(total)}</td>
    </tr>` : `
    <tr style="background:${primary};color:#fff;font-weight:bold">
      <td colspan="3" style="padding:8px 10px;border:1px solid ${primary};text-align:right">TOTAL</td>
      <td style="padding:8px 10px;border:1px solid ${primary};text-align:right">${fmtM(total)}</td>
    </tr>`;

  const condRows = cotizacion.condiciones.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f5f7fa"}">
      <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;font-weight:bold;color:${secondary};white-space:nowrap;width:140px">${esc(c.label)}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;line-height:1.5">${esc(c.valor)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 28px 36px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex;align-items:flex-start;margin-bottom:18px">
  ${logoHtml}
  <div style="margin-left:12px;font-size:11px;color:#888;padding-top:4px">
    ${esc(empresa)} | ${esc(direccion)} |
  </div>
</div>

<!-- Título banner -->
<div style="background:${primary};color:#fff;font-weight:bold;font-size:16px;text-align:center;text-transform:uppercase;padding:10px 20px;letter-spacing:1px;margin-bottom:18px">
  ${esc(cotizacion.titulo)}
</div>

<!-- Datos del cliente -->
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr>
    <td style="width:50%;padding:0 0 8px 0;vertical-align:top">
      <span style="font-weight:bold;color:${secondary}">Cliente:</span> ${esc(cotizacion.clienteEmpresa)}<br>
      ${cotizacion.clienteContacto ? `<span style="font-weight:bold;color:${secondary}">Contacto:</span> ${esc(cotizacion.clienteContacto)}` : ""}
    </td>
    <td style="width:50%;padding:0 0 8px 16px;vertical-align:top">
      <span style="font-weight:bold;color:${secondary}">Nro. Cotización:</span> ${esc(cotizacion.numero)}<br>
      <span style="font-weight:bold;color:${secondary}">Fecha:</span> ${fechaStr}
    </td>
  </tr>
</table>

<!-- Header sección productos -->
<div style="background:${primary};color:#fff;font-weight:bold;font-size:12px;text-align:center;text-transform:uppercase;padding:6px 12px;margin-bottom:0">
  Detalle de Productos y Precios de Venta
</div>

<!-- Tabla de productos -->
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
  <thead>
    <tr style="background:#3d3d3d;color:#fff">
      <th style="padding:7px 10px;text-align:left;border:1px solid #3d3d3d">Descripcion</th>
      <th style="padding:7px 10px;text-align:center;border:1px solid #3d3d3d;width:60px">Cant.</th>
      <th style="padding:7px 10px;text-align:right;border:1px solid #3d3d3d;width:150px">P. Unit. s/IVA (USD)</th>
      <th style="padding:7px 10px;text-align:right;border:1px solid #3d3d3d;width:150px">Subtotal s/IVA (USD)</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
  <tfoot>${totalRows}</tfoot>
</table>

${cotizacion.condiciones.length > 0 ? `
<!-- Header sección condiciones -->
<div style="background:${primary};color:#fff;font-weight:bold;font-size:12px;text-align:center;text-transform:uppercase;padding:6px 12px;margin-bottom:0">
  Condiciones Comerciales
</div>

<!-- Tabla de condiciones -->
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
  <tbody>${condRows}</tbody>
</table>` : ""}

<!-- Footer -->
<div style="margin-top:28px;padding-top:6px;border-top:1px solid #ccc;font-size:11px;color:#888;text-align:center">
  ${esc(empresa)} | ${esc(direccion)} |
</div>

</body>
</html>`;
}
