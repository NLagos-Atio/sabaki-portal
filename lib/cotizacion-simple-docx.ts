import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, ImageRun, TabStopType, TabStopPosition,
  TableLayoutType,
} from "docx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { readFileSync } from "fs";
import { join } from "path";

// A4 con márgenes 1000 c/u → 9906 DXA de ancho útil
const CW = 9906;

interface Item {
  descripcion: string;
  notaSecundaria?: string | null;
  cantidad: number;
  precioUsd: number;
  subtotalUsd: number;
}
interface Condicion { label: string; valor: string; }
interface CotizacionSimple {
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
  items: Item[];
  condiciones: Condicion[];
}
interface Settings {
  nombre: string;
  direccion: string;
  logoPath?: string | null;
  colorPrimario: string;
  colorSecundario: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const noBorder  = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const border1   = (c: string) => ({ style: BorderStyle.SINGLE, size: 4, color: c });
const boldRun   = (text: string, size = 20, color?: string) =>
  new TextRun({ text, bold: true, size, font: "Arial", ...(color ? { color } : {}) });
const normalRun = (text: string, size = 18, color?: string) =>
  new TextRun({ text, size, font: "Arial", ...(color ? { color } : {}) });
const italicRun = (text: string, size = 16, color = "888888") =>
  new TextRun({ text, italics: true, size, font: "Arial", color });
const emptyPara = (after = 80) =>
  new Paragraph({ children: [new TextRun("")], spacing: { after } });

export async function generateCotizacionSimpleDocx(
  cotizacion: CotizacionSimple,
  settings: Settings | null,
): Promise<Buffer> {
  const primary   = (settings?.colorPrimario   || "#1B2A4A").replace("#", "");
  const secondary = (settings?.colorSecundario || "#2E86AB").replace("#", "");
  const empresa   = settings?.nombre    || "Empresa";
  const direccion = settings?.direccion || "";
  const moneda    = cotizacion.moneda;
  const tc        = cotizacion.tipoCambio;
  const fechaStr  = format(new Date(cotizacion.fecha), "dd/MM/yyyy", { locale: es });

  // Cálculo de totales
  const subtotal          = cotizacion.items.reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt         = subtotal * (cotizacion.margen / 100);
  const subtotalConMargen = subtotal + margenAmt;
  const ivaAmt            = cotizacion.mostrarIva ? subtotalConMargen * (cotizacion.iva / 100) : 0;
  const total             = subtotalConMargen + ivaAmt;

  const fmtM = (n: number) => moneda === "USD" || !tc
    ? `USD ${fmt(n)}`
    : `USD ${fmt(n)} → ${moneda} ${fmt(n * tc)}`;

  // ── Logo ──────────────────────────────────────────────────────────
  let logoRun: ImageRun | null = null;
  if (settings?.logoPath) {
    try {
      const logoPath = join(process.cwd(), "public", settings.logoPath.replace(/^\//, ""));
      const logoData = readFileSync(logoPath);
      const ext = settings.logoPath.split(".").pop()?.toLowerCase() || "png";
      logoRun = new ImageRun({
        type: ext as any,
        data: logoData,
        transformation: { width: 100, height: 50 },
        altText: { title: "Logo", description: "Logo empresa", name: "Logo" },
      });
    } catch (e) {
    console.error("[CotizacionSimpleDocx] Error al cargar logo:", settings?.logoPath, e);
    logoRun = null;
  }
  }

  // ── Header: tabla 2 columnas (logo izq | info empresa derecha) ─────
  // Se usa tabla en lugar de tab stop porque Word no garantiza la alineación
  // de texto a la derecha cuando hay una imagen en el mismo párrafo.
  const headerTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [2800, CW - 2800],
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder, bottom: noBorder,
      left: noBorder, right: noBorder,
      insideH: noBorder, insideV: noBorder,
    } as any,
    rows: [
      new TableRow({
        children: [
          // Columna izquierda: logo
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: logoRun
                  ? [logoRun]
                  : [boldRun(empresa, 22, primary)],
              }),
            ],
          }),
          // Columna derecha: empresa | dirección — alineado a la derecha
          new TableCell({
            width: { size: CW - 2800, type: WidthType.DXA },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${empresa} | ${direccion} |`,
                    size: 15,
                    font: "Arial",
                    color: "555555",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Línea separadora debajo del header
  const headerSeparator = new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primary, space: 1 } },
    spacing: { after: 160 },
  });

  // ── Título (banner azul) ──────────────────────────────────────────
  const titlePara = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [boldRun(cotizacion.titulo.toUpperCase(), 28, "FFFFFF")],
    shading: { fill: primary, type: ShadingType.CLEAR },
    spacing: { before: 120, after: 200 },
    indent: { left: 0, right: 0 },
  });

  // ── Info cliente (2 columnas sin bordes) ─────────────────────────
  const clienteCell = (lines: { label: string; value: string }[], isRight = false) =>
    new TableCell({
      width: { size: CW / 2, type: WidthType.DXA },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
      margins: { top: 40, bottom: 40, left: isRight ? 200 : 0, right: 0 },
      children: lines.map(({ label, value }) =>
        new Paragraph({
          children: [
            new TextRun({ text: label + " ", bold: true, size: 18, font: "Arial", color: secondary }),
            new TextRun({ text: value, size: 18, font: "Arial" }),
          ],
          spacing: { after: 60 },
        })
      ),
    });

  const infoTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW / 2, CW / 2],
    layout: TableLayoutType.FIXED,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder } as any,
    rows: [
      new TableRow({
        children: [
          clienteCell([
            { label: "Cliente:", value: cotizacion.clienteEmpresa },
            ...(cotizacion.clienteContacto ? [{ label: "Contacto:", value: cotizacion.clienteContacto }] : []),
          ]),
          clienteCell([
            { label: "Nro. Cotización:", value: cotizacion.numero },
            { label: "Fecha:", value: fechaStr },
          ], true),
        ],
      }),
    ],
  });

  // ── Section header ────────────────────────────────────────────────
  const sectionHeader = (text: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [boldRun(text.toUpperCase(), 19, "FFFFFF")],
      shading: { fill: primary, type: ShadingType.CLEAR },
      spacing: { before: 200, after: 0 },
      indent: { left: 0, right: 0 },
    });

  // ── Tabla de productos ────────────────────────────────────────────
  const bc = "DDDDDD";
  const itemBorders = { top: border1(bc), bottom: border1(bc), left: border1(bc), right: border1(bc) };

  const headerCell = (text: string, w: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: { top: border1("3D3D3D"), bottom: border1("3D3D3D"), left: border1("3D3D3D"), right: border1("3D3D3D") },
      shading: { fill: "3D3D3D", type: ShadingType.CLEAR },
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      children: [new Paragraph({ alignment: align, children: [boldRun(text, 17, "FFFFFF")] })],
    });

  // Columnas: Descripción 4445 | Cant 953 | P.Unit 2222 | Subtotal 2286
  const COL_D = 4445, COL_Q = 953, COL_P = 2222, COL_S = 2286;

  const productRows: TableRow[] = [
    new TableRow({
      children: [
        headerCell("Descripcion",         COL_D),
        headerCell("Cant.",               COL_Q, AlignmentType.CENTER),
        headerCell("P. Unit. s/IVA (USD)", COL_P, AlignmentType.RIGHT),
        headerCell("Subtotal s/IVA (USD)", COL_S, AlignmentType.RIGHT),
      ],
    }),
    ...cotizacion.items.map((item, i) => {
      const fill = i % 2 === 0 ? "FFFFFF" : "F5F7FA";
      const itemCell = (children: any[], w: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) =>
        new TableCell({
          width: { size: w, type: WidthType.DXA },
          borders: itemBorders,
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ alignment: align, children })],
        });

      const descChildren: any[] = [normalRun(item.descripcion, 18)];
      const descCell = new TableCell({
        width: { size: COL_D, type: WidthType.DXA },
        borders: itemBorders,
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [
          new Paragraph({ children: [normalRun(item.descripcion, 18)] }),
          ...(item.notaSecundaria ? [
            new Paragraph({ children: [italicRun(item.notaSecundaria, 16, "888888")], spacing: { before: 20 } }),
          ] : []),
        ],
      });

      return new TableRow({
        children: [
          descCell,
          itemCell([normalRun(item.cantidad % 1 === 0 ? String(item.cantidad) : item.cantidad.toFixed(2), 18)], COL_Q, AlignmentType.CENTER),
          itemCell([normalRun(fmtM(item.precioUsd), 18)], COL_P, AlignmentType.RIGHT),
          itemCell([boldRun(fmtM(item.subtotalUsd), 18)], COL_S, AlignmentType.RIGHT),
        ],
      });
    }),
  ];

  // Filas de total
  const totalRowCell = (text: string, w: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, span = 1, fill = primary, size = 18) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      columnSpan: span,
      borders: { top: border1(fill), bottom: border1(fill), left: border1(fill), right: border1(fill) },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ alignment: align as any, children: [boldRun(text, size, "FFFFFF")] })],
    });

  const grayRowCell = (text: string, w: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, span = 1) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      columnSpan: span,
      borders: itemBorders,
      shading: { fill: "EEF2F7", type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ alignment: align as any, children: [boldRun(text, 18, "444444")] })],
    });

  if (cotizacion.mostrarIva) {
    productRows.push(
      new TableRow({ children: [
        grayRowCell("SUBTOTAL s/IVA", COL_D + COL_Q + COL_P, AlignmentType.RIGHT, 3),
        grayRowCell(fmtM(subtotalConMargen), COL_S, AlignmentType.RIGHT),
      ]}),
      new TableRow({ children: [
        new TableCell({
          width: { size: COL_D + COL_Q + COL_P, type: WidthType.DXA },
          columnSpan: 3,
          borders: itemBorders,
          shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 50, bottom: 50, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [normalRun(`IVA (${cotizacion.iva}%)`, 17, "444444")] })],
        }),
        new TableCell({
          width: { size: COL_S, type: WidthType.DXA },
          borders: itemBorders,
          shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 50, bottom: 50, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [normalRun(fmtM(ivaAmt), 17, "444444")] })],
        }),
      ]}),
      new TableRow({ children: [
        totalRowCell("TOTAL c/IVA", COL_D + COL_Q + COL_P, AlignmentType.RIGHT, 3),
        totalRowCell(fmtM(total), COL_S, AlignmentType.RIGHT),
      ]}),
    );
  } else {
    productRows.push(
      new TableRow({ children: [
        totalRowCell("TOTAL", COL_D + COL_Q + COL_P, AlignmentType.RIGHT, 3),
        totalRowCell(fmtM(total), COL_S, AlignmentType.RIGHT),
      ]}),
    );
  }

  const productTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [COL_D, COL_Q, COL_P, COL_S],
    layout: TableLayoutType.FIXED,
    rows: productRows,
  });

  // ── Tabla de condiciones ──────────────────────────────────────────
  const COND_L = 2200, COND_V = CW - COND_L;
  const condRows = cotizacion.condiciones.map((c, i) => {
    const fill = i % 2 === 0 ? "FFFFFF" : "F5F7FA";
    const condBorder = border1("E0E0E0");
    return new TableRow({
      children: [
        new TableCell({
          width: { size: COND_L, type: WidthType.DXA },
          borders: { top: condBorder, bottom: condBorder, left: noBorder, right: noBorder },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 70, bottom: 70, left: 120, right: 60 },
          children: [new Paragraph({ children: [boldRun(c.label, 18, secondary)] })],
        }),
        new TableCell({
          width: { size: COND_V, type: WidthType.DXA },
          borders: { top: condBorder, bottom: condBorder, left: noBorder, right: noBorder },
          shading: { fill, type: ShadingType.CLEAR },
          margins: { top: 70, bottom: 70, left: 60, right: 120 },
          children: [new Paragraph({ children: [normalRun(c.valor, 18)] })],
        }),
      ],
    });
  });

  const condTable = new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [COND_L, COND_V],
    layout: TableLayoutType.FIXED,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder } as any,
    rows: condRows,
  });

  // ── Footer ────────────────────────────────────────────────────────
  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          normalRun(`${empresa} | ${direccion} |`, 15, "888888"),
        ],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
      }),
    ],
  });

  // ── Ensamblar ─────────────────────────────────────────────────────
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 18 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      headers: {
        default: new Header({ children: [headerTable, headerSeparator] }),
      },
      footers: { default: docFooter },
      children: [
        titlePara,
        infoTable,
        emptyPara(160),
        sectionHeader("Detalle de Productos y Precios de Venta"),
        productTable,
        emptyPara(160),
        ...(cotizacion.condiciones.length > 0 ? [
          sectionHeader("Condiciones Comerciales"),
          condTable,
          emptyPara(80),
        ] : []),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
