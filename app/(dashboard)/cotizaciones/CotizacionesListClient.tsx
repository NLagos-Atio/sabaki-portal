"use client";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CotizacionesActions } from "./CotizacionesActions";
import { CotizacionSimpleActions } from "./CotizacionSimpleActions";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Propuesta {
  id: string;
  numero: string;
  clienteEmpresa: string;
  fecha: Date | string;
  totalOnetimeUsd: number;
  totalRecurrenteUsd: number;
  estado: string;
  moneda: string;
  profileSlot: number;
  userId: string;
  user: { name: string };
}
interface Simple {
  id: string;
  numero: string;
  titulo: string;
  clienteEmpresa: string;
  fecha: Date | string;
  total: number;
  estado: string;
  moneda: string;
  profileSlot: number;
  userId: string;
  user: { name: string };
}
interface Props {
  propuestas: Propuesta[];
  simples: Simple[];
  profileNombre1: string;
  profileNombre2: string;
  sessionUserId: string;
  sessionRole: string;
}

type SortKey = "fecha" | "cliente" | "tipo" | "usuario" | "total";
type SortDir = "asc" | "desc";
type TipoFiltro = "todos" | "propuesta" | "simple";

// ── Helpers ──────────────────────────────────────────────────────────────────
const estadoDot: Record<string, string> = {
  borrador:  "bg-gray-400",
  enviada:   "bg-blue-500",
  aprobada:  "bg-green-500",
  rechazada: "bg-red-500",
};

function fmt2(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(n);
}

// ── Componente ───────────────────────────────────────────────────────────────
export function CotizacionesListClient({ propuestas, simples, profileNombre1, profileNombre2, sessionUserId, sessionRole }: Props) {
  const [search, setSearch]       = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [sortKey, setSortKey]     = useState<SortKey>("fecha");
  const [sortDir, setSortDir]     = useState<SortDir>("desc");

  const profileLabel = (slot: number) => {
    const nombre = slot === 2 ? profileNombre2 : profileNombre1;
    return nombre ? `Perfil ${slot} — ${nombre}` : `Perfil ${slot}`;
  };

  // Unificar filas
  function canDelete(ownerId: string) {
    if (sessionRole !== "user") return true;
    return ownerId === sessionUserId;
  }

  type Row =
    | { tipo: "propuesta"; key: string; fecha: Date; cliente: string; usuario: string; total: number; data: Propuesta }
    | { tipo: "simple";    key: string; fecha: Date; cliente: string; usuario: string; total: number; data: Simple };

  const allRows: Row[] = useMemo(() => {
    const p: Row[] = propuestas.map((d) => ({
      tipo: "propuesta" as const,
      key: `prop-${d.id}`,
      fecha: new Date(d.fecha),
      cliente: d.clienteEmpresa,
      usuario: d.user.name,
      total: d.totalOnetimeUsd,
      data: d,
    }));
    const s: Row[] = simples.map((d) => ({
      tipo: "simple" as const,
      key: `simple-${d.id}`,
      fecha: new Date(d.fecha),
      cliente: d.clienteEmpresa,
      usuario: d.user.name,
      total: d.total,
      data: d,
    }));
    return [...p, ...s];
  }, [propuestas, simples]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows
      .filter((r) => tipoFiltro === "todos" || r.tipo === tipoFiltro)
      .filter((r) => {
        if (!q) return true;
        return (
          r.data.numero.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.usuario.toLowerCase().includes(q) ||
          r.data.estado.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "fecha")   cmp = a.fecha.getTime() - b.fecha.getTime();
        if (sortKey === "cliente") cmp = a.cliente.localeCompare(b.cliente);
        if (sortKey === "tipo")    cmp = a.tipo.localeCompare(b.tipo);
        if (sortKey === "usuario") cmp = a.usuario.localeCompare(b.usuario);
        if (sortKey === "total")   cmp = a.total - b.total;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [allRows, search, tipoFiltro, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#2E86AB] ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function ThSort({ col, label, align = "left" }: { col: SortKey; label: string; align?: "left" | "right" }) {
    return (
      <th
        className={`px-5 py-3.5 font-semibold text-gray-800 cursor-pointer select-none hover:text-[#1B2A4A] whitespace-nowrap text-${align}`}
        onClick={() => toggleSort(col)}
      >
        {label}<SortIcon col={col} />
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Barra de herramientas ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por N°, cliente, usuario, estado…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >✕</button>
          )}
        </div>

        {/* Filtro por tipo */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {(["todos", "propuesta", "simple"] as TipoFiltro[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`px-3 py-2 font-medium capitalize transition-colors ${
                tipoFiltro === t
                  ? "bg-[#1B2A4A] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "todos" ? "Todos" : t === "propuesta" ? "Propuestas" : "Cotizaciones"}
            </button>
          ))}
        </div>

        {/* Contador */}
        <span className="text-sm text-gray-500 ml-auto">
          {filtered.length} de {allRows.length}
        </span>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <ThSort col="tipo"    label="Tipo" />
              <th className="text-left px-5 py-3.5 font-semibold text-gray-800">N° Documento</th>
              <ThSort col="cliente" label="Cliente" />
              <ThSort col="usuario" label="Usuario" />
              <ThSort col="fecha"   label="Fecha" />
              <ThSort col="total"   label="Total" align="right" />
              <th className="text-right px-5 py-3.5 font-semibold text-gray-800">Recurrente</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-800">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  {allRows.length === 0
                    ? "No hay cotizaciones todavía. ¡Creá la primera!"
                    : "No se encontraron resultados para la búsqueda."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                if (row.tipo === "propuesta") {
                  const c = row.data;
                  return (
                    <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${estadoDot[c.estado] || estadoDot.borrador}`} title={c.estado} />
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            Propuesta
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#1B2A4A]">
                        {c.numero}
                        <div className="text-xs text-gray-400 mt-0.5">{profileLabel(c.profileSlot)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-800">{c.clienteEmpresa}</td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{c.user.name}</td>
                      <td className="px-5 py-3.5 text-gray-800 whitespace-nowrap">
                        {format(row.fecha, "dd/MM/yyyy", { locale: es })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono">
                        USD {fmt2(c.totalOnetimeUsd)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[#2E86AB]">
                        {c.totalRecurrenteUsd > 0 ? `USD ${fmt2(c.totalRecurrenteUsd)}/mes` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <CotizacionesActions id={c.id} numero={c.numero} estado={c.estado} canDelete={canDelete(c.userId)} />
                      </td>
                    </tr>
                  );
                }

                // simple
                const c = row.data;
                return (
                  <tr key={row.key} className="border-b border-gray-100 hover:bg-amber-50/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${estadoDot[c.estado] || estadoDot.borrador}`} title={c.estado} />
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Cotización
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#1B2A4A]">{c.numero}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[160px]">{c.titulo} · {profileLabel(c.profileSlot)}</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-800">{c.clienteEmpresa}</td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{c.user.name}</td>
                    <td className="px-5 py-3.5 text-gray-800 whitespace-nowrap">
                      {format(row.fecha, "dd/MM/yyyy", { locale: es })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      USD {fmt2(c.total)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-400">—</td>
                    <td className="px-5 py-3.5 text-right">
                      <CotizacionSimpleActions id={c.id} numero={c.numero} estado={c.estado} canDelete={canDelete(c.userId)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
