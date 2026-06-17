"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Proveedor {
  id: string;
  nombre: string;
  pais: string | null;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  _count: { presupuestos: number };
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export function ProveedoresClient({ proveedores: initial, userRole = "user" }: { proveedores: Proveedor[]; userRole?: string }) {
  const router = useRouter();
  const [proveedores, setProveedores] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", pais: "", contacto: "", email: "", telefono: "", notas: "" });

  function openNew() {
    setEditing(null);
    setForm({ nombre: "", pais: "", contacto: "", email: "", telefono: "", notas: "" });
    setShowForm(true);
  }

  function openEdit(p: Proveedor) {
    setEditing(p);
    setForm({ nombre: p.nombre, pais: p.pais || "", contacto: p.contacto || "", email: p.email || "", telefono: p.telefono || "", notas: p.notas || "" });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const url = editing ? `/api/proveedores/${editing.id}` : "/api/proveedores";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (editing) {
      setProveedores(ps => ps.map(p => p.id === editing.id ? { ...data, _count: p._count } : p));
    } else {
      setProveedores(ps => [...ps, { ...data, _count: { presupuestos: 0 } }]);
    }
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(p: Proveedor) {
    if (!confirm(`¿Eliminar proveedor "${p.nombre}"? Se eliminarán todos sus presupuestos.`)) return;
    await fetch(`/api/proveedores/${p.id}`, { method: "DELETE" });
    setProveedores(ps => ps.filter(x => x.id !== p.id));
  }

  return (
    <>
      {/* Barra superior */}
      <div className="flex justify-end mb-4">
        <button onClick={openNew} className="bg-[#1B2A4A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660]">
          + Nuevo proveedor
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nombre *</label>
              <input className={inputCls} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: FAFNIR GmbH" />
            </div>
            <div>
              <label className={labelCls}>País</label>
              <input className={inputCls} value={form.pais} onChange={e => setForm({ ...form, pais: e.target.value })} placeholder="Ej: Alemania" />
            </div>
            <div>
              <label className={labelCls}>Contacto</label>
              <input className={inputCls} value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contacto@proveedor.com" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+49 40 123456" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notas</label>
              <textarea rows={2} className={inputCls} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones internas..." />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-[#1B2A4A] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {proveedores.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🏭</div>
          <p className="text-gray-700 font-medium">No hay proveedores todavía</p>
          <p className="text-sm text-gray-500 mt-1">Creá el primero para empezar a subir presupuestos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Proveedor</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-800">País</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Contacto</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Email</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-800">Presupuestos</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-800">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-semibold text-[#1B2A4A]">{p.nombre}</td>
                  <td className="px-5 py-3.5 text-gray-800">{p.pais || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-800">{p.contacto || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-800">{p.email || "—"}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="bg-[#2E86AB]/10 text-[#2E86AB] font-semibold text-xs px-2.5 py-1 rounded-full">
                      {p._count.presupuestos}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right flex gap-2 justify-end">
                    <Link href={`/proveedores/${p.id}`} className="text-xs px-3 py-1.5 bg-[#2E86AB] text-white rounded-lg hover:bg-[#247494]">
                      Ver presupuestos
                    </Link>
                    <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Editar
                    </button>
                    {userRole !== "user" && (
                      <button onClick={() => handleDelete(p)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
