"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CargoItem { nombre: string; monto: number; porcentaje?: number | null }
interface LineItem {
  item: number; codigoParte: string | null; descripcion: string;
  cantidad: number; precioUnitario: number; total: number; notas?: string | null;
}
interface Presupuesto {
  id: string; proveedorId: string; nombreArchivo: string; rutaArchivo: string;
  numeroQuote: string | null; fechaDoc: string | null; validezOferta: string | null;
  moneda: string | null; incoterm: string | null; condPago: string | null;
  impuestos: string | null; descuentos: string | null;
  subtotal: number | null; totalFinal: number | null;
  cargosJson: string | null; itemsJson: string | null;
  procesado: boolean; createdAt: string;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: es }); } catch { return "—"; }
}
function fmtNum(n: number | null, moneda = "") {
  if (n == null) return "—";
  return `${moneda} ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(n)}`.trim();
}

export function PresupuestosClient({ proveedorId, presupuestos: initial }: { proveedorId: string; presupuestos: Presupuesto[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [presupuestos, setPresupuestos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Presupuesto | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [tipoCambio, setTipoCambio] = useState<string>("");
  const [tcFuente, setTcFuente] = useState<string>("");
  const [tcFecha, setTcFecha] = useState<string>("");
  const [tcCargando, setTcCargando] = useState(false);
  const [tcEditado, setTcEditado] = useState(false);
  const [error, setError] = useState("");

  // --- ESTADO MODAL GENERAR COTIZACIÓN ---
  const [showCotizar, setShowCotizar] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convForm, setConvForm] = useState({
    clienteEmpresa: "", clienteCuit: "", clienteContacto: "", clienteCargo: "", clienteTelefono: "",
    markup: 20, iva: 21,
  });
  const [costosImportacion, setCostosImportacion] = useState([
    { nombre: "Gastos de aduana / despacho", monto: 0 },
    { nombre: "Aranceles de importación", monto: 0 },
    { nombre: "Tasas portuarias / aeroportuarias", monto: 0 },
  ]);
  const [costosNacionalizacion, setCostosNacionalizacion] = useState([
    { nombre: "Honorarios despachante", monto: 0 },
    { nombre: "IVA de importación", monto: 0 },
    { nombre: "Almacenaje", monto: 0 },
  ]);

  // Auto-fetch tipo de cambio cuando cambia la moneda del presupuesto seleccionado
  useEffect(() => {
    const moneda = selected?.moneda;
    if (!moneda || moneda === "USD") {
      setTipoCambio("");
      setTcFuente("");
      setTcFecha("");
      setTcEditado(false);
      return;
    }
    setTcCargando(true);
    setTcEditado(false);
    fetch(`/api/tipo-cambio?from=${moneda}&to=USD`)
      .then(r => r.json())
      .then(data => {
        if (data?.rate) {
          setTipoCambio(String(data.rate));
          setTcFuente(data.fuente || "Cotización online");
          setTcFecha(data.date || "");
        } else {
          setTipoCambio("");
          setTcFuente("No disponible — ingresá el valor manualmente");
        }
      })
      .catch(() => {
        setTipoCambio("");
        setTcFuente("Sin conexión — ingresá el valor manualmente");
      })
      .finally(() => setTcCargando(false));
  }, [selected?.moneda]);

  // --- SUBIR PDF ---
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/proveedores/${proveedorId}/presupuestos`, { method: "POST", body: fd });
    if (!res.ok) { setError("Error al subir el archivo"); setUploading(false); return; }
    const data = await res.json();
    setPresupuestos(ps => [data, ...ps]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // --- ANALIZAR CON IA ---
  async function handleAnalizar(p: Presupuesto) {
    setAnalyzing(p.id);
    setError("");
    const res = await fetch(`/api/presupuestos/${p.id}/analizar`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Error al analizar"); setAnalyzing(null); return; }
    setPresupuestos(ps => ps.map(x => x.id === p.id ? data : x));
    setSelected(data);
    setSelectedItems([]);
    setAnalyzing(null);
  }

  // --- VER ANÁLISIS ---
  function handleVer(p: Presupuesto) {
    setSelected(p);
    setSelectedItems([]);
    setImportResult(null);
    setTipoCambio("");
  }

  // --- IMPORTAR A PRODUCTOS ---
  async function handleImportar() {
    if (!selected) return;
    const needsTC = selected.moneda && selected.moneda !== "USD";
    if (needsTC && (!tipoCambio || Number(tipoCambio) <= 0)) {
      setError(`El tipo de cambio ${selected.moneda} → USD no está disponible. Ingresalo manualmente.`);
      return;
    }
    setImporting(selected.id);
    setError("");
    const res = await fetch(`/api/presupuestos/${selected.id}/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        indices: selectedItems,
        tipoCambio: tipoCambio ? Number(tipoCambio) : null,
        monedaOrigen: selected.moneda,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Error al importar"); setImporting(null); return; }
    setImportResult(data);
    setImporting(null);
  }

  // --- GENERAR COTIZACIÓN DESDE PRESUPUESTO ---
  async function handleCotizar() {
    if (!selected || !convForm.clienteEmpresa.trim()) {
      setError("El nombre de la empresa cliente es requerido");
      return;
    }
    setConverting(true);
    setError("");
    const res = await fetch(`/api/presupuestos/${selected.id}/cotizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...convForm,
        tipoCambio: tipoCambio ? Number(tipoCambio) : null,
        costosImportacion: costosImportacion.filter(c => c.monto > 0),
        costosNacionalizacion: costosNacionalizacion.filter(c => c.monto > 0),
      }),
    });
    const data = await res.json();
    setConverting(false);
    if (!res.ok) { setError(data.error || "Error al generar cotización"); return; }
    router.push(`/cotizaciones/${data.cotizacionId}`);
  }

  async function handleEliminar(p: Presupuesto) {
    if (!confirm(`¿Eliminar "${p.nombreArchivo}"?`)) return;
    await fetch(`/api/presupuestos/${p.id}`, { method: "DELETE" }).catch(() => {});
    setPresupuestos(ps => ps.filter(x => x.id !== p.id));
    if (selected?.id === p.id) setSelected(null);
  }

  // Items parseados del presupuesto seleccionado
  const items: LineItem[] = selected?.itemsJson ? JSON.parse(selected.itemsJson) : [];
  const cargos: CargoItem[] = selected?.cargosJson ? JSON.parse(selected.cargosJson) : [];
  const moneda = selected?.moneda || "";

  const toggleItem = (i: number) =>
    setSelectedItems(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]);
  const toggleAll = () =>
    setSelectedItems(selectedItems.length === items.length ? [] : items.map((_, i) => i));

  return (
    <>
    <div className="flex gap-5">
      {/* Panel izquierdo — listado de presupuestos */}
      <div className="w-80 shrink-0 space-y-3">
        {/* Botón subir */}
        <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-[#2E86AB] text-[#2E86AB] rounded-xl text-sm font-semibold hover:bg-[#2E86AB]/5 transition-colors">
          {uploading ? (
            <><SpinIcon /> Subiendo...</>
          ) : (
            <><UploadIcon /> Subir PDF de presupuesto</>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}

        {presupuestos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No hay presupuestos subidos</div>
        ) : (
          presupuestos.map(p => (
            <div
              key={p.id}
              onClick={() => p.procesado && handleVer(p)}
              className={`bg-white border rounded-xl p-4 transition-all ${
                selected?.id === p.id ? "border-[#2E86AB] shadow-md" : "border-gray-200 hover:border-gray-300"
              } ${p.procesado ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{p.nombreArchivo}</p>
                  {p.numeroQuote && <p className="text-xs text-[#2E86AB] font-mono mt-0.5">Quote #{p.numeroQuote}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">{fmtDate(p.createdAt)}</p>
                </div>
                <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.procesado ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {p.procesado ? "Analizado" : "Pendiente"}
                </span>
              </div>

              {p.procesado && p.totalFinal != null && (
                <div className="text-sm font-bold text-[#1B2A4A]">{fmtNum(p.totalFinal, p.moneda || "")}</div>
              )}

              <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                {!p.procesado && (
                  <button
                    onClick={() => handleAnalizar(p)}
                    disabled={analyzing === p.id}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#243660] disabled:opacity-60"
                  >
                    {analyzing === p.id ? <><SpinIcon /> Analizando...</> : <><AIIcon /> Analizar con IA</>}
                  </button>
                )}
                {p.procesado && (
                  <button
                    onClick={() => handleAnalizar(p)}
                    disabled={analyzing === p.id}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs py-1.5 border border-[#1B2A4A] text-[#1B2A4A] rounded-lg hover:bg-gray-50 disabled:opacity-60"
                  >
                    {analyzing === p.id ? <><SpinIcon /> Re-analizando...</> : "↺ Re-analizar"}
                  </button>
                )}
                <a href={p.rutaArchivo} target="_blank" className="text-xs px-2.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  PDF
                </a>
                <button onClick={() => handleEliminar(p)} className="text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Panel derecho — detalle del análisis */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <div className="text-5xl mb-3">🤖</div>
            <p className="font-medium text-gray-700">Seleccioná un presupuesto analizado</p>
            <p className="text-sm mt-1">O subí un PDF y hacé clic en "Analizar con IA"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Encabezado del análisis */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AIIcon className="text-[#2E86AB] w-5 h-5" />
                  <h3 className="font-semibold text-gray-900">Resultado del análisis — {selected.nombreArchivo}</h3>
                </div>
                <button
                  onClick={() => { setShowCotizar(true); setError(""); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2A4A] text-white text-sm font-semibold rounded-lg hover:bg-[#243660] transition-colors"
                >
                  <QuoteIcon /> Generar Cotización
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <InfoField label="N° Quote" value={selected.numeroQuote} />
                <InfoField label="Fecha documento" value={fmtDate(selected.fechaDoc)} />
                <InfoField label="Validez oferta" value={fmtDate(selected.validezOferta)} />
                <InfoField label="Moneda" value={selected.moneda} />
                <InfoField label="Incoterm" value={selected.incoterm} />
                <InfoField label="Impuestos" value={selected.impuestos} />
                <InfoField label="Descuentos" value={selected.descuentos} />
                <InfoField label="Cond. de pago" value={selected.condPago} span={2} />
              </div>
            </div>

            {/* Tabla de ítems */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Ítems ({items.length})</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={selectedItems.length === items.length} onChange={toggleAll} className="w-3.5 h-3.5 accent-[#2E86AB]" />
                    Seleccionar todos
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-800 uppercase">
                      <th className="w-8 px-4 py-2.5"></th>
                      <th className="text-left px-4 py-2.5">Cód. Parte</th>
                      <th className="text-left px-4 py-2.5">Descripción</th>
                      <th className="text-right px-4 py-2.5">Cant.</th>
                      <th className="text-right px-4 py-2.5">Precio unit.</th>
                      <th className="text-right px-4 py-2.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedItems.includes(i) ? "bg-blue-50" : ""}`}>
                        <td className="px-4 py-2.5 text-center">
                          <input type="checkbox" checked={selectedItems.includes(i)} onChange={() => toggleItem(i)} className="w-3.5 h-3.5 accent-[#2E86AB]" />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[#2E86AB]">{item.codigoParte || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-900">
                          {item.descripcion}
                          {item.notas && <p className="text-xs text-gray-500 mt-0.5">{item.notas}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-900">{item.cantidad}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-900">{fmtNum(item.precioUnitario, moneda)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">{fmtNum(item.total, moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cargos adicionales */}
                {cargos.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-3 space-y-1">
                    {cargos.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span>{c.nombre}{c.porcentaje ? ` (${c.porcentaje}%)` : ""}</span>
                        <span className="font-mono">{fmtNum(c.monto, moneda)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totales */}
                <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 space-y-1">
                  {selected.subtotal != null && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Subtotal</span>
                      <span className="font-mono">{fmtNum(selected.subtotal, moneda)}</span>
                    </div>
                  )}
                  {selected.totalFinal != null && (
                    <div className="flex justify-between text-base font-bold text-[#1B2A4A]">
                      <span>TOTAL FINAL</span>
                      <span className="font-mono">{fmtNum(selected.totalFinal, moneda)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botón importar */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">

                {/* Tipo de cambio — solo si moneda != USD */}
                {selected.moneda && selected.moneda !== "USD" && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                          💱 Conversión automática — presupuesto en {selected.moneda}
                        </p>
                        {tcCargando ? (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><SpinIcon /> Obteniendo cotización...</p>
                        ) : tcFuente ? (
                          <p className="text-xs text-amber-700 mt-1">
                            Fuente: <span className="font-medium">{tcFuente}</span>
                            {tcFecha && <> · Fecha: <span className="font-medium">{tcFecha}</span></>}
                            {tcEditado && <span className="ml-1 text-amber-800 font-semibold">(modificado manualmente)</span>}
                          </p>
                        ) : null}
                      </div>

                      {/* Input del tipo de cambio */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-amber-900">1 {selected.moneda} =</span>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={tipoCambio}
                          onChange={e => { setTipoCambio(e.target.value); setTcEditado(true); }}
                          className="w-28 border border-amber-300 rounded-lg px-3 py-1.5 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        />
                        <span className="text-sm font-medium text-amber-900">USD</span>
                        {tcEditado && (
                          <button
                            onClick={() => { setTcEditado(false); }}
                            title="El tipo de cambio fue editado manualmente"
                            className="text-xs text-amber-600 hover:text-amber-800 underline"
                          >
                            restablecer
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview de conversión */}
                    {tipoCambio && Number(tipoCambio) > 0 && items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 gap-2 text-xs text-amber-800">
                        {items.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="truncate text-amber-700">{item.descripcion}</span>
                            <span className="font-mono shrink-0">
                              {selected.moneda} {fmtNum(item.precioUnitario, "")} → <span className="font-bold text-green-700">USD {fmtNum(item.precioUnitario * Number(tipoCambio), "")}</span>
                            </span>
                          </div>
                        ))}
                        {items.length > 3 && <p className="text-amber-600 col-span-2">+ {items.length - 3} ítems más...</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Importar al catálogo de productos</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedItems.length === 0
                        ? "Seleccioná los ítems que querés importar"
                        : `${selectedItems.length} ítem(s) seleccionado(s)`}
                    </p>
                  </div>
                  <button
                    onClick={handleImportar}
                    disabled={selectedItems.length === 0 || importing === selected.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {importing === selected.id ? <><SpinIcon /> Importando...</> : <><ImportIcon /> Importar seleccionados</>}
                  </button>
                </div>

                {importResult && (
                  <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${importResult.importados > 0 ? "bg-green-50 border border-green-200 text-green-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
                    <p className="font-semibold">
                      ✓ {importResult.importados} producto(s) importado(s)
                      {importResult.omitidos > 0 && `, ${importResult.omitidos} omitido(s) (ya existían)`}
                    </p>
                    {importResult.tipoCambioUsado && (
                      <p className="text-xs mt-1 font-medium">
                        💱 Tipo de cambio aplicado: {importResult.tipoCambioUsado} USD/{importResult.monedaOrigen}
                      </p>
                    )}
                    {importResult.detalle?.creados?.length > 0 && (
                      <p className="text-xs mt-1">Creados: {importResult.detalle.creados.join(", ")}</p>
                    )}
                    {importResult.detalle?.omitidos?.length > 0 && (
                      <p className="text-xs mt-1">Ya existían: {importResult.detalle.omitidos.join(", ")}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ===== MODAL GENERAR COTIZACIÓN ===== */}
    {showCotizar && selected && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCotizar(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <QuoteIcon className="text-[#1B2A4A] w-5 h-5" />
              <h2 className="text-lg font-bold text-gray-900">Generar Cotización</h2>
            </div>
            <button onClick={() => setShowCotizar(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Origen */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
              <p className="font-medium">Presupuesto origen: {selected.nombreArchivo}</p>
              <p className="text-xs mt-0.5 text-blue-600">
                {items.length} ítems · {cargos.length} cargos
                {selected.moneda !== "USD" && tipoCambio ? ` · TC: 1 ${selected.moneda} = ${tipoCambio} USD` : ""}
              </p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

            {/* Datos del cliente */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Datos del cliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Empresa cliente *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.clienteEmpresa} onChange={e => setConvForm(f => ({ ...f, clienteEmpresa: e.target.value }))} placeholder="Nombre de la empresa" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CUIT</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.clienteCuit} onChange={e => setConvForm(f => ({ ...f, clienteCuit: e.target.value }))} placeholder="30-XXXXXXXX-X" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.clienteTelefono} onChange={e => setConvForm(f => ({ ...f, clienteTelefono: e.target.value }))} placeholder="+54 11 XXXX-XXXX" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.clienteContacto} onChange={e => setConvForm(f => ({ ...f, clienteContacto: e.target.value }))} placeholder="Nombre y apellido" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cargo</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.clienteCargo} onChange={e => setConvForm(f => ({ ...f, clienteCargo: e.target.value }))} placeholder="Cargo del contacto" />
                </div>
              </div>
            </div>

            {/* Ajustes financieros */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Ajustes financieros</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Markup / Margen (%)</label>
                  <input type="number" min="0" max="200" step="0.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.markup} onChange={e => setConvForm(f => ({ ...f, markup: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">IVA (%)</label>
                  <input type="number" min="0" step="0.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" value={convForm.iva} onChange={e => setConvForm(f => ({ ...f, iva: Number(e.target.value) }))} />
                </div>
              </div>
            </div>

            {/* Costos de importación */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Costos de importación</h3>
                <button onClick={() => setCostosImportacion(cs => [...cs, { nombre: "", monto: 0 }])} className="text-xs text-[#2E86AB] hover:underline">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {costosImportacion.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" placeholder="Descripción (ej: Gastos de aduana)" value={c.nombre} onChange={e => { const n = [...costosImportacion]; n[i] = { ...n[i], nombre: e.target.value }; setCostosImportacion(n); }} />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">USD</span>
                      <input type="number" min="0" step="0.01" className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" value={c.monto || ""} placeholder="0" onChange={e => { const n = [...costosImportacion]; n[i] = { ...n[i], monto: Number(e.target.value) }; setCostosImportacion(n); }} />
                    </div>
                    <button onClick={() => setCostosImportacion(cs => cs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Costos de nacionalización */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Costos de nacionalización</h3>
                <button onClick={() => setCostosNacionalizacion(cs => [...cs, { nombre: "", monto: 0 }])} className="text-xs text-[#2E86AB] hover:underline">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {costosNacionalizacion.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" placeholder="Descripción (ej: Honorarios despachante)" value={c.nombre} onChange={e => { const n = [...costosNacionalizacion]; n[i] = { ...n[i], nombre: e.target.value }; setCostosNacionalizacion(n); }} />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">USD</span>
                      <input type="number" min="0" step="0.01" className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" value={c.monto || ""} placeholder="0" onChange={e => { const n = [...costosNacionalizacion]; n[i] = { ...n[i], monto: Number(e.target.value) }; setCostosNacionalizacion(n); }} />
                    </div>
                    <button onClick={() => setCostosNacionalizacion(cs => cs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview estimado */}
            {items.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-gray-900 mb-2">Resumen estimado</p>
                {(() => {
                  const tc2 = tipoCambio ? Number(tipoCambio) : 1;
                  const subOT = items.reduce((s, i) => s + i.precioUnitario * i.cantidad * tc2, 0);
                  const subEnv = cargos.reduce((s, c) => s + c.monto * tc2, 0);
                  const subImp = costosImportacion.reduce((s, c) => s + (c.monto || 0), 0);
                  const subNac = costosNacionalizacion.reduce((s, c) => s + (c.monto || 0), 0);
                  const subTotal = subOT + subEnv + subImp + subNac;
                  const markupAmt = subTotal * (convForm.markup / 100);
                  const conMarkup = subTotal + markupAmt;
                  const ivaAmt2 = conMarkup * (convForm.iva / 100);
                  const total = conMarkup + ivaAmt2;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-gray-700"><span>Subtotal productos</span><span className="font-mono">USD {fmtNum(subOT, "")}</span></div>
                      {subEnv > 0 && <div className="flex justify-between text-gray-700"><span>Cargos proveedor (envío)</span><span className="font-mono">USD {fmtNum(subEnv, "")}</span></div>}
                      {subImp > 0 && <div className="flex justify-between text-gray-700"><span>Costos importación</span><span className="font-mono">USD {fmtNum(subImp, "")}</span></div>}
                      {subNac > 0 && <div className="flex justify-between text-gray-700"><span>Costos nacionalización</span><span className="font-mono">USD {fmtNum(subNac, "")}</span></div>}
                      <div className="flex justify-between text-gray-700"><span>Markup ({convForm.markup}%)</span><span className="font-mono">USD {fmtNum(markupAmt, "")}</span></div>
                      <div className="flex justify-between text-gray-700"><span>IVA ({convForm.iva}%)</span><span className="font-mono">USD {fmtNum(ivaAmt2, "")}</span></div>
                      <div className="flex justify-between font-bold text-[#1B2A4A] text-base pt-2 border-t border-gray-300 mt-2">
                        <span>TOTAL ESTIMADO</span><span className="font-mono">USD {fmtNum(total, "")}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleCotizar}
              disabled={converting || !convForm.clienteEmpresa.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-[#1B2A4A] text-white text-sm font-semibold rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors"
            >
              {converting ? <><SpinIcon /> Generando borrador...</> : <><QuoteIcon /> Crear borrador de cotización</>}
            </button>
            <button onClick={() => setShowCotizar(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function InfoField({ label, value, span = 1 }: { label: string; value?: string | null; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

function UploadIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
}
function AIIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function SpinIcon() {
  return <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}
function ImportIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function QuoteIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
