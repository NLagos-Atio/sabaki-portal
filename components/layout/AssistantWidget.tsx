"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "¡Hola! Soy el asistente de cotizaciones. Puedo ayudarte con consultas sobre el catálogo de productos, propuestas existentes, cálculos de margen e IVA, y más. ¿En qué puedo ayudarte?",
};

const MAX_CHARS = 400;

export function AssistantWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Foco en el input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      // Enviar historial sin el mensaje de bienvenida (índice 0 es el welcome hardcodeado)
      const history = newMessages.slice(1, -1); // excluir welcome y el mensaje que acabamos de agregar
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al consultar");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e.message || "Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    setMessages([WELCOME]);
    setInput("");
    setError(null);
  }

  const charsLeft = MAX_CHARS - input.length;

  return (
    <>
      {/* ── Panel de chat ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{ width: 360, height: 480 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1B2A4A] text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#2E86AB] flex items-center justify-center p-1 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sabaki-logo.png" alt="Sabaki" className="w-full h-full object-contain" />
              </div>
              <span className="font-semibold text-sm">Asistente</span>
              <span className="text-xs bg-[#2E86AB] px-1.5 py-0.5 rounded font-medium">IA</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Nueva conversación"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs"
              >
                ↺
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] text-sm rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-[#2E86AB] text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Indicador de carga */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-center">
                <span className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 inline-block">
                  {error}
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-200 bg-white shrink-0">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntá sobre cotizaciones..."
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E86AB] disabled:opacity-60 leading-snug"
                  style={{ minHeight: 36, maxHeight: 100 }}
                />
                {input.length > MAX_CHARS * 0.8 && (
                  <span className={`absolute right-2 bottom-1.5 text-xs ${charsLeft < 20 ? "text-red-500" : "text-gray-400"}`}>
                    {charsLeft}
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-[#2E86AB] text-white flex items-center justify-center hover:bg-[#247494] disabled:opacity-40 transition-colors shrink-0"
              >
                <SendIcon />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">Enter para enviar · Shift+Enter nueva línea</p>
          </div>
        </div>
      )}

      {/* ── Botón flotante ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          open
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-[#1B2A4A] hover:bg-[#243660]"
        }`}
        title={open ? "Cerrar asistente" : "Abrir asistente IA"}
      >
        {open ? (
          <span className="text-white text-xl leading-none">✕</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/sabaki-logo.png" alt="Asistente" className="w-14 h-14 object-contain" />
        )}
      </button>
    </>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
