"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CotizacionesActions({ id, numero, estado, canDelete = true }: { id: string; numero: string; estado: string; canDelete?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  async function handleDuplicar() {
    setLoading(true);
    await fetch(`/api/cotizaciones/${id}/duplicar`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar cotización ${numero}?`)) return;
    setLoading(true);
    await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  const btn = "w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40";

  return (
    <>
      <div className="flex items-center gap-0.5 justify-end">
        <button
          onClick={() => setPreviewing(true)}
          title="Vista previa"
          className={`${btn} text-[#1B2A4A] hover:bg-[#1B2A4A]/10`}
        >
          <EyeIcon />
        </button>

        <a
          href={`/api/cotizaciones/${id}/docx`}
          title="Descargar Word (.docx)"
          className={`${btn} text-[#2E86AB] hover:bg-[#2E86AB]/10`}
        >
          <WordIcon />
        </a>

        {estado === "borrador" && (
          <a
            href={`/cotizaciones/${id}`}
            title="Editar"
            className={`${btn} text-gray-600 hover:bg-gray-100`}
          >
            <PencilIcon />
          </a>
        )}

        <button
          onClick={handleDuplicar}
          disabled={loading}
          title="Duplicar"
          className={`${btn} text-gray-600 hover:bg-gray-100`}
        >
          <CopyIcon />
        </button>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={loading}
            title="Eliminar"
            className={`${btn} text-red-500 hover:bg-red-50`}
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {previewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewing(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: "860px", height: "90vh", maxWidth: "95vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <EyeIcon className="text-[#2E86AB]" />
                <span className="font-semibold text-gray-900 text-sm">Vista previa — {numero}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/cotizaciones/${id}/docx`}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#2E86AB] text-white rounded-lg hover:bg-[#247494] transition-colors"
                >
                  <WordIcon />
                  Descargar Word
                </a>
                <button
                  onClick={() => setPreviewing(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors text-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden rounded-b-2xl bg-gray-50">
              <iframe
                src={`/api/cotizaciones/${id}/preview`}
                className="w-full h-full border-0 bg-white"
                title={`Vista previa ${numero}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function WordIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
      <path fill="white" d="M14 2v6h6"/>
      <path stroke="white" strokeWidth="0.8" fill="none" strokeLinecap="round" d="M9 13l1.5 4 1.5-4 1.5 4 1.5-4"/>
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

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
