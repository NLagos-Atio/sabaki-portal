"use client";
import { useState } from "react";

interface Condicion { label: string; valor: string; orden: number }

type Profile = {
  id?: string;
  slot: number;
  nombre: string;
  cuit: string;
  condicionIva: string;
  direccion: string;
  contactoNombre: string;
  contactoCargo: string;
  logoPath?: string | null;
  colorPrimario: string;
  colorSecundario: string;
  notasDefault?: string | null;
  condicionesSimpleDefault?: string | null;
} | null;

const CONDICIONES_SIMPLE_DEFAULT: Condicion[] = [
  { label: "Precios:",          valor: "Los precios indicados son en USD y NO incluyen IVA (21%). El IVA se facturará por separado según la condición impositiva del comprador.", orden: 0 },
  { label: "Pago:",             valor: "100% contra entrega.",                                               orden: 1 },
  { label: "Plazo de entrega:", valor: "8 a 10 semanas desde confirmación de orden de compra.",              orden: 2 },
  { label: "Garantía:",         valor: "12 meses por defectos de fabricación.",                              orden: 3 },
  { label: "Entrega",           valor: "",                                                                    orden: 4 },
  { label: "Validez:",          valor: "30 días.",                                                           orden: 5 },
];

export function CompanyProfileForm({ slot, profile }: { slot: 1 | 2; profile: Profile }) {
  // Parsear condiciones guardadas o usar defaults
  const parsedConds: Condicion[] = (() => {
    if (!profile?.condicionesSimpleDefault) return CONDICIONES_SIMPLE_DEFAULT;
    try {
      const p = JSON.parse(profile.condicionesSimpleDefault);
      return Array.isArray(p) && p.length > 0 ? p : CONDICIONES_SIMPLE_DEFAULT;
    } catch { return CONDICIONES_SIMPLE_DEFAULT; }
  })();

  const [form, setForm] = useState({
    nombre: profile?.nombre || "",
    cuit: profile?.cuit || "",
    condicionIva: profile?.condicionIva || "Responsable Inscripto",
    direccion: profile?.direccion || "",
    colorPrimario: profile?.colorPrimario || "#1B2A4A",
    colorSecundario: profile?.colorSecundario || "#2E86AB",
    notasDefault: profile?.notasDefault || "",
    logoPath: profile?.logoPath || "",
  });

  const [condSimple, setCondSimple] = useState<Condicion[]>(parsedConds);

  function addCond() {
    setCondSimple((cs) => [...cs, { label: "", valor: "", orden: cs.length }]);
  }
  function updateCond(idx: number, key: keyof Condicion, value: string) {
    setCondSimple((cs) => { const n = [...cs]; n[idx] = { ...n[idx], [key]: value }; return n; });
  }
  function removeCond(idx: number) {
    setCondSimple((cs) => cs.filter((_, i) => i !== idx));
  }
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", String(slot));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setForm((f) => ({ ...f, logoPath: data.path }));
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    await fetch("/api/company-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot,
        ...form,
        condicionesSimpleDefault: JSON.stringify(condSimple),
      }),
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {!profile && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Este perfil aún no está configurado. Completá los datos y guardá para activarlo.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Datos de la Empresa</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Nombre de la empresa *</label>
            <input className={inputCls} required value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>CUIT</label>
            <input className={inputCls} value={form.cuit} onChange={(e) => setField("cuit", e.target.value)} placeholder="30-XXXXXXXX-X" />
          </div>
          <div>
            <label className={labelCls}>Condición IVA</label>
            <select className={inputCls} value={form.condicionIva} onChange={(e) => setField("condicionIva", e.target.value)}>
              <option>Responsable Inscripto</option>
              <option>Monotributista</option>
              <option>Exento</option>
              <option>No Responsable</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Dirección</label>
            <input className={inputCls} value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          El contacto comercial (nombre y cargo) ya no se configura aquí — se completa automáticamente con los datos del usuario que crea cada cotización, y queda editable por documento.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Logo & Colores Corporativos</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Logo de la empresa</label>
            <div className="flex items-center gap-4">
              {/* Botón estilizado que dispara el input oculto */}
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B2A4A] text-white text-sm font-semibold rounded-lg hover:bg-[#243660] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? "Subiendo..." : "Subir logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {/* Preview del logo actual */}
              {form.logoPath ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logoPath}
                    alt="Logo actual"
                    className="h-10 max-w-[120px] object-contain border border-gray-200 rounded-lg p-1 bg-gray-50"
                  />
                  <div>
                    <p className="text-xs font-medium text-green-700">✓ Logo cargado</p>
                    <p className="text-xs text-gray-500 truncate max-w-[160px]">{form.logoPath.split("/").pop()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Sin logo cargado · PNG, JPG o SVG recomendado</p>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Color primario</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={form.colorPrimario} onChange={(e) => setField("colorPrimario", e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
              <input className={`${inputCls} flex-1`} value={form.colorPrimario} onChange={(e) => setField("colorPrimario", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Color secundario</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={form.colorSecundario} onChange={(e) => setField("colorSecundario", e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
              <input className={`${inputCls} flex-1`} value={form.colorSecundario} onChange={(e) => setField("colorSecundario", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Notas por Defecto</h2>
        <p className="text-xs text-gray-700 mb-2">Estas notas se usarán como valor inicial en todas las cotizaciones nuevas emitidas con este perfil.</p>
        <textarea
          rows={6}
          className={inputCls}
          value={form.notasDefault}
          onChange={(e) => setField("notasDefault", e.target.value)}
          placeholder="Una condición por línea..."
        />
      </div>

      {/* Condiciones por defecto — Cotización Simple */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Condiciones por defecto — Cotización Simple</h2>
            <p className="text-xs text-gray-500 mt-0.5">Se precargarán en cada nueva Cotización Simple emitida con este perfil. Editables por documento.</p>
          </div>
          <button type="button" onClick={addCond} className="text-xs text-[#2E86AB] hover:underline font-medium">+ Agregar fila</button>
        </div>
        <div className="space-y-2">
          {condSimple.map((c, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                className={`${inputCls} w-40 font-medium text-[#2E86AB]`}
                value={c.label}
                onChange={(e) => updateCond(idx, "label", e.target.value)}
                placeholder="Etiqueta"
              />
              <textarea
                rows={2}
                className={`${inputCls} flex-1 resize-none`}
                value={c.valor}
                onChange={(e) => updateCond(idx, "valor", e.target.value)}
                placeholder="Texto de la condición"
              />
              <button type="button" onClick={() => removeCond(idx)} className="text-red-400 hover:text-red-600 text-xs mt-2">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="bg-[#1B2A4A] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660] disabled:opacity-60">
          {saving ? "Guardando..." : `Guardar Perfil ${slot}`}
        </button>
        {success && <span className="text-green-600 text-sm">✓ Configuración guardada</span>}
      </div>
    </form>
  );
}
