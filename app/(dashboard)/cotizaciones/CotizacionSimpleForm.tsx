"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import { CatalogModal } from "./CatalogModal";
import { CIFCalculatorModal } from "@/components/CIFCalculatorModal";

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fabricante?: string | null;
  numeroParte?: string | null;
  precioUsd: number;
  precioUsdFabricante?: number | null;
  categoria: string;
}

interface Item {
  descripcion: string;
  notaSecundaria: string;
  cantidad: number;
  precioUsd: number;
  costoUsd: number | null;
  margenPct: number | null;
  subtotalUsd: number;
  orden: number;
}

interface Condicion {
  label: string;
  valor: string;
  orden: number;
}

interface FormData {
  id?: string;
  numero: string;
  titulo: string;
  fecha: string;
  estado: string;
  moneda: string;
  tipoCambio: number | null;
  clienteEmpresa: string;
  clienteContacto: string;
  margen: number;
  iva: number;
  mostrarIva: boolean;
  profileSlot: number;
  total: number;
  items: Item[];
  condiciones: Condicion[];
}

interface Props {
  cotizacion?: FormData;
  productos: Producto[];
  defaultNumero: string;
  defaultCondiciones: Condicion[];
  profileNombre1?: string;
  profileNombre2?: string;
}

const ESTADOS  = ["borrador", "enviada", "aprobada", "rechazada"];
const MONEDAS  = ["USD", "EUR", "ARS"];

export function CotizacionSimpleForm({
  cotizacion,
  productos,
  defaultNumero,
  defaultCondiciones,
  profileNombre1,
  profileNombre2,
}: Props) {
  const router  = useRouter();
  const isEdit  = !!cotizacion?.id;

  const [form, setForm] = useState<FormData>({
    numero:          cotizacion?.numero  || defaultNumero,
    titulo:          cotizacion?.titulo  || "COTIZACION",
    fecha:           cotizacion?.fecha
      ? new Date(cotizacion.fecha).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    estado:          cotizacion?.estado      || "borrador",
    moneda:          cotizacion?.moneda      || "USD",
    tipoCambio:      cotizacion?.tipoCambio  ?? null,
    clienteEmpresa:  cotizacion?.clienteEmpresa  || "",
    clienteContacto: cotizacion?.clienteContacto || "",
    margen:          cotizacion?.margen    ?? 0,
    iva:             cotizacion?.iva       ?? 21,
    mostrarIva:      cotizacion?.mostrarIva ?? false,
    profileSlot:     (cotizacion as any)?.profileSlot ?? 1,
    total:           cotizacion?.total     ?? 0,
    items:           cotizacion?.items     || [],
    condiciones:     cotizacion?.condiciones || defaultCondiciones,
  });

  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [catalogOpen, setCatalogOpen]   = useState(false);
  const [cifOpen, setCifOpen]           = useState(false);
  const [previewHtml, setPreviewHtml]   = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  function setField(key: keyof FormData, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Ítems ──────────────────────────────────────────
  function addItem() {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { descripcion: "", notaSecundaria: "", cantidad: 1, precioUsd: 0, costoUsd: null, margenPct: f.margen > 0 ? f.margen : null, subtotalUsd: 0, orden: f.items.length },
      ],
    }));
  }

  function addFromCatalog(prods: Producto[]) {
    setForm((f) => {
      const newItems = prods.map((p, idx) => {
        const costo     = p.precioUsdFabricante ?? null;
        const margenPct = f.margen > 0 ? f.margen : null;
        const precioUsd = costo && margenPct
          ? Math.round(costo * (1 + margenPct / 100) * 100) / 100
          : p.precioUsd;

        // Descripción completa con fabricante + código de parte si existen
        const partSuffix = p.numeroParte
          ? ` (${[p.fabricante, p.numeroParte].filter(Boolean).join(" ")})`
          : p.fabricante ? ` (${p.fabricante})` : "";
        const descripcion = `${p.nombre}${partSuffix}`;

        return {
          descripcion,
          notaSecundaria: p.descripcion || "",
          cantidad: 1,
          precioUsd,
          costoUsd:  costo,
          margenPct: margenPct,
          subtotalUsd: precioUsd,
          orden: f.items.length + idx,
        };
      });
      return { ...f, items: [...f.items, ...newItems] };
    });
  }

  function updateItem(idx: number, key: keyof Item, value: any) {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      const it = items[idx];
      // Si cambia costo o margen y ambos están definidos → recalcular precio de venta
      if ((key === "costoUsd" || key === "margenPct") && it.costoUsd && it.margenPct != null) {
        it.precioUsd = Math.round(it.costoUsd * (1 + it.margenPct / 100) * 100) / 100;
      }
      it.subtotalUsd = Math.round(it.cantidad * it.precioUsd * 100) / 100;
      return { ...f, items };
    });
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function applyCifPrices(prices: Record<number, number>) {
    setForm((f) => {
      const items = f.items.map((it, i) => {
        if (prices[i] == null) return it;
        const precioUsd = prices[i];
        return {
          ...it,
          precioUsd,
          costoUsd: precioUsd,
          margenPct: null,
          subtotalUsd: Math.round(precioUsd * it.cantidad * 100) / 100,
        };
      });
      return { ...f, items };
    });
  }

  // ── Condiciones ────────────────────────────────────
  function addCondicion() {
    setForm((f) => ({
      ...f,
      condiciones: [...f.condiciones, { label: "", valor: "", orden: f.condiciones.length }],
    }));
  }

  function updateCondicion(idx: number, key: keyof Condicion, value: string) {
    setForm((f) => {
      const condiciones = [...f.condiciones];
      condiciones[idx] = { ...condiciones[idx], [key]: value };
      return { ...f, condiciones };
    });
  }

  function removeCondicion(idx: number) {
    setForm((f) => ({ ...f, condiciones: f.condiciones.filter((_, i) => i !== idx) }));
  }

  // ── Totales ────────────────────────────────────────
  const subtotal          = form.items.reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt         = subtotal * (form.margen / 100);
  const subtotalConMargen = subtotal + margenAmt;
  const ivaAmt            = form.mostrarIva ? subtotalConMargen * (form.iva / 100) : 0;
  const total             = subtotalConMargen + ivaAmt;

  // ── Vista previa ────────────────────────────────────
  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/cotizaciones-simple/preview-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, total }),
      });
      if (!res.ok) throw new Error("Error al generar vista previa");
      setPreviewHtml(await res.text());
    } catch {
      setError("No se pudo generar la vista previa.");
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Guardar ────────────────────────────────────────
  async function handleSave(estado?: string) {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, estado: estado || form.estado, total };
      const url    = isEdit ? `/api/cotizaciones-simple/${cotizacion!.id}` : "/api/cotizaciones-simple";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Error ${res.status}`);
      }

      router.push("/cotizaciones");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";
  const lbl = "block text-sm font-medium text-gray-700 mb-1";
  const sec = "bg-white rounded-xl border border-gray-200 p-6 mb-5";

  return (
    <div className="max-w-5xl">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* ── Cabecera del documento ── */}
      <div className={sec}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Cabecera del Documento</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Emitir como</label>
            <div className="flex gap-4">
              {[1, 2].map((slot) => (
                <label
                  key={slot}
                  className={`flex-1 flex items-center gap-2 border rounded-lg px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                    form.profileSlot === slot
                      ? "border-[#2E86AB] bg-blue-50 text-[#1B2A4A] font-medium"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="profileSlot"
                    checked={form.profileSlot === slot}
                    onChange={() => setField("profileSlot", slot)}
                    className="accent-[#2E86AB]"
                  />
                  Perfil {slot}{slot === 1 ? (profileNombre1 ? ` — ${profileNombre1}` : "") : (profileNombre2 ? ` — ${profileNombre2}` : "")}
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className={lbl}>Título del documento</label>
            <input className={inp} value={form.titulo} onChange={(e) => setField("titulo", e.target.value)} placeholder="Ej: COTIZACION – TELEMETRIA" />
          </div>
          <div>
            <label className={lbl}>N° Cotización *</label>
            <input className={inp} value={form.numero} onChange={(e) => setField("numero", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Fecha</label>
            <input type="date" className={inp} value={form.fecha} onChange={(e) => setField("fecha", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Estado</label>
            <select className={inp} value={form.estado} onChange={(e) => setField("estado", e.target.value)}>
              {ESTADOS.map((s) => <option key={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Moneda</label>
            <select className={inp} value={form.moneda} onChange={(e) => setField("moneda", e.target.value)}>
              {MONEDAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          {form.moneda !== "USD" && (
            <div className="col-span-2">
              <label className={lbl}>Tipo de cambio (USD → {form.moneda})</label>
              <input type="number" step="0.01" className={inp} value={form.tipoCambio || ""} onChange={(e) => setField("tipoCambio", Number(e.target.value))} placeholder="Ej: 1250" />
            </div>
          )}
        </div>
      </div>

      {/* ── Cliente ── */}
      <div className={sec}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Datos del Cliente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Empresa *</label>
            <input className={inp} value={form.clienteEmpresa} onChange={(e) => setField("clienteEmpresa", e.target.value)} placeholder="Nombre de la empresa cliente" />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Contacto</label>
            <input className={inp} value={form.clienteContacto} onChange={(e) => setField("clienteContacto", e.target.value)} placeholder="Nombre del contacto" />
          </div>
        </div>
      </div>

      {/* ── Tabla de ítems ── */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Productos</h2>
          <div className="flex gap-2">
            {form.items.length > 0 && (
              <button
                type="button"
                onClick={() => setCifOpen(true)}
                className="text-sm px-3 py-1.5 border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1.5"
              >
                🚢 Calcular CIF
              </button>
            )}
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              className="text-sm px-3 py-1.5 border border-[#1B2A4A] text-[#1B2A4A] rounded-lg hover:bg-[#1B2A4A] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <SearchIcon /> Buscar en catálogo
            </button>
            <button
              type="button"
              onClick={addItem}
              className="text-sm px-3 py-1.5 border border-[#2E86AB] text-[#2E86AB] rounded-lg hover:bg-blue-50"
            >
              + Línea manual
            </button>
          </div>
        </div>

        {form.items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Sin ítems todavía. Buscá en el catálogo o agregá una línea manual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b-2 border-gray-200 text-xs uppercase">
                  <th className="text-left py-2 font-semibold text-gray-700">Descripción / Nota</th>
                  <th className="text-right py-2 w-14 font-semibold text-gray-700">Cant.</th>
                  {/* Columnas internas */}
                  <th className="text-right py-2 w-28 font-semibold text-amber-700 border-l border-amber-200 pl-2">Costo USD</th>
                  <th className="text-right py-2 w-20 font-semibold text-amber-700">Ganancia%</th>
                  {/* Columna cliente */}
                  <th className="text-right py-2 w-28 font-semibold text-gray-700 border-l border-gray-200 pl-2">Precio Venta</th>
                  <th className="text-right py-2 w-28 font-semibold text-gray-700">Subtotal</th>
                  <th className="w-6" />
                </tr>
                {/* Leyenda de secciones */}
                <tr className="text-xs">
                  <td colSpan={2} />
                  <td colSpan={2} className="text-center text-amber-600 pb-1 border-l border-amber-200 pl-2">🔒 Interno</td>
                  <td colSpan={2} className="text-center text-[#2E86AB] pb-1 border-l border-gray-200 pl-2">📄 Cliente</td>
                  <td />
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => {
                  const hasCosto = item.costoUsd != null && item.costoUsd > 0;
                  const gananciaUnitaria = hasCosto ? item.precioUsd - (item.costoUsd || 0) : null;
                  const gananciaLinea   = gananciaUnitaria != null ? gananciaUnitaria * item.cantidad : null;
                  const inp2 = "border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#2E86AB]";
                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      {/* Descripción + nota */}
                      <td className="py-1.5 pr-2">
                        <input
                          className={inp2}
                          value={item.descripcion}
                          onChange={(e) => updateItem(idx, "descripcion", e.target.value)}
                          placeholder="Descripción del producto"
                        />
                        <input
                          className="border border-gray-200 rounded px-2 py-0.5 text-xs mt-1 w-full text-gray-500 italic focus:outline-none focus:ring-1 focus:ring-[#2E86AB]"
                          value={item.notaSecundaria}
                          onChange={(e) => updateItem(idx, "notaSecundaria", e.target.value)}
                          placeholder="Nota (itálica en el documento)"
                        />
                      </td>
                      {/* Cantidad */}
                      <td className="py-1.5 pr-2">
                        <input
                          type="number" step="1" min="1"
                          className={`${inp2} text-right`}
                          value={item.cantidad}
                          onChange={(e) => updateItem(idx, "cantidad", Number(e.target.value))}
                        />
                      </td>
                      {/* Costo — interno */}
                      <td className="py-1.5 pr-2 border-l border-amber-100 pl-2">
                        <input
                          type="number" step="0.01" min="0"
                          className={`${inp2} text-right bg-amber-50`}
                          value={item.costoUsd ?? ""}
                          placeholder="—"
                          onChange={(e) => updateItem(idx, "costoUsd", e.target.value === "" ? null : Number(e.target.value))}
                        />
                      </td>
                      {/* Ganancia % — interno */}
                      <td className="py-1.5 pr-2">
                        <div className="relative">
                          <input
                            type="number" step="0.5" min="0" max="500"
                            className={`${inp2} text-right pr-5 bg-amber-50`}
                            value={item.margenPct ?? ""}
                            placeholder="0"
                            onChange={(e) => updateItem(idx, "margenPct", e.target.value === "" ? null : Number(e.target.value))}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                        {gananciaLinea != null && (
                          <p className="text-xs text-green-700 font-medium mt-0.5 text-right">+{formatNumber(gananciaLinea)}</p>
                        )}
                      </td>
                      {/* Precio venta — cliente */}
                      <td className="py-1.5 pr-2 border-l border-gray-200 pl-2">
                        <input
                          type="number" step="0.01" min="0"
                          className={`${inp2} text-right font-medium`}
                          value={item.precioUsd}
                          onChange={(e) => updateItem(idx, "precioUsd", Number(e.target.value))}
                        />
                      </td>
                      {/* Subtotal */}
                      <td className="py-1.5 text-right font-mono text-gray-700 font-medium pr-1">
                        {formatNumber(item.subtotalUsd)}
                      </td>
                      {/* Eliminar */}
                      <td className="py-1.5 pl-1">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumen de totales */}
        <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col items-end gap-1.5 text-sm">
          <div className="flex gap-8 text-gray-500">
            <span>Subtotal ítems:</span>
            <span className="font-mono w-32 text-right">USD {formatNumber(subtotal)}</span>
          </div>
          {form.margen > 0 && (
            <div className="flex gap-8 text-amber-700 text-xs">
              <span className="flex items-center gap-1">
                <span className="text-xs bg-amber-100 px-1.5 py-0.5 rounded font-medium">🔒 interno</span>
                Margen ({form.margen}%):
              </span>
              <span className="font-mono w-32 text-right">USD {formatNumber(margenAmt)}</span>
            </div>
          )}
          {form.mostrarIva && (
            <div className="flex gap-8 text-gray-500">
              <span>IVA ({form.iva}%):</span>
              <span className="font-mono w-32 text-right">USD {formatNumber(ivaAmt)}</span>
            </div>
          )}
          <div className="flex gap-8 font-bold text-base text-[#1B2A4A] pt-1.5 border-t border-gray-300 mt-0.5">
            <span>{form.mostrarIva ? "TOTAL c/IVA:" : "TOTAL:"}</span>
            <span className="font-mono w-32 text-right">USD {formatNumber(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Ajustes financieros ── */}
      <div className={sec}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Ajustes Financieros</h2>
        <div className="grid grid-cols-3 gap-4 items-start">
          <div>
            <label className={lbl}>Margen de ganancia (%)</label>
            <input type="number" step="0.1" min="0" max="500" className={inp} value={form.margen} onChange={(e) => setField("margen", Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">Se suma al subtotal. Solo visible internamente — no aparece en el documento.</p>
          </div>
          <div>
            <label className={lbl}>IVA (%)</label>
            <input type="number" step="0.1" min="0" className={inp} value={form.iva} onChange={(e) => setField("iva", Number(e.target.value))} disabled={!form.mostrarIva} />
          </div>
          <div>
            <label className={lbl}>Mostrar IVA en el documento</label>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setField("mostrarIva", !form.mostrarIva)}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${form.mostrarIva ? "bg-[#2E86AB]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.mostrarIva ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-gray-700">
                {form.mostrarIva ? `Activo — muestra desglose IVA ${form.iva}%` : "Inactivo — solo muestra TOTAL s/IVA"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Condiciones comerciales ── */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Condiciones Comerciales</h2>
          <button type="button" onClick={addCondicion} className="text-xs text-[#2E86AB] hover:underline">+ Agregar fila</button>
        </div>

        {form.condiciones.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin condiciones. Agregá filas o cargalas desde Ajustes.</p>
        ) : (
          <div className="space-y-2">
            {form.condiciones.map((c, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-[#2E86AB] font-medium text-[#2E86AB]"
                  value={c.label}
                  onChange={(e) => updateCondicion(idx, "label", e.target.value)}
                  placeholder="Etiqueta"
                />
                <textarea
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E86AB] resize-none"
                  value={c.valor}
                  onChange={(e) => updateCondicion(idx, "valor", e.target.value)}
                  placeholder="Texto de la condición"
                />
                <button onClick={() => removeCondicion(idx)} className="text-red-400 hover:text-red-600 text-xs mt-1.5">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Botones ── */}
      <div className="flex items-center gap-3 pb-8 flex-wrap">
        <button
          onClick={() => handleSave()}
          disabled={saving}
          title="Se guardan los cambios y permite edición"
          className="bg-[#1B2A4A] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660] disabled:opacity-60"
        >
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar borrador"}
        </button>
        <button
          onClick={() => handleSave("enviada")}
          disabled={saving}
          title="Guarda los datos y bloquea la edición"
          className="bg-[#2E86AB] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#247494] disabled:opacity-60"
        >
          Guardar y marcar como Enviada
        </button>
        <button
          onClick={() => router.push("/cotizaciones")}
          className="px-6 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>

        {/* Vista previa */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewLoading}
          className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm border-2 border-[#2E86AB] text-[#2E86AB] hover:bg-[#2E86AB] hover:text-white font-semibold transition-colors disabled:opacity-60"
        >
          {previewLoading ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generando...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Vista Previa del Cliente</>
          )}
        </button>
      </div>

      {/* Modal Vista Previa */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewHtml(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: "900px", height: "92vh", maxWidth: "96vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Vista previa</span>
                <span className="font-semibold text-gray-900 text-sm">{form.numero}</span>
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Sin guardar</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPreviewHtml(null); handlePreview(); }}
                  className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >↺ Actualizar</button>
                <button onClick={() => setPreviewHtml(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-lg">✕</button>
              </div>
            </div>
            <iframe srcDoc={previewHtml} className="flex-1 border-0 rounded-b-2xl" title="Vista previa" sandbox="allow-same-origin" />
          </div>
        </div>
      )}

      {/* Modal catálogo */}
      {catalogOpen && (
        <CatalogModal
          categorias={["Hardware", "Software", "Servicio", "Recurrente"]}
          tipoLabel="Cotización Simple"
          onSelectMultiple={(prods) => addFromCatalog(prods as any)}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      {/* Modal CIF */}
      {cifOpen && (
        <CIFCalculatorModal
          items={form.items.map((it, i) => ({
            idx: i,
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precioUsd: it.precioUsd,
          }))}
          onApply={applyCifPrices}
          onClose={() => setCifOpen(false)}
        />
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
