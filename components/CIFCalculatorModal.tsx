"use client";
import { useState } from "react";
import type { CIFResponseItem } from "@/app/api/cif-calculator/route";

export interface CIFQuoteItem {
  idx: number;
  descripcion: string;
  cantidad: number;
  precioUsd: number;
}

interface ItemExtra {
  origin: string;
  weightKg: string;
  extraContext: string;
}

interface Props {
  items: CIFQuoteItem[];
  onApply: (prices: Record<number, number>) => void;
  onClose: () => void;
}

export function CIFCalculatorModal({ items, onApply, onClose }: Props) {
  const [selected, setSelected]   = useState<Record<number, boolean>>(
    Object.fromEntries(items.map((it) => [it.idx, true]))
  );
  const [extras, setExtras]       = useState<Record<number, ItemExtra>>(
    Object.fromEntries(items.map((it) => [it.idx, { origin: "", weightKg: "", extraContext: "" }]))
  );
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState<CIFResponseItem[] | null>(null);
  const [applySelected, setApplySelected] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const selectedItems = items.filter((it) => selected[it.idx]);
  const missingFields = selectedItems.filter(
    (it) => !extras[it.idx]?.origin.trim() || !extras[it.idx]?.weightKg
  );

  function toggleItem(idx: number) {
    setSelected((s) => ({ ...s, [idx]: !s[idx] }));
    setResults(null);
  }

  function setExtra(idx: number, key: keyof ItemExtra, value: string) {
    setExtras((e) => ({ ...e, [idx]: { ...e[idx], [key]: value } }));
    setResults(null);
  }

  async function handleCalculate() {
    if (selectedItems.length === 0) return;
    if (missingFields.length > 0) {
      setError("Completá el origen y peso de todos los ítems seleccionados.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload = selectedItems.map((it) => ({
        idx: it.idx,
        name: it.descripcion,
        origin: extras[it.idx].origin.trim(),
        weightKg: parseFloat(extras[it.idx].weightKg) || 0,
        fobPrice: it.precioUsd,
        quantity: it.cantidad,
        extraContext: extras[it.idx].extraContext.trim() || undefined,
      }));

      const res = await fetch("/api/cif-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al calcular");
      setResults(data.results);
    } catch (e: any) {
      setError(e.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!results) return;
    const prices: Record<number, number> = {};
    results.forEach((r) => { prices[r.idx] = r.cifPrice; });
    onApply(prices);
    onClose();
  }

  const inp  = "border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]";
  const inpFull = `${inp} w-full`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚢</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Calculadora CIF con IA</h2>
              <p className="text-xs text-gray-500">Estimación de flete + seguro para importación a Buenos Aires</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Tabla de ítems con checkboxes y campos extra */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Seleccioná los ítems a calcular y completá origen + peso:
            </p>
            {items.map((item) => {
              const isSelected = selected[item.idx];
              const ex = extras[item.idx];
              const needsOrigin  = isSelected && !ex.origin.trim();
              const needsWeight  = isSelected && !ex.weightKg;
              return (
                <div
                  key={item.idx}
                  className={`rounded-xl border p-3 transition-colors ${
                    isSelected ? "border-[#2E86AB] bg-blue-50" : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  {/* Fila principal */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.idx)}
                      className="mt-1 w-4 h-4 accent-[#2E86AB] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.descripcion}</p>
                      <p className="text-xs text-gray-500">
                        Cant: {item.cantidad} · FOB: USD {item.precioUsd.toFixed(2)} c/u
                      </p>
                    </div>
                  </div>

                  {/* Campos extra (solo si seleccionado) */}
                  {isSelected && (
                    <div className="mt-3 grid grid-cols-3 gap-2 pl-7">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          País de origen <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`${inpFull} ${needsOrigin ? "border-red-400" : ""}`}
                          value={ex.origin}
                          onChange={(e) => setExtra(item.idx, "origin", e.target.value)}
                          placeholder="Ej: China, USA"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Peso total (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          className={`${inpFull} ${needsWeight ? "border-red-400" : ""}`}
                          value={ex.weightKg}
                          onChange={(e) => setExtra(item.idx, "weightKg", e.target.value)}
                          placeholder="Ej: 2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Contexto adicional
                        </label>
                        <input
                          className={inpFull}
                          value={ex.extraContext}
                          onChange={(e) => setExtra(item.idx, "extraContext", e.target.value)}
                          placeholder="Ej: electrónico, frágil"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Resultados */}
          {results && results.length > 0 && (
            <div className="border border-green-200 bg-green-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-3">Resultados estimados</h3>
              <div className="space-y-3">
                {results.map((r) => (
                  <div key={r.idx} className="bg-white rounded-lg border border-green-200 p-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">{r.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-500 mb-0.5">FOB unit.</p>
                        <p className="font-semibold text-gray-800">USD {r.fobPrice.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <p className="text-blue-600 mb-0.5">Flete ({r.freightPct.toFixed(1)}%)</p>
                        <p className="font-semibold text-blue-800">+ USD {r.freightUsd.toFixed(2)}</p>
                      </div>
                      <div className="bg-amber-50 rounded p-2 text-center">
                        <p className="text-amber-600 mb-0.5">Seguro ({r.insurancePct.toFixed(2)}%)</p>
                        <p className="font-semibold text-amber-800">+ USD {r.insuranceUsd.toFixed(2)}</p>
                      </div>
                      <div className="bg-green-100 rounded p-2 text-center">
                        <p className="text-green-700 mb-0.5 font-medium">CIF unit.</p>
                        <p className="font-bold text-green-900">USD {r.cifPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    {r.aiNote && (
                      <p className="mt-2 text-xs text-gray-500 italic">💡 {r.aiNote}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Checkbox aplicar */}
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applySelected}
                  onChange={(e) => setApplySelected(e.target.checked)}
                  className="w-4 h-4 accent-[#2E86AB]"
                />
                <span className="text-sm text-gray-700">
                  Reemplazar precios de venta con valores CIF calculados
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">
            Estimaciones orientativas · La IA puede variar ±2% del costo real
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            {!results ? (
              <button
                onClick={handleCalculate}
                disabled={loading || selectedItems.length === 0}
                className="px-5 py-2 text-sm bg-[#1B2A4A] text-white rounded-lg hover:bg-[#243660] disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Calculando...
                  </>
                ) : (
                  <>🚢 Calcular CIF →</>
                )}
              </button>
            ) : (
              <button
                onClick={applySelected ? handleApply : onClose}
                className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {applySelected ? "✓ Aplicar precios CIF" : "Cerrar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
