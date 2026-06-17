"use client";
import { useState, useEffect } from "react";
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
  numeroParte?: string | null;
  fabricante?: string | null;
  cantidad: number;
  precioUsd: number;
  costoUsd?: number | null;    // costo fabricante — solo interno
  margenPct?: number | null;   // ganancia % por línea — solo interno
  subtotalUsd: number;
  tipo: "onetime" | "recurrente" | "envio";
  orden: number;
}

interface Tasa {
  nombre: string;
  porcentaje: number;
}

interface CotizacionData {
  id?: string;
  numero: string;
  fecha: string;
  validezDias: number;
  moneda: string;
  tipoCambio?: number | null;
  estado: string;
  clienteEmpresa: string;
  clienteCuit?: string;
  clienteContacto?: string;
  clienteCargo?: string;
  clienteTelefono?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  alcance?: string;
  alcanceProyecto?: string;
  introduccion?: string;
  sitios?: string;
  condiciones?: string;
  margen: number;
  iva: number;
  mostrarIva: boolean;
  profileSlot: number;
  items: Item[];
  tasas: Tasa[];
}

interface Props {
  cotizacion?: CotizacionData;
  productos: Producto[];
  defaultNumero: string;
  defaultCondiciones: string;
  defaultContactoNombre?: string;
  defaultContactoCargo?: string;
  profileNombre1?: string;
  profileNombre2?: string;
}

const MONEDAS = ["USD", "EUR", "ARS"];
const ESTADOS = ["borrador", "enviada", "aprobada", "rechazada"];

export function CotizacionForm({ cotizacion, productos, defaultNumero, defaultCondiciones, defaultContactoNombre, defaultContactoCargo, profileNombre1, profileNombre2 }: Props) {
  const router = useRouter();
  const isEdit = !!cotizacion?.id;

  const [form, setForm] = useState<CotizacionData>({
    numero: cotizacion?.numero || defaultNumero,
    fecha: cotizacion?.fecha ? new Date(cotizacion.fecha).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    validezDias: cotizacion?.validezDias ?? 30,
    moneda: cotizacion?.moneda || "USD",
    tipoCambio: cotizacion?.tipoCambio || null,
    estado: cotizacion?.estado || "borrador",
    clienteEmpresa: cotizacion?.clienteEmpresa || "",
    clienteCuit: cotizacion?.clienteCuit || "",
    clienteContacto: cotizacion?.clienteContacto || "",
    clienteCargo: cotizacion?.clienteCargo || "",
    clienteTelefono: cotizacion?.clienteTelefono || "",
    contactoNombre: cotizacion?.contactoNombre ?? defaultContactoNombre ?? "",
    contactoCargo: cotizacion?.contactoCargo ?? defaultContactoCargo ?? "",
    alcance: cotizacion?.alcance || "",
    alcanceProyecto: cotizacion?.alcanceProyecto || "",
    introduccion: cotizacion?.introduccion || "",
    sitios: cotizacion?.sitios || "",
    condiciones: cotizacion?.condiciones || defaultCondiciones,
    margen: cotizacion?.margen ?? 0,
    iva: cotizacion?.iva ?? 21,
    mostrarIva: (cotizacion as any)?.mostrarIva ?? true,
    profileSlot: (cotizacion as any)?.profileSlot ?? 1,
    items: cotizacion?.items || [],
    tasas: cotizacion?.tasas || [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalogModal, setCatalogModal] = useState<"onetime" | "recurrente" | "envio" | null>(null);
  const [cifOpen, setCifOpen]           = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  function setField(key: keyof CotizacionData, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addItem(tipo: "onetime" | "recurrente" | "envio") {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { descripcion: "", numeroParte: null, fabricante: null, cantidad: 1, precioUsd: 0, costoUsd: null, margenPct: f.margen || null, subtotalUsd: 0, tipo, orden: f.items.length },
      ],
    }));
  }

  function addFromCatalog(producto: Producto, tipo: "onetime" | "recurrente" | "envio") {
    setForm((f) => {
      const costo = producto.precioUsdFabricante ?? null;
      const margenPct = f.margen > 0 ? f.margen : null;
      // Si hay costo y margen → calcular precio de venta; si no → usar precioUsd del catálogo
      const precioUsd = (costo && margenPct)
        ? Math.round(costo * (1 + margenPct / 100) * 100) / 100
        : producto.precioUsd;
      const subtotalUsd = precioUsd;
      return {
        ...f,
        items: [
          ...f.items,
          {
            descripcion: producto.nombre,
            numeroParte: producto.numeroParte ?? null,
            fabricante:  producto.fabricante  ?? null,
            cantidad: 1,
            precioUsd,
            costoUsd: costo,
            margenPct,
            subtotalUsd,
            tipo,
            orden: f.items.length,
          },
        ],
      };
    });
  }

  function updateItem(index: number, key: keyof Item, value: any) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: value };
      const it = items[index];
      // Si cambia costo o margen → recalcular precio de venta automáticamente
      if ((key === "costoUsd" || key === "margenPct") && it.costoUsd && it.margenPct != null) {
        it.precioUsd = Math.round(it.costoUsd * (1 + it.margenPct / 100) * 100) / 100;
      }
      // Siempre recalcular subtotal
      it.subtotalUsd = Math.round(it.cantidad * it.precioUsd * 100) / 100;
      return { ...f, items };
    });
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
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

  function addTasa() {
    setForm((f) => ({ ...f, tasas: [...f.tasas, { nombre: "", porcentaje: 0 }] }));
  }

  function updateTasa(index: number, key: keyof Tasa, value: any) {
    setForm((f) => {
      const tasas = [...f.tasas];
      tasas[index] = { ...tasas[index], [key]: value };
      return { ...f, tasas };
    });
  }

  function removeTasa(index: number) {
    setForm((f) => ({ ...f, tasas: f.tasas.filter((_, i) => i !== index) }));
  }

  const onetimeItems = form.items.filter((i) => i.tipo === "onetime");
  const recItems = form.items.filter((i) => i.tipo === "recurrente");
  const envioItems = form.items.filter((i) => i.tipo === "envio");

  // Catálogos filtrados por sección — solo categorías compatibles
  const catalogOnetime  = productos.filter((p) => ["Hardware", "Software", "Servicio"].includes(p.categoria));
  const catalogRec      = productos.filter((p) => p.categoria === "Recurrente");
  const catalogEnvio    = productos.filter((p) => ["Hardware", "Servicio"].includes(p.categoria));
  const subtotalOnetime = onetimeItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalRec = recItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const subtotalEnvio = envioItems.reduce((s, i) => s + i.subtotalUsd, 0);
  const margenAmt = (subtotalOnetime + subtotalEnvio) * (form.margen / 100);
  const subtotalConMargen = subtotalOnetime + subtotalEnvio + margenAmt;
  const ivaAmt = form.mostrarIva ? subtotalConMargen * (form.iva / 100) : 0;
  const tasasTotal = form.tasas.reduce((s, t) => s + subtotalConMargen * (t.porcentaje / 100), 0);
  const totalFinal = subtotalConMargen + ivaAmt + tasasTotal;

  async function handleSave(estado?: string) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        estado: estado || form.estado,
        totalOnetimeUsd: totalFinal,
        totalRecurrenteUsd: subtotalRec,
      };

      const url = isEdit ? `/api/cotizaciones/${cotizacion!.id}` : "/api/cotizaciones";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Error ${res.status} al guardar la cotización`);
      }

      router.push("/cotizaciones");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/cotizaciones/preview-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error al generar vista previa");
      const html = await res.text();
      setPreviewHtml(html);
    } catch {
      setError("No se pudo generar la vista previa. Verificá tu conexión.");
    } finally {
      setPreviewLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const sectionCls = "bg-white rounded-xl border border-gray-200 p-6 mb-5";

  return (
    <div className="max-w-5xl">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Datos del cliente */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Datos del Cliente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Empresa *</label>
            <input className={inputCls} value={form.clienteEmpresa} onChange={(e) => setField("clienteEmpresa", e.target.value)} placeholder="Nombre de la empresa cliente" />
          </div>
          <div>
            <label className={labelCls}>CUIT</label>
            <input className={inputCls} value={form.clienteCuit || ""} onChange={(e) => setField("clienteCuit", e.target.value)} placeholder="30-XXXXXXXX-X" />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input className={inputCls} value={form.clienteTelefono || ""} onChange={(e) => setField("clienteTelefono", e.target.value)} placeholder="+54 11 XXXX-XXXX" />
          </div>
          <div>
            <label className={labelCls}>Contacto</label>
            <input className={inputCls} value={form.clienteContacto || ""} onChange={(e) => setField("clienteContacto", e.target.value)} placeholder="Nombre y apellido" />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input className={inputCls} value={form.clienteCargo || ""} onChange={(e) => setField("clienteCargo", e.target.value)} placeholder="Cargo del contacto" />
          </div>
        </div>
      </div>

      {/* Detalles de la propuesta */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Detalles de la Propuesta</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <label className={labelCls}>Emitir como</label>
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
          <div>
            <label className={labelCls}>Contacto comercial</label>
            <input className={inputCls} value={form.contactoNombre || ""} onChange={(e) => setField("contactoNombre", e.target.value)} placeholder="Nombre de quien presenta la propuesta" />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input className={inputCls} value={form.contactoCargo || ""} onChange={(e) => setField("contactoCargo", e.target.value)} placeholder="Cargo del contacto comercial" />
          </div>
          <div>
            <label className={labelCls}>N° Propuesta *</label>
            <input className={inputCls} value={form.numero} onChange={(e) => setField("numero", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" className={inputCls} value={form.fecha} onChange={(e) => setField("fecha", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Validez (días)</label>
            <input type="number" className={inputCls} value={form.validezDias} onChange={(e) => setField("validezDias", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <select className={inputCls} value={form.moneda} onChange={(e) => setField("moneda", e.target.value)}>
              {MONEDAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          {form.moneda !== "USD" && (
            <div>
              <label className={labelCls}>Tipo de cambio (USD → {form.moneda})</label>
              <input type="number" step="0.01" className={inputCls} value={form.tipoCambio || ""} onChange={(e) => setField("tipoCambio", Number(e.target.value))} placeholder="Ej: 1250" />
            </div>
          )}
          <div>
            <label className={labelCls}>Estado</label>
            <select className={inputCls} value={form.estado} onChange={(e) => setField("estado", e.target.value)}>
              {ESTADOS.map((s) => <option key={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <label className={labelCls}>
              Alcance
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({(form.alcance || "").length}/100)
              </span>
            </label>
            <input
              className={inputCls}
              maxLength={100}
              value={form.alcance || ""}
              onChange={(e) => setField("alcance", e.target.value)}
              placeholder="Ej: 3 sitios / estaciones de carga"
            />
          </div>
        </div>
      </div>

      {/* Textos del PDF */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Contenido del PDF</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Introducción</label>
            <textarea rows={3} className={inputCls} value={form.introduccion || ""} onChange={(e) => setField("introduccion", e.target.value)} placeholder="Texto de introducción de la propuesta..." />
          </div>
          <div>
            <label className={labelCls}>Alcance del Proyecto</label>
            <p className="text-xs text-gray-500 mb-1">Usá • o - al inicio de cada línea para bullets. Texto libre para párrafos.</p>
            <textarea rows={5} className={inputCls} value={form.alcanceProyecto || ""} onChange={(e) => setField("alcanceProyecto", e.target.value)} placeholder={"• Instrumentación y medición\n• Consolas CONTROL SITE ATG\n• Licencias de plataforma"} />
          </div>
          <div>
            <label className={labelCls}>Sitios comprendidos (uno por línea, con • o -)</label>
            <textarea rows={4} className={inputCls} value={form.sitios || ""} onChange={(e) => setField("sitios", e.target.value)} placeholder="• Sitio 1: Descripción&#10;• Sitio 2: Descripción" />
          </div>
        </div>
      </div>

      {/* Tabla One-Time */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-200">
          <h2 className="text-base font-semibold text-blue-900">Costos Única Vez (One-Time Fee)</h2>
          <div className="flex gap-2">
            {form.items.filter((i) => i.tipo !== "recurrente").length > 0 && (
              <button
                type="button"
                onClick={() => setCifOpen(true)}
                className="text-sm px-3 py-1.5 border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1.5"
              >
                🚢 Calcular CIF
              </button>
            )}
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
            </select>
            <button
              type="button"
              onClick={() => setCatalogModal("onetime")}
              className="text-sm px-3 py-1.5 border border-[#1B2A4A] text-[#1B2A4A] rounded-lg hover:bg-[#1B2A4A] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <SearchIcon /> Buscar en catálogo
            </button>
            <button onClick={() => addItem("onetime")} className="text-sm px-3 py-1.5 border border-[#2E86AB] text-[#2E86AB] rounded-lg hover:bg-blue-50">
              + Línea manual
            </button>
          </div>
        </div>
        <ItemsTable items={onetimeItems} tipo="onetime" allItems={form.items} onUpdate={updateItem} onRemove={removeItem} />
        <div className="mt-3 text-right text-sm font-semibold text-gray-700">
          Subtotal: USD {formatNumber(subtotalOnetime)}
        </div>
      </div>

      {/* Tabla Recurrente */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 mb-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-200">
          <h2 className="text-base font-semibold text-emerald-900">Servicios Recurrentes (Monthly Fee)</h2>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
            </select>
            <button
              type="button"
              onClick={() => setCatalogModal("recurrente")}
              className="text-sm px-3 py-1.5 border border-[#1B2A4A] text-[#1B2A4A] rounded-lg hover:bg-[#1B2A4A] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <SearchIcon /> Buscar en catálogo
            </button>
            <button onClick={() => addItem("recurrente")} className="text-sm px-3 py-1.5 border border-[#2E86AB] text-[#2E86AB] rounded-lg hover:bg-blue-50">
              + Línea manual
            </button>
          </div>
        </div>
        <ItemsTable items={recItems} tipo="recurrente" allItems={form.items} onUpdate={updateItem} onRemove={removeItem} />
        <div className="mt-3 text-right text-sm font-semibold text-[#2E86AB]">
          Total mensual: USD {formatNumber(subtotalRec)}/mes
        </div>
      </div>

      {/* Tabla Envío */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-200">
          <h2 className="text-base font-semibold text-amber-900">Envío (Shipping)</h2>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
            </select>
            <button
              type="button"
              onClick={() => setCatalogModal("envio")}
              className="text-sm px-3 py-1.5 border border-[#1B2A4A] text-[#1B2A4A] rounded-lg hover:bg-[#1B2A4A] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <SearchIcon /> Buscar en catálogo
            </button>
            <button onClick={() => addItem("envio")} className="text-sm px-3 py-1.5 border border-[#2E86AB] text-[#2E86AB] rounded-lg hover:bg-blue-50">
              + Línea manual
            </button>
          </div>
        </div>
        <ItemsTable items={envioItems} tipo="envio" allItems={form.items} onUpdate={updateItem} onRemove={removeItem} />
        <div className="mt-3 text-right text-sm font-semibold text-gray-800">
          Total envío: USD {formatNumber(subtotalEnvio)}
        </div>
      </div>

      {/* Ajustes financieros */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Ajustes Financieros</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelCls}>Ganancia por defecto para nuevos ítems (%)</label>
            <input type="number" step="0.1" min="0" max="500" className={inputCls} value={form.margen} onChange={(e) => setField("margen", Number(e.target.value))} />
            <p className="text-xs text-gray-500 mt-1">Se aplica como punto de partida al agregar un ítem. Cada ítem puede tener su propio %.</p>
          </div>
          <div>
            <label className={labelCls}>IVA / Impuestos (%)</label>
            <input type="number" step="0.1" min="0" className={inputCls} value={form.iva} onChange={(e) => setField("iva", Number(e.target.value))} disabled={!form.mostrarIva} />
          </div>
          <div className="flex flex-col justify-end">
            <label className={labelCls}>Mostrar IVA en el documento</label>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => setField("mostrarIva", !form.mostrarIva)}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${form.mostrarIva ? "bg-[#2E86AB]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.mostrarIva ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-xs text-gray-600">
                {form.mostrarIva ? `Activo — muestra desglose IVA ${form.iva}%` : "Inactivo — solo muestra TOTAL s/IVA"}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Tasas adicionales</label>
            <button onClick={addTasa} className="text-xs text-[#2E86AB] hover:underline">+ Agregar tasa</button>
          </div>
          {form.tasas.map((t, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <input className={`${inputCls} flex-1`} placeholder="Nombre (ej: Percepción IIBB)" value={t.nombre} onChange={(e) => updateTasa(i, "nombre", e.target.value)} />
              <input type="number" step="0.1" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" placeholder="%" value={t.porcentaje} onChange={(e) => updateTasa(i, "porcentaje", Number(e.target.value))} />
              <button onClick={() => removeTasa(i)} className="text-red-500 hover:text-red-700 text-xs px-2">✕</button>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Resumen de inversión</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-800">Subtotal One-Time:</span>
              <span className="font-mono">USD {formatNumber(subtotalOnetime)}</span>
            </div>
            {subtotalEnvio > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-800">Subtotal Envío:</span>
                <span className="font-mono">USD {formatNumber(subtotalEnvio)}</span>
              </div>
            )}
            {form.margen > 0 && (
              <div className="flex justify-between text-gray-800">
                <span>Margen ({form.margen}%):</span>
                <span className="font-mono">USD {formatNumber(margenAmt)}</span>
              </div>
            )}
            {form.tasas.map((t, i) => (
              <div key={i} className="flex justify-between text-gray-800">
                <span>{t.nombre} ({t.porcentaje}%):</span>
                <span className="font-mono">USD {formatNumber(subtotalConMargen * (t.porcentaje / 100))}</span>
              </div>
            ))}
            {form.mostrarIva && (
              <div className="flex justify-between text-gray-800">
                <span>IVA ({form.iva}%):</span>
                <span className="font-mono">USD {formatNumber(ivaAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-300 text-[#1B2A4A]">
              <span>{form.mostrarIva ? "TOTAL ÚNICA VEZ c/IVA:" : "TOTAL ÚNICA VEZ s/IVA:"}</span>
              <span className="font-mono">USD {formatNumber(totalFinal)}</span>
            </div>
            {subtotalRec > 0 && (
              <div className="flex justify-between font-bold text-[#2E86AB]">
                <span>TOTAL MENSUAL RECURRENTE:</span>
                <span className="font-mono">USD {formatNumber(subtotalRec)}/mes</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Condiciones */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Condiciones Comerciales</h2>
        <textarea
          rows={6}
          className={inputCls}
          value={form.condiciones || ""}
          onChange={(e) => setField("condiciones", e.target.value)}
          placeholder="Una condición por línea. Usar • o - para bullets."
        />
      </div>

      {/* Modal catálogo */}
      {catalogModal && (
        <CatalogModal
          categorias={
            catalogModal === "onetime"    ? ["Hardware", "Software", "Servicio"] :
            catalogModal === "recurrente" ? ["Recurrente"] :
                                           ["Hardware", "Servicio"]
          }
          tipoLabel={
            catalogModal === "onetime"    ? "Costos Única Vez" :
            catalogModal === "recurrente" ? "Servicios Recurrentes" :
                                           "Envío"
          }
          onSelectMultiple={(prods) => prods.forEach((p) => addFromCatalog(p as any, catalogModal!))}
          onClose={() => setCatalogModal(null)}
        />
      )}

      {/* Modal CIF */}
      {cifOpen && (
        <CIFCalculatorModal
          items={form.items
            .filter((it) => it.tipo !== "recurrente")
            .map((it, i) => ({
              idx: form.items.indexOf(it),
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              precioUsd: it.precioUsd,
            }))}
          onApply={applyCifPrices}
          onClose={() => setCifOpen(false)}
        />
      )}

      {/* Botones */}
      <div className="flex items-center gap-3 pb-8 flex-wrap">
        <button
          onClick={() => handleSave()}
          disabled={saving}
          title="Se guardan los cambios y permite edición"
          className="bg-[#1B2A4A] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660] disabled:opacity-60 transition-colors"
        >
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar borrador"}
        </button>
        <button
          onClick={() => handleSave("enviada")}
          disabled={saving}
          title="Guarda los datos y bloquea la edición"
          className="bg-[#2E86AB] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#247494] disabled:opacity-60 transition-colors"
        >
          Guardar y marcar como Enviada
        </button>
        <button
          onClick={() => router.push("/cotizaciones")}
          className="px-6 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>

        {/* Vista Previa */}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: "900px", height: "92vh", maxWidth: "96vw" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#2E86AB]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span className="font-semibold text-gray-900 text-sm">Vista Previa del Cliente — {form.numero}</span>
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Sin guardar</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPreviewHtml(null); handlePreview(); }}
                  className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ↺ Actualizar
                </button>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-lg"
                >✕</button>
              </div>
            </div>
            {/* Iframe con srcdoc — contenido directo, sin URL */}
            <iframe
              srcDoc={previewHtml}
              className="flex-1 border-0 rounded-b-2xl"
              title="Vista previa del cliente"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
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

function ItemsTable({
  items, tipo, allItems, onUpdate, onRemove,
}: {
  items: Item[];
  tipo: "onetime" | "recurrente" | "envio";
  allItems: Item[];
  onUpdate: (index: number, key: keyof Item, value: any) => void;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-700 text-center py-6">No hay ítems. Agregá del catálogo o manualmente.</p>;
  }

  const inp = "border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#2E86AB]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[780px]">
        <thead>
          <tr className="border-b-2 border-gray-200 text-xs uppercase">
            {/* Columnas del cliente (siempre visibles) */}
            <th className="text-left py-2 font-semibold text-gray-800">Descripción</th>
            <th className="text-right py-2 w-16 font-semibold text-gray-800">Cant.</th>
            {/* Columnas internas de rentabilidad */}
            <th className="text-right py-2 w-28 font-semibold text-amber-700 border-l border-amber-200 pl-2">Costo USD</th>
            <th className="text-right py-2 w-20 font-semibold text-amber-700">Ganancia%</th>
            {/* Precio venta = lo que ve el cliente */}
            <th className="text-right py-2 w-28 font-semibold text-gray-800 border-l border-gray-200 pl-2">Precio Venta</th>
            <th className="text-right py-2 w-28 font-semibold text-gray-800">Subtotal</th>
            <th className="w-6"></th>
          </tr>
          {/* Leyenda de secciones */}
          <tr className="text-xs">
            <td colSpan={2}></td>
            <td colSpan={2} className="text-center text-amber-600 pb-1 border-l border-amber-200 pl-2">🔒 Interno</td>
            <td colSpan={2} className="text-center text-[#2E86AB] pb-1 border-l border-gray-200 pl-2">📄 Cliente</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const globalIdx = allItems.findIndex((i) => i === item);
            const hasCosto = item.costoUsd != null && item.costoUsd > 0;
            const gananciaUnitaria = hasCosto ? item.precioUsd - (item.costoUsd || 0) : null;
            const gananciaLinea = gananciaUnitaria != null ? gananciaUnitaria * item.cantidad : null;
            return (
              <tr key={globalIdx} className="border-b border-gray-100 hover:bg-gray-50">
                {/* Descripción + Código + Fabricante */}
                <td className="py-1.5 pr-2">
                  <input className={inp} value={item.descripcion}
                    onChange={(e) => onUpdate(globalIdx, "descripcion", e.target.value)}
                    placeholder="Descripción del ítem" />
                  <div className="flex gap-1 mt-1">
                    <input
                      className="border border-gray-200 rounded px-2 py-0.5 text-xs w-1/2 focus:outline-none focus:ring-1 focus:ring-[#2E86AB] placeholder-gray-400"
                      value={item.numeroParte ?? ""}
                      onChange={(e) => onUpdate(globalIdx, "numeroParte", e.target.value || null)}
                      placeholder="Código (ej: ATG-001)" />
                    <input
                      className="border border-gray-200 rounded px-2 py-0.5 text-xs w-1/2 focus:outline-none focus:ring-1 focus:ring-[#2E86AB] placeholder-gray-400"
                      value={item.fabricante ?? ""}
                      onChange={(e) => onUpdate(globalIdx, "fabricante", e.target.value || null)}
                      placeholder="Fabricante" />
                  </div>
                </td>
                {/* Cantidad */}
                <td className="py-1.5 pr-2">
                  <input type="number" step="1" min="1" className={`${inp} text-right`}
                    value={item.cantidad}
                    onChange={(e) => onUpdate(globalIdx, "cantidad", Number(e.target.value))} />
                </td>
                {/* Costo — interno */}
                <td className="py-1.5 pr-2 border-l border-amber-100 pl-2">
                  <input type="number" step="0.01" min="0" className={`${inp} text-right bg-amber-50`}
                    value={item.costoUsd ?? ""}
                    placeholder="—"
                    onChange={(e) => onUpdate(globalIdx, "costoUsd", e.target.value === "" ? null : Number(e.target.value))} />
                </td>
                {/* Ganancia % — interno */}
                <td className="py-1.5 pr-2">
                  <div className="relative">
                    <input type="number" step="0.5" min="0" max="500" className={`${inp} text-right pr-5 bg-amber-50`}
                      value={item.margenPct ?? ""}
                      placeholder="0"
                      onChange={(e) => onUpdate(globalIdx, "margenPct", e.target.value === "" ? null : Number(e.target.value))} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  {gananciaLinea != null && (
                    <p className="text-xs text-green-700 font-medium mt-0.5 text-right">+{formatNumber(gananciaLinea)}</p>
                  )}
                </td>
                {/* Precio Venta — va al cliente */}
                <td className="py-1.5 pr-2 border-l border-gray-200 pl-2">
                  <input type="number" step="0.01" min="0" className={`${inp} text-right font-medium`}
                    value={item.precioUsd}
                    onChange={(e) => onUpdate(globalIdx, "precioUsd", Number(e.target.value))} />
                </td>
                {/* Subtotal */}
                <td className="py-1.5 text-right font-mono text-gray-700 font-medium pr-1">
                  {formatNumber(item.subtotalUsd)}
                </td>
                {/* Eliminar */}
                <td className="py-1.5 pl-1">
                  <button onClick={() => onRemove(globalIdx)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
