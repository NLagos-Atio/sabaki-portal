"use client";
import { useState, useMemo } from "react";
import { formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  fabricante: string | null;
  precioUsd: number;
  precioUsdFabricante: number | null;
  numeroParte: string | null;
  ultimaActPrecio: string | null;
  categoria: string;
  activo: boolean;
  updatedByNombre: string | null;
  createdAt: string;
  updatedAt: string;
}

type SortField = "nombre" | "categoria" | "precioUsd" | "fabricante";
type SortDir = "asc" | "desc";

const CATEGORIAS = ["Hardware", "Software", "Servicio", "Recurrente", "Repuesto"];

const catColors: Record<string, string> = {
  Hardware:   "bg-blue-100 text-blue-700",
  Software:   "bg-purple-100 text-purple-700",
  Servicio:   "bg-green-100 text-green-700",
  Recurrente: "bg-orange-100 text-orange-700",
  Repuesto:   "bg-rose-100 text-rose-700",
};

export function ProductosClient({ productos: initial }: { productos: Producto[] }) {
  const [productos, setProductos] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [infoProducto, setInfoProducto] = useState<Producto | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    fabricante: "",
    precioUsd: 0,
    precioUsdFabricante: "",
    numeroParte: "",
    ultimaActPrecio: "",
    categoria: "Hardware",
  });
  const [saving, setSaving] = useState(false);

  // Búsqueda y ordenamiento
  const [busqueda, setBusqueda] = useState("");
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return [...productos]
      .filter((p) =>
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion || "").toLowerCase().includes(q) ||
        (p.fabricante || "").toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        (p.numeroParte || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "nombre") cmp = a.nombre.localeCompare(b.nombre);
        else if (sortField === "categoria") cmp = a.categoria.localeCompare(b.categoria);
        else if (sortField === "precioUsd") cmp = a.precioUsd - b.precioUsd;
        else if (sortField === "fabricante") cmp = (a.fabricante || "").localeCompare(b.fabricante || "");
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [productos, busqueda, sortField, sortDir]);

  function openNew() {
    setEditing(null);
    setForm({ nombre: "", descripcion: "", fabricante: "", precioUsd: 0, precioUsdFabricante: "", numeroParte: "", ultimaActPrecio: "", categoria: "Hardware" });
    setShowForm(true);
  }

  function openEdit(p: Producto) {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      fabricante: p.fabricante || "",
      precioUsd: p.precioUsd,
      precioUsdFabricante: p.precioUsdFabricante != null ? String(p.precioUsdFabricante) : "",
      numeroParte: p.numeroParte || "",
      ultimaActPrecio: p.ultimaActPrecio ? new Date(p.ultimaActPrecio).toISOString().split("T")[0] : "",
      categoria: p.categoria,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.descripcion.trim()) {
      alert("La descripción es obligatoria.");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/productos/${editing.id}` : "/api/productos";
    const method = editing ? "PUT" : "POST";
    const payload = {
      ...form,
      activo: true,
      precioUsd: Number(form.precioUsd),
      fabricante: form.fabricante || null,
      precioUsdFabricante: form.precioUsdFabricante !== "" ? Number(form.precioUsdFabricante) : null,
      numeroParte: form.numeroParte || null,
      ultimaActPrecio: form.ultimaActPrecio ? new Date(form.ultimaActPrecio).toISOString() : null,
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (editing) {
      setProductos((ps) => ps.map((p) => (p.id === editing.id ? data : p)));
    } else {
      setProductos((ps) => [...ps, data]);
    }
    setShowForm(false);
    setSaving(false);
  }

  async function toggleActivo(p: Producto) {
    await fetch(`/api/productos/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !p.activo }) });
    setProductos((ps) => ps.map((x) => (x.id === p.id ? { ...x, activo: !x.activo } : x)));
  }

  async function handleDelete(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    setProductos((ps) => ps.filter((x) => x.id !== p.id));
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-gray-400">↕</span>;
    return <span className="ml-1 text-[#2E86AB]">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function fmtDate(d: string | null) {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: es }); } catch { return "—"; }
  }

  return (
    <>
      {/* Barra superior */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, categoría, N° parte..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs">✕</button>
          )}
        </div>
        <span className="text-sm text-gray-700">{productosFiltrados.length} de {productos.length}</span>
        <button onClick={openNew} className="ml-auto bg-[#1B2A4A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660]">
          + Nuevo producto
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Editar producto" : "Nuevo producto"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
              <input required className={inputCls} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante</label>
              <input className={inputCls} value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} placeholder="Ej: FAFNIR GmbH" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio USD (venta) *</label>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.precioUsd} onChange={(e) => setForm({ ...form, precioUsd: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio USD fabricante</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="Opcional" value={form.precioUsdFabricante} onChange={(e) => setForm({ ...form, precioUsdFabricante: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de parte</label>
              <input className={inputCls} placeholder="Ej: ATG-CTL-001" value={form.numeroParte} onChange={(e) => setForm({ ...form, numeroParte: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Última actualización de precio</label>
              <input type="date" className={inputCls} value={form.ultimaActPrecio} onChange={(e) => setForm({ ...form, ultimaActPrecio: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-[#1B2A4A] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800 cursor-pointer hover:text-[#2E86AB] select-none" onClick={() => handleSort("nombre")}>
                Nombre <SortIcon field="nombre" />
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Descripción</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800 cursor-pointer hover:text-[#2E86AB] select-none" onClick={() => handleSort("fabricante")}>
                Fabricante <SortIcon field="fabricante" />
              </th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-800 cursor-pointer hover:text-[#2E86AB] select-none" onClick={() => handleSort("categoria")}>
                Categoría <SortIcon field="categoria" />
              </th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-800 cursor-pointer hover:text-[#2E86AB] select-none" onClick={() => handleSort("precioUsd")}>
                Precio USD <SortIcon field="precioUsd" />
              </th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-800">Activo</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-800">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-700">
                  {busqueda ? `No se encontraron productos para "${busqueda}"` : "No hay productos todavía."}
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!p.activo ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-5 py-3.5 text-gray-700 text-xs max-w-xs truncate">{p.descripcion || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-800 text-sm">{p.fabricante || "—"}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${catColors[p.categoria] || "bg-gray-100 text-gray-700"}`}>
                      {p.categoria}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-gray-900">USD {formatNumber(p.precioUsd)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => toggleActivo(p)} className={`w-10 h-5 rounded-full transition-colors ${p.activo ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${p.activo ? "translate-x-5" : ""}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button onClick={() => setInfoProducto(p)} title="Ver info" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#2E86AB] hover:bg-[#2E86AB]/10 transition-colors">
                        <InfoIcon />
                      </button>
                      <button onClick={() => openEdit(p)} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                        <PencilIcon />
                      </button>
                      <button onClick={() => handleDelete(p)} title="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Info */}
      {infoProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInfoProducto(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            {/* Header modal */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{infoProducto.nombre}</h2>
                <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${catColors[infoProducto.categoria] || "bg-gray-100 text-gray-700"}`}>
                  {infoProducto.categoria}
                </span>
              </div>
              <button onClick={() => setInfoProducto(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            {/* Campos */}
            <div className="space-y-3 text-sm">
              <Row label="Descripción" value={infoProducto.descripcion || "—"} />
              <Row label="Fabricante" value={infoProducto.fabricante || "—"} />
              <div className="border-t border-gray-100 pt-3">
                <Row label="Precio USD (venta)" value={`USD ${formatNumber(infoProducto.precioUsd)}`} highlight />
                <Row label="Precio USD fabricante" value={infoProducto.precioUsdFabricante != null ? `USD ${formatNumber(infoProducto.precioUsdFabricante)}` : "—"} />
                {infoProducto.precioUsdFabricante != null && infoProducto.precioUsdFabricante > 0 && (
                  <Row
                    label="Margen estimado"
                    value={`${(((infoProducto.precioUsd - infoProducto.precioUsdFabricante) / infoProducto.precioUsdFabricante) * 100).toFixed(1)}%`}
                  />
                )}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <Row label="Número de parte" value={infoProducto.numeroParte || "—"} />
                <Row label="Última actualización de precio" value={fmtDate(infoProducto.ultimaActPrecio)} />
              </div>
              <div className="border-t border-gray-100 pt-3">
                <Row label="Estado" value={infoProducto.activo ? "✅ Activo" : "⛔ Inactivo"} />
                <Row label="Creado" value={fmtDate(infoProducto.createdAt)} />
                <Row label="Última modificación" value={fmtDate(infoProducto.updatedAt)} />
                <Row label="Actualizado por" value={infoProducto.updatedByNombre || "—"} />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setInfoProducto(null); openEdit(infoProducto); }}
                className="flex-1 bg-[#1B2A4A] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#243660]"
              >
                Editar
              </button>
              <button onClick={() => setInfoProducto(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${highlight ? "text-[#1B2A4A] text-base" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}
