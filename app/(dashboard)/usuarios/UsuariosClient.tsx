"use client";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  cargo?: string | null;
  active: boolean;
  createdAt: Date | string;
}

export function UsuariosClient({ usuarios: initial }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", cargo: "" });
  const [saving, setSaving] = useState(false);

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", role: "user", cargo: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setUsuarios((us) => [...us, data]);
    setShowForm(false);
    setForm({ name: "", email: "", password: "", role: "user", cargo: "" });
    setSaving(false);
  }

  async function toggleActivo(u: Usuario) {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    const data = await res.json();
    setUsuarios((us) => us.map((x) => (x.id === u.id ? { ...x, active: data.active } : x)));
  }

  function openEdit(u: Usuario) {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, password: "", role: u.role, cargo: u.cargo || "" });
    setEditError("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    setEditError("");

    const payload: Record<string, any> = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      cargo: editForm.cargo,
    };
    if (editForm.password) payload.password = editForm.password;

    const res = await fetch(`/api/usuarios/${editingUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setEditSaving(false);

    if (!res.ok) {
      setEditError(data.error || "Error al guardar");
      return;
    }

    setUsuarios((us) => us.map((x) => (x.id === editingUser.id ? { ...x, ...data } : x)));
    setEditingUser(null);
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)} className="bg-[#1B2A4A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660]">
          + Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4">Nuevo usuario</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className={inputCls} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <input className={inputCls} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ej: Gerente Comercial" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <input type="password" className={inputCls} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-[#1B2A4A] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? "Creando..." : "Crear usuario"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Nombre</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Email</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Cargo</th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-800">Rol</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800">Creado</th>
              <th className="text-center px-5 py-3.5 font-semibold text-gray-800">Activo</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-800">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!u.active ? "opacity-50" : ""}`}>
                <td className="px-5 py-3.5 font-medium">{u.name}</td>
                <td className="px-5 py-3.5 text-gray-800">{u.email}</td>
                <td className="px-5 py-3.5 text-gray-600">{u.cargo || "—"}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-700 text-xs">
                  {format(new Date(u.createdAt), "dd/MM/yyyy", { locale: es })}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => toggleActivo(u)}
                    className={`w-10 h-5 rounded-full transition-colors ${u.active ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${u.active ? "translate-x-5" : ""}`} />
                  </button>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => openEdit(u)}
                    className="text-xs px-3 py-1.5 border border-[#2E86AB] text-[#2E86AB] rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingUser(null)}>
          <form
            onSubmit={handleEditSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Editar usuario</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className={inputCls} required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" className={inputCls} required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input className={inputCls} value={editForm.cargo} onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })} placeholder="Ej: Gerente Comercial" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select className={inputCls} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  className={inputCls}
                  minLength={6}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Dejar en blanco para no cambiarla"
                />
              </div>
            </div>

            {editError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                {editError}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={editSaving} className="bg-[#1B2A4A] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button type="button" onClick={() => setEditingUser(null)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
