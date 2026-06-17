"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function NuevaCotizacionSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 bg-[#1B2A4A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243660] transition-colors"
      >
        + Nueva cotización
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de documento</p>
          </div>

          <Link
            href="/cotizaciones/nueva"
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1B2A4A]/10 flex items-center justify-center shrink-0 mt-0.5">
              <DocIcon color="#1B2A4A" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Propuesta Técnico-Comercial</p>
              <p className="text-xs text-gray-500 mt-0.5">Con introducción, alcance, ítems recurrentes y condiciones narrativas.</p>
            </div>
          </Link>

          <Link
            href="/cotizaciones/nueva/simple"
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 px-4 py-3.5 hover:bg-teal-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
              <DocIcon color="#2E86AB" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Cotización Simple</p>
              <p className="text-xs text-gray-500 mt-0.5">Lista de productos con precios y condiciones en tabla. Sin secciones narrativas.</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

function DocIcon({ color }: { color: string }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke={color} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
