/**
 * Logger centralizado - escribe en /logs/ con archivos separados por categoría.
 * Diseñado para entornos Node.js (API routes de Next.js, no Edge runtime).
 */
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ── Configuración ─────────────────────────────────────────────────────────────
const LOGS_DIR  = join(process.cwd(), "logs");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB por archivo → rota automáticamente

// Garantiza que la carpeta exista
if (!existsSync(LOGS_DIR)) {
  try { mkdirSync(LOGS_DIR, { recursive: true }); } catch {}
}

// ── Niveles y archivos ────────────────────────────────────────────────────────
type Level    = "INFO" | "WARN" | "ERROR" | "FATAL" | "DEBUG";
type Category = "application" | "errors" | "database" | "api" | "startup" | "auth" | "docgen";

const FILE_MAP: Record<Category, string> = {
  application: "application.log",
  errors:      "errors.log",
  database:    "database.log",
  api:         "api.log",
  startup:     "startup.log",
  auth:        "auth.log",
  docgen:      "docgen.log",
};

// ── Núcleo ────────────────────────────────────────────────────────────────────
function write(category: Category, level: Level, service: string, message: string, extra?: unknown) {
  const now  = new Date();
  const ts   = now.toISOString().replace("T", " ").substring(0, 23);
  const file = join(LOGS_DIR, FILE_MAP[category]);

  let line = `[${ts}] [${level.padEnd(5)}] [${service.padEnd(12)}] ${message}`;

  if (extra !== undefined) {
    if (extra instanceof Error) {
      line += `\n  Error: ${extra.message}`;
      if (extra.stack) line += `\n  Stack: ${extra.stack.split("\n").slice(1, 4).join(" | ")}`;
    } else if (typeof extra === "object") {
      try { line += `\n  Data: ${JSON.stringify(extra)}`; } catch {}
    } else {
      line += `\n  Detail: ${extra}`;
    }
  }

  line += "\n";

  // Rotación simple: si el archivo supera MAX_BYTES, renómbralo
  try {
    const { statSync, renameSync } = require("fs");
    try {
      const stat = statSync(file);
      if (stat.size > MAX_BYTES) {
        const rotated = file.replace(".log", `_${Date.now()}.log`);
        renameSync(file, rotated);
      }
    } catch {}
    appendFileSync(file, line, { encoding: "utf8" });
  } catch {}

  // También a consola en desarrollo
  if (process.env.NODE_ENV !== "production") {
    const colors: Record<Level, string> = {
      DEBUG: "\x1b[36m", INFO: "\x1b[32m", WARN: "\x1b[33m",
      ERROR: "\x1b[31m", FATAL: "\x1b[35m",
    };
    console.log(`${colors[level]}[${level}]\x1b[0m [${service}] ${message}`);
  }
}

// ── API Pública ───────────────────────────────────────────────────────────────
export const logger = {
  // Aplicación general
  info:  (service: string, msg: string, data?: unknown) => write("application", "INFO",  service, msg, data),
  warn:  (service: string, msg: string, data?: unknown) => write("application", "WARN",  service, msg, data),
  debug: (service: string, msg: string, data?: unknown) => write("application", "DEBUG", service, msg, data),

  // Errores (también van a errors.log)
  error: (service: string, msg: string, err?: unknown) => {
    write("application", "ERROR", service, msg, err);
    write("errors",      "ERROR", service, msg, err);
  },
  fatal: (service: string, msg: string, err?: unknown) => {
    write("application", "FATAL", service, msg, err);
    write("errors",      "FATAL", service, msg, err);
  },

  // Categorías específicas
  db:      (msg: string, data?: unknown) => write("database",    "INFO",  "database",    msg, data),
  dbError: (msg: string, err?: unknown)  => {
    write("database", "ERROR", "database", msg, err);
    write("errors",   "ERROR", "database", msg, err);
  },
  api:      (method: string, path: string, status: number, ms?: number) =>
    write("api", "INFO", "api", `${method} ${path} → ${status}${ms ? ` (${ms}ms)` : ""}`),
  apiError: (method: string, path: string, err?: unknown) => {
    write("api",    "ERROR", "api",    `${method} ${path} FAILED`, err);
    write("errors", "ERROR", "api",    `${method} ${path} FAILED`, err);
  },
  startup: (msg: string, data?: unknown) => write("startup",  "INFO",  "startup",  msg, data),
  auth:    (msg: string, data?: unknown) => write("auth",     "INFO",  "auth",     msg, data),
  authErr: (msg: string, err?: unknown)  => {
    write("auth",   "ERROR", "auth",   msg, err);
    write("errors", "ERROR", "auth",   msg, err);
  },
  docgen:  (msg: string, err?: unknown)  => err
    ? (() => { write("docgen","ERROR","docgen", msg, err); write("errors","ERROR","docgen", msg, err); })()
    : write("docgen", "INFO", "docgen", msg),
};

export default logger;
