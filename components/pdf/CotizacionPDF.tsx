import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Item {
  descripcion: string;
  cantidad: number;
  precioUsd: number;
  subtotalUsd: number;
  tipo: string;
}

interface Tasa {
  nombre: string;
  porcentaje: number;
}

interface Cotizacion {
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
  totalOnetimeUsd: number;
  totalRecurrenteUsd: number;
  items: Item[];
  tasas: Tasa[];
}

type Settings = {
  nombre: string;
  cuit: string;
  condicionIva: string;
  direccion: string;
  contactoNombre: string;
  contactoCargo: string;
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

function fmtMoney(n: number, moneda: string, tc?: number | null) {
  if (moneda === "USD" || !tc) return `USD ${fmt(n)}`;
  const converted = n * tc;
  return `USD ${fmt(n)} → ${moneda} ${fmt(converted)}`;
}

function makeStyles(primary: string, secondary: string) {
  return StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 9,
      paddingTop: 40,
      paddingBottom: 50,
      paddingHorizontal: 35,
      color: "#222",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: primary,
      paddingBottom: 10,
    },
    logo: { width: 80, height: 40, objectFit: "contain" },
    headerText: { flex: 1, textAlign: "right" },
    headerCompany: { fontSize: 13, fontFamily: "Helvetica-Bold", color: primary },
    headerAddress: { fontSize: 8, color: "#555", marginTop: 2 },
    titleBlock: { marginBottom: 14, alignItems: "center" },
    title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: primary, textTransform: "uppercase" },
    propNumber: { fontSize: 11, color: secondary, marginTop: 3 },
    infoTable: { flexDirection: "row", marginBottom: 14, borderWidth: 1, borderColor: "#ccc" },
    infoCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: "#ccc" },
    infoCellLast: { flex: 1, padding: 8 },
    infoCellTitle: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#fff",
      backgroundColor: primary,
      padding: 4,
      marginBottom: 4,
      textAlign: "center",
      textTransform: "uppercase",
    },
    infoCellRow: { flexDirection: "row", marginBottom: 2 },
    infoCellLabel: { fontSize: 7.5, color: "#666", width: 65 },
    infoCellValue: { fontSize: 7.5, flex: 1 },
    sectionTitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#fff",
      backgroundColor: primary,
      padding: "5 8",
      marginTop: 12,
      marginBottom: 6,
    },
    paragraph: { lineHeight: 1.3, marginBottom: 3 },
    bullet: { flexDirection: "row", marginBottom: 1, paddingLeft: 8 },
    bulletDot: { width: 10, color: secondary },
    bulletText: { flex: 1, lineHeight: 1.3 },
    table: { marginBottom: 8 },
    tableHeader: { flexDirection: "row", backgroundColor: secondary, padding: "4 6" },
    tableHeaderCell: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 8 },
    tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", padding: "3 6" },
    tableRowAlt: { flexDirection: "row", backgroundColor: "#f5f8ff", borderBottomWidth: 0.5, borderBottomColor: "#ddd", padding: "3 6" },
    tableTotal: { flexDirection: "row", backgroundColor: primary, padding: "5 6" },
    tableTotalCell: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9 },
    colDesc: { flex: 3 },
    colQty: { width: 50, textAlign: "right" },
    colPrice: { width: 85, textAlign: "right" },
    colSubtotal: { width: 90, textAlign: "right" },
    summaryBox: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: primary,
      borderRadius: 4,
      padding: 10,
      backgroundColor: "#f8faff",
    },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    summaryLabel: { fontSize: 9 },
    summaryValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
    summaryTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1.5,
      borderTopColor: primary,
    },
    summaryTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: primary },
    summaryTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: primary },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 35,
      right: 35,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 0.5,
      borderTopColor: "#ccc",
      paddingTop: 5,
      fontSize: 7.5,
      color: "#888",
    },
  });
}

export function CotizacionPDF({
  cotizacion,
  settings,
}: {
  cotizacion: Cotizacion;
  settings: Settings;
}) {
  const primary = settings?.colorPrimario || "#1B2A4A";
  const secondary = settings?.colorSecundario || "#2E86AB";
  const styles = makeStyles(primary, secondary);

  const onetimeItems = cotizacion.items.filter((i) => i.tipo === "onetime");
  const recItems = cotizacion.items.filter((i) => i.tipo === "recurrente");
  const envioItems = cotizacion.items.filter((i) => i.tipo === "envio");

  const subtotalOnetime = onetimeItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalRec = recItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalEnvio = envioItems.reduce((s, i) => s + i.subtotalUsd, 0);

  const margenAmt = (subtotalOnetime + subtotalEnvio) * (cotizacion.margen / 100);
  const subtotalConMargen = subtotalOnetime + subtotalEnvio + margenAmt;
  const ivaAmt = subtotalConMargen * (cotizacion.iva / 100);

  let tasasTotal = 0;
  for (const t of cotizacion.tasas) {
    tasasTotal += subtotalConMargen * (t.porcentaje / 100);
  }

  const totalFinal = subtotalConMargen + ivaAmt + tasasTotal;

  const fechaStr = format(new Date(cotizacion.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const moneda = cotizacion.moneda;
  const tc = cotizacion.tipoCambio;

  const empresa = settings?.nombre || "Empresa";
  const cuit = settings?.cuit || "";
  const iva = settings?.condicionIva || "";

  const condicionesLines = (cotizacion.condiciones || "").split("\n").filter(Boolean);
  const alcanceLines = (cotizacion.alcance || "").split("\n").filter(Boolean);
  const sitiosLines = (cotizacion.sitios || "").split("\n").filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow} fixed>
          {settings?.logoPath && (
            <Image src={`${process.env.NEXTAUTH_URL || "http://localhost:3000"}${settings.logoPath}`} style={styles.logo} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerCompany}>{empresa}</Text>
            <Text style={styles.headerAddress}>{settings?.direccion}</Text>
            <Text style={styles.headerAddress}>CUIT: {cuit} | {iva}</Text>
          </View>
        </View>

        {/* Título */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Propuesta Técnico-Comercial</Text>
          <Text style={styles.propNumber}>N° {cotizacion.numero}</Text>
        </View>

        {/* Tabla 3 columnas: Proveedor / Cliente / Detalles */}
        <View style={styles.infoTable}>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellTitle}>Proveedor</Text>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Empresa:</Text>
              <Text style={styles.infoCellValue}>{empresa}</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>CUIT:</Text>
              <Text style={styles.infoCellValue}>{cuit}</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>IVA:</Text>
              <Text style={styles.infoCellValue}>{iva}</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Contacto:</Text>
              <Text style={styles.infoCellValue}>{cotizacion.contactoNombre || settings?.contactoNombre}</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Cargo:</Text>
              <Text style={styles.infoCellValue}>{cotizacion.contactoCargo || settings?.contactoCargo}</Text>
            </View>
          </View>

          <View style={styles.infoCell}>
            <Text style={styles.infoCellTitle}>Cliente</Text>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Empresa:</Text>
              <Text style={styles.infoCellValue}>{cotizacion.clienteEmpresa}</Text>
            </View>
            {cotizacion.clienteCuit && (
              <View style={styles.infoCellRow}>
                <Text style={styles.infoCellLabel}>CUIT:</Text>
                <Text style={styles.infoCellValue}>{cotizacion.clienteCuit}</Text>
              </View>
            )}
            {cotizacion.clienteContacto && (
              <View style={styles.infoCellRow}>
                <Text style={styles.infoCellLabel}>Contacto:</Text>
                <Text style={styles.infoCellValue}>{cotizacion.clienteContacto}</Text>
              </View>
            )}
            {cotizacion.clienteCargo && (
              <View style={styles.infoCellRow}>
                <Text style={styles.infoCellLabel}>Cargo:</Text>
                <Text style={styles.infoCellValue}>{cotizacion.clienteCargo}</Text>
              </View>
            )}
            {cotizacion.clienteTelefono && (
              <View style={styles.infoCellRow}>
                <Text style={styles.infoCellLabel}>Teléfono:</Text>
                <Text style={styles.infoCellValue}>{cotizacion.clienteTelefono}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCellLast}>
            <Text style={styles.infoCellTitle}>Detalles</Text>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Propuesta N°:</Text>
              <Text style={styles.infoCellValue}>{cotizacion.numero}</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Fecha:</Text>
              <Text style={styles.infoCellValue}>{fechaStr}</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Validez:</Text>
              <Text style={styles.infoCellValue}>{cotizacion.validezDias} días</Text>
            </View>
            <View style={styles.infoCellRow}>
              <Text style={styles.infoCellLabel}>Moneda:</Text>
              <Text style={styles.infoCellValue}>{moneda}{tc ? ` (TC: ${fmt(tc)})` : ""}</Text>
            </View>
            {alcanceLines.length > 0 && (
              <View style={styles.infoCellRow}>
                <Text style={styles.infoCellLabel}>Alcance:</Text>
                <Text style={styles.infoCellValue}>{alcanceLines[0]}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sección 1 - Introducción */}
        {cotizacion.introduccion && (
          <>
            <Text style={styles.sectionTitle}>1. Introducción</Text>
            <RichText text={cotizacion.introduccion} styles={styles} secondary={secondary} />
          </>
        )}

        {/* Sección 2 - Alcance del Proyecto */}
        {cotizacion.alcanceProyecto && (
          <>
            <Text style={styles.sectionTitle}>2. Alcance de la Solución</Text>
            <RichText text={cotizacion.alcanceProyecto} styles={styles} secondary={secondary} />
          </>
        )}

        {/* Sección 3 - Sitios */}
        {cotizacion.sitios && (
          <>
            <Text style={styles.sectionTitle}>3. Sitios Comprendidos</Text>
            <RichText text={cotizacion.sitios} styles={styles} secondary={secondary} />
          </>
        )}

        {/* Sección 4 - Tabla One-Time */}
        {onetimeItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>4. Costos de Única Vez (One-Time Fee)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colDesc]}>Detalle</Text>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio x Uni.</Text>
                <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
              </View>
              {onetimeItems.map((item, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.colDesc}>{item.descripcion}</Text>
                  <Text style={styles.colQty}>{fmt(item.cantidad)}</Text>
                  <Text style={styles.colPrice}>{fmtMoney(item.precioUsd, moneda, tc)}</Text>
                  <Text style={styles.colSubtotal}>{fmtMoney(item.subtotalUsd, moneda, tc)}</Text>
                </View>
              ))}
              <View style={styles.tableTotal}>
                <Text style={[styles.tableTotalCell, styles.colDesc]}>SUBTOTAL ONE-TIME</Text>
                <Text style={styles.colQty}></Text>
                <Text style={styles.colPrice}></Text>
                <Text style={[styles.tableTotalCell, styles.colSubtotal]}>{fmtMoney(subtotalOnetime, moneda, tc)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Sección 5 - Tabla Recurrente */}
        {recItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>5. Servicios Recurrentes (Monthly Fee)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colDesc]}>Detalle</Text>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio x Uni.</Text>
                <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
              </View>
              {recItems.map((item, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.colDesc}>{item.descripcion}</Text>
                  <Text style={styles.colQty}>{fmt(item.cantidad)}</Text>
                  <Text style={styles.colPrice}>{fmtMoney(item.precioUsd, moneda, tc)}/mes</Text>
                  <Text style={styles.colSubtotal}>{fmtMoney(item.subtotalUsd, moneda, tc)}/mes</Text>
                </View>
              ))}
              <View style={styles.tableTotal}>
                <Text style={[styles.tableTotalCell, styles.colDesc]}>TOTAL MENSUAL</Text>
                <Text style={styles.colQty}></Text>
                <Text style={styles.colPrice}></Text>
                <Text style={[styles.tableTotalCell, styles.colSubtotal]}>{fmtMoney(subtotalRec, moneda, tc)}/mes</Text>
              </View>
            </View>
          </>
        )}

        {/* Sección Envío */}
        {envioItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>6. Envío (Shipping)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colDesc]}>Detalle</Text>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio x Uni.</Text>
                <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
              </View>
              {envioItems.map((item, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.colDesc}>{item.descripcion}</Text>
                  <Text style={styles.colQty}>{fmt(item.cantidad)}</Text>
                  <Text style={styles.colPrice}>{fmtMoney(item.precioUsd, moneda, tc)}</Text>
                  <Text style={styles.colSubtotal}>{fmtMoney(item.subtotalUsd, moneda, tc)}</Text>
                </View>
              ))}
              <View style={styles.tableTotal}>
                <Text style={[styles.tableTotalCell, styles.colDesc]}>TOTAL ENVÍO</Text>
                <Text style={styles.colQty}></Text>
                <Text style={styles.colPrice}></Text>
                <Text style={[styles.tableTotalCell, styles.colSubtotal]}>{fmtMoney(subtotalEnvio, moneda, tc)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Resumen de Inversión */}
        <Text style={styles.sectionTitle}>Resumen de Inversión</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal One-Time:</Text>
            <Text style={styles.summaryValue}>{fmtMoney(subtotalOnetime, moneda, tc)}</Text>
          </View>
          {subtotalEnvio > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal Envío:</Text>
              <Text style={styles.summaryValue}>{fmtMoney(subtotalEnvio, moneda, tc)}</Text>
            </View>
          )}
          {/* margen interno — omitido del documento del cliente */}
          {cotizacion.tasas.map((t, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t.nombre} ({t.porcentaje}%):</Text>
              <Text style={styles.summaryValue}>{fmtMoney(subtotalConMargen * (t.porcentaje / 100), moneda, tc)}</Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA ({cotizacion.iva}%):</Text>
            <Text style={styles.summaryValue}>{fmtMoney(ivaAmt, moneda, tc)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>TOTAL INVERSIÓN ÚNICA:</Text>
            <Text style={styles.summaryTotalValue}>{fmtMoney(totalFinal, moneda, tc)}</Text>
          </View>
          {recItems.length > 0 && (
            <View style={[styles.summaryRow, { marginTop: 4 }]}>
              <Text style={[styles.summaryLabel, { fontFamily: "Helvetica-Bold" }]}>TOTAL MENSUAL RECURRENTE:</Text>
              <Text style={[styles.summaryValue, { color: secondary }]}>{fmtMoney(subtotalRec, moneda, tc)}/mes</Text>
            </View>
          )}
        </View>

        {/* Sección 6 - Condiciones */}
        {cotizacion.condiciones && (
          <>
            <Text style={styles.sectionTitle}>6. Condiciones Comerciales</Text>
            <RichText text={cotizacion.condiciones} styles={styles} secondary={secondary} />
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{empresa} | CUIT: {cuit} | {iva}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// Renderiza texto respetando saltos de línea y detectando bullets automáticamente
function RichText({ text, styles, secondary }: { text: string; styles: any; secondary: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const isBullet = /^[\s]*[•\-▸►*]\s/.test(line) || /^[\s]*\d+[\.\)]\s/.test(line);
        const cleanLine = line.replace(/^[\s]*[•\-▸►*]\s*/, "").replace(/^[\s]*\d+[\.\)]\s*/, "").trim();
        if (!cleanLine) return <View key={i} style={{ height: 4 }} />;
        if (isBullet) {
          return (
            <View key={i} style={styles.bullet}>
              <Text style={[styles.bulletDot, { color: secondary }]}>•</Text>
              <Text style={styles.bulletText}>{cleanLine}</Text>
            </View>
          );
        }
        return <Text key={i} style={styles.paragraph}>{cleanLine}</Text>;
      })}
    </>
  );
}
