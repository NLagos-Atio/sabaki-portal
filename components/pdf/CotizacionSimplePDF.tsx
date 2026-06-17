import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Item {
  descripcion: string;
  notaSecundaria?: string | null;
  cantidad: number;
  precioUsd: number;
  subtotalUsd: number;
}

interface Condicion {
  label: string;
  valor: string;
}

interface CotizacionSimple {
  numero: string;
  titulo: string;
  fecha: Date | string;
  clienteEmpresa: string;
  clienteContacto?: string | null;
  moneda: string;
  tipoCambio?: number | null;
  margen: number;
  iva: number;
  mostrarIva: boolean;
  total: number;
  items: Item[];
  condiciones: Condicion[];
}

type Settings = {
  nombre: string;
  direccion: string;
  logoPath?: string | null;
  colorPrimario: string;
  colorSecundario: string;
} | null;

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const PRIMARY   = "#1B2A4A";
const SECONDARY = "#2E86AB";
const TEXT      = "#222222";
const MUTED     = "#666666";
const LIGHT_BG  = "#F5F7FA";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 36,
    color: TEXT,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  logo: { width: 90, height: 45, objectFit: "contain", marginRight: 12 },
  headerInfo: { flex: 1, justifyContent: "flex-end" },
  headerCompany: { fontSize: 7.5, color: MUTED },

  // ── Title banner ──
  titleBanner: {
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ── Client info 2-col ──
  clientGrid: {
    flexDirection: "row",
    marginBottom: 18,
  },
  clientCol: { flex: 1 },
  clientRow: { flexDirection: "row", marginBottom: 5 },
  clientLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: SECONDARY,
    width: 90,
  },
  clientValue: { fontSize: 9, color: TEXT, flex: 1 },

  // ── Section header ──
  sectionHeader: {
    backgroundColor: PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 0,
    alignItems: "center",
  },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Products table ──
  tableContainer: { marginBottom: 18 },
  tableColHeader: {
    flexDirection: "row",
    backgroundColor: "#3D3D3D",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableColHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#FFFFFF",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDDDDD",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDDDDD",
    backgroundColor: LIGHT_BG,
  },
  tableRowTotal: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowSubtotalLine: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDDDDD",
    backgroundColor: "#EEF2F7",
  },
  tableRowIva: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDDDDD",
  },

  colDesc:     { flex: 1 },
  colQty:      { width: 36, textAlign: "center" },
  colPrice:    { width: 90, textAlign: "right" },
  colSubtotal: { width: 90, textAlign: "right" },

  itemDesc:   { fontSize: 9, color: TEXT },
  itemNota:   { fontSize: 8, color: MUTED, fontFamily: "Helvetica-Oblique", marginTop: 1 },
  totalText:  { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 9 },
  subtotalLabelGray: { fontSize: 8.5, color: "#444", fontFamily: "Helvetica-Bold" },
  subtotalValueGray: { fontSize: 8.5, color: "#444", fontFamily: "Helvetica-Bold" },

  // ── Conditions table ──
  condTable: { marginBottom: 12 },
  condRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  condRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: LIGHT_BG,
  },
  condLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: SECONDARY,
    width: 100,
  },
  condValue: { fontSize: 9, color: TEXT, flex: 1, lineHeight: 1.4 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: "#CCCCCC",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "center" },
});

export function CotizacionSimplePDF({
  cotizacion,
  settings,
}: {
  cotizacion: CotizacionSimple;
  settings: Settings;
}) {
  const empresa   = settings?.nombre    || "Empresa";
  const direccion = settings?.direccion || "";
  const logoUrl   = settings?.logoPath
    ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${settings.logoPath}`
    : null;

  const fechaStr = format(new Date(cotizacion.fecha), "dd/MM/yyyy", { locale: es });

  const subtotal = cotizacion.items.reduce((s, i) => s + i.subtotalUsd, 0);
  const ivaAmt   = subtotal * (cotizacion.iva / 100);
  const total    = cotizacion.mostrarIva ? subtotal + ivaAmt : subtotal;

  const monSuffix = cotizacion.moneda === "USD" ? "USD " : `${cotizacion.moneda} `;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header: logo + datos empresa ── */}
        <View style={styles.header}>
          {logoUrl ? (
            <Image src={logoUrl} style={styles.logo} />
          ) : (
            <View style={{ width: 90, marginRight: 12 }} />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerCompany}>
              {empresa} | {direccion} |
            </Text>
          </View>
        </View>

        {/* ── Título ── */}
        <View style={styles.titleBanner}>
          <Text style={styles.titleText}>{cotizacion.titulo}</Text>
        </View>

        {/* ── Datos del cliente ── */}
        <View style={styles.clientGrid}>
          <View style={styles.clientCol}>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Cliente:</Text>
              <Text style={styles.clientValue}>{cotizacion.clienteEmpresa}</Text>
            </View>
            {cotizacion.clienteContacto ? (
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Contacto:</Text>
                <Text style={styles.clientValue}>{cotizacion.clienteContacto}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.clientCol}>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Nro. Cotización:</Text>
              <Text style={styles.clientValue}>{cotizacion.numero}</Text>
            </View>
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Fecha:</Text>
              <Text style={styles.clientValue}>{fechaStr}</Text>
            </View>
          </View>
        </View>

        {/* ── Tabla de productos ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Detalle de Productos y Precios de Venta</Text>
        </View>

        <View style={styles.tableContainer}>
          {/* Header de columnas */}
          <View style={styles.tableColHeader}>
            <Text style={[styles.tableColHeaderText, styles.colDesc]}>Descripcion</Text>
            <Text style={[styles.tableColHeaderText, styles.colQty]}>Cant.</Text>
            <Text style={[styles.tableColHeaderText, styles.colPrice]}>P. Unit. s/IVA (USD)</Text>
            <Text style={[styles.tableColHeaderText, styles.colSubtotal]}>Subtotal s/IVA (USD)</Text>
          </View>

          {/* Filas de ítems */}
          {cotizacion.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <View style={styles.colDesc}>
                <Text style={styles.itemDesc}>{item.descripcion}</Text>
                {item.notaSecundaria ? (
                  <Text style={styles.itemNota}>{item.notaSecundaria}</Text>
                ) : null}
              </View>
              <Text style={[{ fontSize: 9, textAlign: "center" }, styles.colQty]}>
                {item.cantidad % 1 === 0 ? item.cantidad.toString() : fmt(item.cantidad)}
              </Text>
              <Text style={[{ fontSize: 9 }, styles.colPrice]}>
                {monSuffix}{fmt(item.precioUsd)}
              </Text>
              <Text style={[{ fontSize: 9, fontFamily: "Helvetica-Bold" }, styles.colSubtotal]}>
                {monSuffix}{fmt(item.subtotalUsd)}
              </Text>
            </View>
          ))}

          {/* Fila(s) de total */}
          {cotizacion.mostrarIva ? (
            <>
              <View style={styles.tableRowSubtotalLine}>
                <Text style={[styles.subtotalLabelGray, styles.colDesc]}>SUBTOTAL s/IVA</Text>
                <Text style={styles.colQty} />
                <Text style={styles.colPrice} />
                <Text style={[styles.subtotalValueGray, styles.colSubtotal]}>
                  {monSuffix}{fmt(subtotal)}
                </Text>
              </View>
              <View style={styles.tableRowIva}>
                <Text style={[{ fontSize: 8.5, color: "#444" }, styles.colDesc]}>
                  IVA ({cotizacion.iva}%)
                </Text>
                <Text style={styles.colQty} />
                <Text style={styles.colPrice} />
                <Text style={[{ fontSize: 8.5, color: "#444" }, styles.colSubtotal]}>
                  {monSuffix}{fmt(ivaAmt)}
                </Text>
              </View>
              <View style={styles.tableRowTotal}>
                <Text style={[styles.totalText, styles.colDesc]}>TOTAL c/IVA</Text>
                <Text style={styles.colQty} />
                <Text style={styles.colPrice} />
                <Text style={[styles.totalText, styles.colSubtotal]}>
                  {monSuffix}{fmt(total)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.tableRowTotal}>
              <Text style={[styles.totalText, styles.colDesc]}>TOTAL</Text>
              <Text style={styles.colQty} />
              <Text style={styles.colPrice} />
              <Text style={[styles.totalText, styles.colSubtotal]}>
                {monSuffix}{fmt(total)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Condiciones comerciales ── */}
        {cotizacion.condiciones.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Condiciones Comerciales</Text>
            </View>
            <View style={styles.condTable}>
              {cotizacion.condiciones.map((c, i) => (
                <View key={i} style={i % 2 === 0 ? styles.condRow : styles.condRowAlt}>
                  <Text style={styles.condLabel}>{c.label}</Text>
                  <Text style={styles.condValue}>{c.valor}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Footer fijo en todas las páginas ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {empresa} | {direccion} |
          </Text>
        </View>
      </Page>
    </Document>
  );
}
