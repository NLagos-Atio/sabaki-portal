"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatNumber } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  fabricante: string | null;
  numeroParte: string | null;
  precioUsd: number;
  precioUsdFabricante: number | null;
  categoria: string;
}

interface Props {
  categorias: string[];
  tipoLabel: string;
  onSelectMultiple: (products: Producto[]) => void;
  onClose: () => void;
}

const catColors: Record<string, string> = {
  Hardware:   "bg-blue-100 text-blue-700",
  Software:   "bg-purple-100 text-purple-700",
  Servicio:   "bg-green-100 text-green-700",
  Recurrente: "bg-orange-100 text-orange-700",
};

export function CatalogModal({ categorias, tipoLabel, onSelectMultiple, onClose }: Props) {
  const [query, setQuery]         = useState("");
  const [page, setPage]           = useState(1);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [isFrecuentes, setIsFrecuentes] = useState(true);

  // Mapa de seleccionados: persiste al paginar
  const [selectedMap, setSelectedMap] = useState<Map<string, Producto>>(new Map());

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProductos = useCallback(async (q: string, p: number, freq: boolean) => {
    setLoading(true);
    const cats = categorias.join(",");
    const params = new URLSearchParams({
      q, page: String(p),
      categorias: cats,
      ...(freq && !q ? { frecuentes: "1" } : {}),
    });
    try {
      const res  = await fetch(`/api/productos/search?${params}`);
      const data = await res.json();
      setProductos(data.productos || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
      setIsFrecuentes(!!data.frecuentes);
    } finally {
      setLoading(false);
    }
  }, [categorias]);

  useEffect(() => {
    fetchProductos("", 1, true);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [fetchProductos]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchProductos(query, 1, !query);
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchProductos]);

  function handlePage(p: number) {
    setPage(p);
    fetchProductos(query, p, false);
  }

  function toggleSelect(p: Producto) {
    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });
  }

  function handleConfirm() {
    if (selectedMap.size === 0) return;
    onSelectMultiple(Array.from(selectedMap.values()));
    onClose();
  }

  const selectedCount = selectedMap.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl"
        style={{ maxHeight: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-bold text-gray-900 text-sm">Catálogo de productos</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sección: <span className="font-medium text-[#2E86AB]">{tipoLabel}</span>
              {" · "}Categorías: {categorias.join(", ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-lg"
          >✕</button>
        </div>

        {/* Buscador */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, fabricante, código de parte, descripción..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
              >✕</button>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isFrecuentes && !query
                ? "⚡ Usados recientemente"
                : `${total} resultado${total !== 1 ? "s" : ""}`}
            </p>
            {loading && <span className="text-xs text-gray-400 animate-pulse">Buscando...</span>}
          </div>

          {!loading && productos.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-gray-600 font-medium">Sin resultados</p>
              <p className="text-xs text-gray-400 mt-1">
                {query
                  ? `No se encontraron productos para "${query}" en las categorías disponibles.`
                  : "No hay productos en estas categorías."}
              </p>
            </div>
          )}

          <div className="space-y-1">
            {productos.map((p) => {
              const isSelected = selectedMap.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSelect(p)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group ${
                    isSelected
                      ? "bg-[#2E86AB]/10 border-[#2E86AB]/40"
                      : "border-transparent hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  {/* Checkbox visual */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#2E86AB] border-[#2E86AB]"
                      : "border-gray-300 bg-white group-hover:border-[#2E86AB]"
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>

                  {/* Categoría badge */}
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${catColors[p.categoria] || "bg-gray-100 text-gray-600"}`}>
                    {p.categoria}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm truncate ${isSelected ? "text-[#1B2A4A]" : "text-gray-900"}`}>
                        {p.nombre}
                      </span>
                      {p.numeroParte && (
                        <span className="text-xs font-mono text-gray-400 shrink-0">{p.numeroParte}</span>
                      )}
                    </div>
                    {(p.descripcion || p.fabricante) && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {p.fabricante && <span className="font-medium">{p.fabricante} · </span>}
                        {p.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Precio */}
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-semibold text-[#1B2A4A] text-sm">
                      USD {formatNumber(p.precioUsd)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Paginación */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-700"
              >← Ant.</button>
              <span className="text-xs text-gray-500 px-3">Pág. {page} de {pages} · {total} total</span>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= pages}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-700"
              >Sig. →</button>
            </div>
          )}
        </div>

        {/* Footer con contador y botón de confirmación */}
        <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between gap-3">
            {/* Contador */}
            <span className="text-sm text-gray-600 font-medium min-w-0">
              {selectedCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2E86AB] text-white text-xs font-bold">
                    {selectedCount}
                  </span>
                  artículo{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-gray-400">Seleccioná uno o más artículos</span>
              )}
            </span>

            {/* Botones */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                className="px-4 py-2 text-sm font-semibold bg-[#1B2A4A] text-white rounded-lg hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Agregar {selectedCount > 0 ? selectedCount : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
