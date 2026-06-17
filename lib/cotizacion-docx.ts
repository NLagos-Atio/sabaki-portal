import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, HeadingLevel, LevelFormat, ImageRun,
  TabStopType, TabStopPosition, TableLayoutType,
} from "docx";

// A4 (11906) con márgenes 1000 izq + 1000 der = 9906 DXA de contenido útil
const CW = 9906;
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { readFileSync } from "fs";
import { join } from "path";

// - Types -
interface Item { descripcion: string; cantidad: number; precioUsd: number; subtotalUsd: number; tipo: string; }
interface Tasa { nombre: string; porcentaje: number; }
interface Cotizacion {
  numero: string; fecha: Date | string; validezDias: number; moneda: string; tipoCambio?: number | null;
  clienteEmpresa: string; clienteCuit?: string | null; clienteContacto?: string | null;
  clienteCargo?: string | null; clienteTelefono?: string | null;
  contactoNombre?: string | null; contactoCargo?: string | null;
  alcance?: string | null; alcanceProyecto?: string | null; introduccion?: string | null;
  sitios?: string | null; condiciones?: string | null;
  margen: number; iva: number; mostrarIva?: boolean; items: Item[]; tasas: Tasa[];
}
interface SettingsData {
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
type Settings = SettingsData | null;

// - Helpers -
function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtMoney(n: number, moneda: string, tc?: number | null) {
  if (moneda === "USD" || !tc) return `USD ${fmt(n)}`;
  return `USD ${fmt(n)} -> ${moneda} ${fmt(n * tc)}`;
}

// Color helpers — docx uses hex without #
const PRIMARY   = (s: Settings) => (s?.colorPrimario  || "#1B2A4A").replace("#", "");
const SECONDARY = (s: Settings) => (s?.colorSecundario || "#2E86AB").replace("#", "");

const border1 = (color: string) => ({ style: BorderStyle.SINGLE, size: 4, color });
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

// - Reusable builders -
function boldRun(text: string, size = 20, color?: string) {
  return new TextRun({ text, bold: true, size, font: "Arial", ...(color ? { color } : {}) });
}
function normalRun(text: string, size = 18, color?: string) {
  return new TextRun({ text, size, font: "Arial", ...(color ? { color } : {}) });
}
function emptyPara(spacingAfter = 80) {
  return new Paragraph({ children: [new TextRun("")], spacing: { after: spacingAfter } });
}

/** Section heading bar (dark navy background, white bold text) */
function sectionHeader(text: string, primary: string) {
  return new Paragraph({
    children: [boldRun(text, 20, "FFFFFF")],
    shading: { fill: primary, type: ShadingType.CLEAR },
    spacing: { before: 160, after: 80 },
    indent: { left: 120, right: 120 },
  });
}

/** Bullet/paragraph line from free text */
function richLine(line: string, secondary: string): Paragraph {
  const isBullet = /^[\s]*[•\-▸►*]\s/.test(line) || /^[\s]*\d+[\.\)]\s/.test(line);
  const clean = line.replace(/^[\s]*[•\-▸►*]\s*/, "").replace(/^[\s]*\d+[\.\)]\s*/, "").trim();
  if (!clean) return emptyPara(40);
  if (isBullet) {
    return new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      children: [normalRun(clean, 18)],
      spacing: { after: 40 },
    });
  }
  return new Paragraph({ children: [normalRun(clean, 18)], spacing: { after: 60 } });
}

/** Convert a multi-line text block into rich paragraphs */
function richBlock(text: string, secondary: string): Paragraph[] {
  return text.split("\n").map(line => richLine(line, secondary));
}

/** Info table cell (no shading) */
function infoCell(lines: { label: string; value: string }[], primary: string, width: number, isLast = false) {
  const borderColor = "CCCCCC";
  const rightBorder = isLast ? noBorder : border1(borderColor);
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: border1(borderColor), bottom: border1(borderColor), left: noBorder, right: rightBorder },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: lines.map(({ label, value }) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${label} `, size: 16, font: "Arial", color: "666666" }),
          new TextRun({ text: value, size: 16, font: "Arial", bold: true }),
        ],
        spacing: { after: 30 },
      })
    ),
  });
}

/** Item table row */
function itemRow(desc: string, qty: number, price: number, subtotal: number, moneda: string, tc: number | null | undefined, alt: boolean, primary: string) {
  const fill = alt ? "F5F8FF" : "FFFFFF";
  const bc = "DDDDDD";
  const borders = { top: border1(bc), bottom: border1(bc), left: border1(bc), right: border1(bc) };
  const cell = (text: string, w: number, align: string = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders,
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ alignment: align as any, children: [normalRun(text, 17)] })],
    });
  return new TableRow({ children: [
    cell(desc, 4445),
    cell(String(qty % 1 === 0 ? qty : qty.toFixed(2)), 953, AlignmentType.RIGHT),
    cell(fmtMoney(price, moneda, tc), 2222, AlignmentType.RIGHT),
    cell(fmtMoney(subtotal, moneda, tc), 2286, AlignmentType.RIGHT),
  ]});
}

/** Total row (dark bg) — label spans cols 1+2+3, value aligns with Subtotal col */
function totalRow(label: string, value: string, primary: string) {
  const borders = { top: border1(primary), bottom: border1(primary), left: border1(primary), right: border1(primary) };
  const makeCell = (text: string, w: number, align: string = AlignmentType.LEFT, span = 1) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      columnSpan: span,
      borders, shading: { fill: primary, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ alignment: align as any, children: [boldRun(text, 18, "FFFFFF")] })],
    });
  return new TableRow({ children: [
    makeCell(label, 4445 + 953 + 2222, AlignmentType.RIGHT, 3), // spans Detalle + Cant. + Precio
    makeCell(value, 2286, AlignmentType.RIGHT, 1),              // alineado con Subtotal
  ]});
}

/** Build an items table (One-Time / Recurrente / Envío) */
function itemsTable(items: Item[], moneda: string, tc: number | null | undefined, totalLabel: string, primary: string, secondary: string): Table {
  const headerBorders = { top: border1(secondary), bottom: border1(secondary), left: border1(secondary), right: border1(secondary) };
  const headerCell = (text: string, w: number, align: string = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: headerBorders,
      shading: { fill: secondary, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ alignment: align as any, children: [boldRun(text, 17, "FFFFFF")] })],
    });

  const total = items.reduce((s, i) => s + i.subtotalUsd, 0);
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [4445, 953, 2222, 2286],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [
        headerCell("Detalle", 4445),
        headerCell("Cant.", 953, AlignmentType.RIGHT),
        headerCell("Precio x uni.", 2222, AlignmentType.RIGHT),
        headerCell("Subtotal", 2286, AlignmentType.RIGHT),
      ]}),
      ...items.map((item, i) => itemRow(item.descripcion, item.cantidad, item.precioUsd, item.subtotalUsd, moneda, tc, i % 2 !== 0, primary)),
      totalRow(totalLabel, fmtMoney(total, moneda, tc), primary),
    ],
  });
}

// - Main export -
export async function generateCotizacionDocx(cotizacion: Cotizacion, settings: Settings): Promise<Buffer> {
  const primary   = PRIMARY(settings);
  const secondary = SECONDARY(settings);
  const empresa   = settings?.nombre || "Empresa";
  const cuit      = settings?.cuit || "";
  const iva       = settings?.condicionIva || "";
  const moneda    = cotizacion.moneda;
  const tc        = cotizacion.tipoCambio;

  const fechaStr = format(new Date(cotizacion.fecha), "dd/MM/yyyy", { locale: es });

  const onetimeItems  = cotizacion.items.filter(i => i.tipo === "onetime");
  const recItems      = cotizacion.items.filter(i => i.tipo === "recurrente");
  const envioItems    = cotizacion.items.filter(i => i.tipo === "envio");

  const subtotalOnetime = onetimeItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalRec     = recItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalEnvio   = envioItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt       = (subtotalOnetime + subtotalEnvio) * (cotizacion.margen / 100);
  const subtotalConMargen = subtotalOnetime + subtotalEnvio + margenAmt;
  const showIva         = cotizacion.mostrarIva !== false;
  const ivaAmt          = showIva ? subtotalConMargen * (cotizacion.iva / 100) : 0;
  const tasasTotal      = cotizacion.tasas.reduce((s, t) => s + subtotalConMargen * (t.porcentaje / 100), 0);
  const totalFinal      = subtotalConMargen + ivaAmt + tasasTotal;

  // - Logo -
  let logoRun: ImageRun | null = null;
  if (settings?.logoPath) {
    try {
      const filename = settings.logoPath.split("/").pop()!;
      const logoPath = join(process.cwd(), "public", "uploads", filename);
      const logoData = readFileSync(logoPath);
      const ext = settings.logoPath.split(".").pop()?.toLowerCase() || "png";
      logoRun = new ImageRun({
        type: ext as any,
        data: logoData,
        transformation: { width: 100, height: 50 },
        altText: { title: "Logo", description: "Logo empresa", name: "Logo" },
      });
    } catch (e) {
      console.error("[CotizacionDocx] Error al cargar logo:", settings?.logoPath, e);
      logoRun = null;
    }
  }

  // - Header paragraph -
  const headerChildren: any[] = [];
  if (logoRun) headerChildren.push(logoRun);
  const headerPara = new Paragraph({
    children: headerChildren.length > 0
      ? [logoRun!, new TextRun({ text: `\t${settings?.direccion || ""}`, size: 16, font: "Arial", color: "555555" })]
      : [new TextRun({ text: settings?.direccion || "", size: 16, font: "Arial", color: "555555" })],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primary, space: 1 } },
    spacing: { after: 160 },
  });

  // - Title -
  const titleBlock = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [boldRun("PROPUESTA TÉCNICO-COMERCIAL", 36, primary)],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [normalRun(`Propuesta N° ${cotizacion.numero}`, 22, secondary)],
      spacing: { after: 160 },
    }),
  ];

  // - Info table (3 cols: Proveedor | Cliente | Detalles) -
  const bcInfo = "CCCCCC";
  const infoCellHeader = (text: string, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: { fill: primary, type: ShadingType.CLEAR },
      borders: { top: border1(primary), bottom: border1(primary), left: border1(primary), right: border1("FFFFFF") },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [boldRun(text.toUpperCase(), 17, "FFFFFF")] })],
    });

  const proveedorLines = [
    { label: "Empresa:", value: empresa },
    { label: "CUIT:", value: cuit },
    { label: "IVA:", value: iva },
    { label: "Contacto:", value: cotizacion.contactoNombre || settings?.contactoNombre || "" },
    { label: "Cargo:", value: cotizacion.contactoCargo || settings?.contactoCargo || "" },
  ];
  const clienteLines = [
    { label: "Empresa:", value: cotizacion.clienteEmpresa },
    ...(cotizacion.clienteCuit      ? [{ label: "CUIT:",     value: cotizacion.clienteCuit }]     : []),
    ...(cotizacion.clienteContacto  ? [{ label: "Contacto:", value: cotizacion.clienteContacto }] : []),
    ...(cotizacion.clienteCargo     ? [{ label: "Cargo:",    value: cotizacion.clienteCargo }]    : []),
    ...(cotizacion.clienteTelefono  ? [{ label: "Tel.:",     value: cotizacion.clienteTelefono }] : []),
  ];
  const detallesLines = [
    { label: "Propuesta N°:", value: cotizacion.numero },
    { label: "Fecha:", value: fechaStr },
    { label: "Validez:", value: `${cotizacion.validezDias} días` },
    { label: "Moneda:", value: tc ? `${moneda} (TC: ${fmt(tc)})` : moneda },
    ...(cotizacion.alcance ? [{ label: "Alcance:", value: cotizacion.alcance }] : []),
  ];

  // Info table column widths scaled to CW=9906 (proportional from 3150:3310:2900)
  const IC1 = 3334, IC2 = 3503, IC3 = 3069; // sum = 9906

  const infoTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [IC1, IC2, IC3],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [
        infoCellHeader("Proveedor", IC1),
        infoCellHeader("Cliente", IC2),
        infoCellHeader("Detalles", IC3),
      ]}),
      new TableRow({ children: [
        infoCell(proveedorLines, primary, IC1, false),
        infoCell(clienteLines, primary, IC2, false),
        infoCell(detallesLines, primary, IC3, true),
      ]}),
    ],
  });

  // - Body sections -
  const sections: Paragraph[] = [];

  // 1. Introducción
  if (cotizacion.introduccion) {
    sections.push(sectionHeader("1. INTRODUCCIÓN", primary));
    sections.push(...richBlock(cotizacion.introduccion, secondary));
  }

  // 2. Alcance del Proyecto
  if (cotizacion.alcanceProyecto) {
    sections.push(sectionHeader("2. ALCANCE DE LA SOLUCIÓN", primary));
    sections.push(...richBlock(cotizacion.alcanceProyecto, secondary));
  }

  // 3. Sitios
  if (cotizacion.sitios) {
    sections.push(sectionHeader("3. SITIOS COMPRENDIDOS", primary));
    sections.push(...richBlock(cotizacion.sitios, secondary));
  }

  // - Item tables -
  const tables: (Table | Paragraph)[] = [];

  if (onetimeItems.length > 0) {
    tables.push(
      emptyPara(80),
      sectionHeader("4. INVERSIÓN — COSTOS DE ÚNICA VEZ (ONE-TIME FEE)", primary),
      new Paragraph({ children: [normalRun("Corresponde a un pago único.", 17, "444444")], spacing: { after: 80 } }),
      itemsTable(onetimeItems, moneda, tc, "TOTAL ÚNICA VEZ", primary, secondary),
    );
  }

  if (recItems.length > 0) {
    tables.push(
      emptyPara(80),
      sectionHeader("5. INVERSIÓN — SERVICIOS RECURRENTES (MENSUAL)", primary),
      new Paragraph({ children: [normalRun("Corresponde a facturación mensual.", 17, "444444")], spacing: { after: 80 } }),
      itemsTable(recItems, moneda, tc, "TOTAL MENSUAL", primary, secondary),
    );
  }

  if (envioItems.length > 0) {
    tables.push(
      emptyPara(80),
      sectionHeader("6. ENVÍO (SHIPPING)", primary),
      itemsTable(envioItems, moneda, tc, "TOTAL ENVÍO", primary, secondary),
    );
  }

  // - Summary box -
  const summaryRows: TableRow[] = [];
  const summaryCell = (text: string, w: number, align: string = AlignmentType.LEFT, bold = false, color = "222222") =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
      margins: { top: 50, bottom: 50, left: 120, right: 120 },
      children: [new Paragraph({ alignment: align as any, children: [
        bold ? boldRun(text, 18, color) : normalRun(text, 18, color)
      ]})],
    });

  // Summary columns scaled to CW=9906: 6480:2880 ratio → 6858:3048
  const SC1 = 6858, SC2 = 3048; // sum = 9906

  const addSumRow = (label: string, value: string, bold = false, color = "222222") =>
    summaryRows.push(new TableRow({ children: [
      summaryCell(label, SC1, AlignmentType.LEFT, bold, color),
      summaryCell(value, SC2, AlignmentType.RIGHT, bold, color),
    ]}));

  addSumRow("Subtotal One-Time:", fmtMoney(subtotalOnetime, moneda, tc));
  if (subtotalEnvio > 0) addSumRow("Subtotal Envío:", fmtMoney(subtotalEnvio, moneda, tc));
  // margen interno — omitido del documento del cliente
  for (const t of cotizacion.tasas) {
    addSumRow(`${t.nombre} (${t.porcentaje}%):`, fmtMoney(subtotalConMargen * (t.porcentaje / 100), moneda, tc));
  }
  if (showIva) addSumRow(`IVA (${cotizacion.iva}%):`, fmtMoney(ivaAmt, moneda, tc));
  addSumRow(showIva ? "TOTAL INVERSIÓN ÚNICA c/IVA:" : "TOTAL INVERSIÓN ÚNICA s/IVA:", fmtMoney(totalFinal, moneda, tc), true, primary);
  if (subtotalRec > 0) {
    addSumRow("TOTAL MENSUAL RECURRENTE:", fmtMoney(subtotalRec, moneda, tc) + "/mes", true, secondary);
  }

  const summaryTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [SC1, SC2],
    layout: TableLayoutType.FIXED,
    borders: { top: border1(primary), bottom: border1(primary), left: border1(primary), right: border1(primary), insideH: border1("EEEEEE"), insideV: noBorder } as any,
    rows: summaryRows,
  });

  // - Conditions -
  const conditionsSection: Paragraph[] = [];
  if (cotizacion.condiciones) {
    conditionsSection.push(
      emptyPara(80),
      sectionHeader(`${onetimeItems.length > 0 || recItems.length > 0 ? (envioItems.length > 0 ? 7 : 6) : 4}. CONDICIONES COMERCIALES`, primary),
      ...richBlock(cotizacion.condiciones, secondary),
    );
  }

  // - Header & Footer -
  const footerText = `${empresa} | CUIT: ${cuit} | ${iva}`;
  const docHeader = new Header({
    children: [headerPara],
  });
  const docFooter = new Footer({
    children: [new Paragraph({
      children: [
        normalRun(footerText, 15, "888888"),
        new TextRun({ children: ["\t", PageNumber.CURRENT], size: 15, font: "Arial", color: "888888" }),
        new TextRun({ text: " / ", size: 15, font: "Arial", color: "888888" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, font: "Arial", color: "888888" }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
    })],
  });

  // - Assemble document -
  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "▸", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } } }],
      }],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 18 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [
        ...titleBlock,
        infoTable,
        emptyPara(80),
        ...sections,
        ...tables as Paragraph[],
        emptyPara(120),
        summaryTable,
        ...conditionsSection,
        emptyPara(80),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
