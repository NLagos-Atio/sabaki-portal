/**
 * Migra el schema y datos de dev.db local a Turso cloud.
 * Uso: node scripts/migrate-to-turso.mjs
 */
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const TURSO_URL   = process.env.DATABASE_URL;
const TURSO_TOKEN = process.env.DATABASE_AUTH_TOKEN;
const LOCAL_DB    = process.env.LOCAL_DB ?? path.join(ROOT, "dev.db");

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Faltan DATABASE_URL y DATABASE_AUTH_TOKEN");
  process.exit(1);
}

const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const local  = createClient({ url: `file:${LOCAL_DB}` });

function parseStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map(s => s.replace(/^--.*$/gm, "").trim())
    .filter(s => s.length > 0);
}

// ── 1. Ejecutar migraciones ──────────────────────────────────────────────────
async function runMigrations() {
  console.log("\n📦 Ejecutando migraciones en Turso...");
  const migrationsDir = path.join(ROOT, "prisma", "migrations");
  const folders = readdirSync(migrationsDir)
    .filter(f => f !== "migration_lock.toml")
    .sort();

  for (const folder of folders) {
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    try {
      const sql = readFileSync(sqlPath, "utf-8");
      const statements = parseStatements(sql);
      if (statements.length === 0) continue;

      let ok = 0;
      for (const stmt of statements) {
        try {
          await remote.execute(stmt);
          ok++;
        } catch (e) {
          const msg = e.message ?? "";
          const isExpected =
            msg.includes("already exists") ||
            msg.includes("duplicate column");
          if (!isExpected) {
            console.warn(`  ⚠️  ${folder}: ${msg.split("\n")[0].substring(0, 80)}`);
          }
        }
      }
      console.log(`  ✅ ${folder}`);
    } catch (e) {
      if (e.code === "ENOENT") continue;
      console.error(`  ❌ ${folder}: ${e.message}`);
    }
  }
}

// ── 2. Copiar datos ──────────────────────────────────────────────────────────
const TABLES = [
  "User", "CompanyProfile", "Producto", "Proveedor", "PresupuestoProveedor",
  "Cotizacion", "CotizacionItem", "CotizacionTasa",
  "CotizacionSimple", "CotizacionSimpleItem", "CotizacionSimpleCondicion",
];

async function copyTable(table) {
  const result = await local.execute(`SELECT * FROM "${table}"`);
  if (result.rows.length === 0) { console.log(`  ⏭️  ${table}: vacía`); return; }

  const cols = result.columns;
  const placeholders = cols.map(() => "?").join(", ");
  const colNames = cols.map(c => `"${c}"`).join(", ");
  const insertSQL = `INSERT OR IGNORE INTO "${table}" (${colNames}) VALUES (${placeholders})`;

  let ok = 0, skip = 0;
  for (const row of result.rows) {
    const values = cols.map(c => {
      const v = row[c];
      if (v === true) return 1;
      if (v === false) return 0;
      return v ?? null;
    });
    try {
      const r = await remote.execute({ sql: insertSQL, args: values });
      if (r.rowsAffected > 0) ok++; else skip++;
    } catch (e) {
      console.warn(`  ⚠️  ${table} insert: ${e.message?.split("\n")[0].substring(0, 80)}`);
      skip++;
    }
  }
  if (ok > 0) console.log(`  ✅ ${table}: ${ok} filas copiadas${skip > 0 ? `, ${skip} ya existían` : ""}`);
  else        console.log(`  ⏭️  ${table}: ${skip} ya existían`);
}

async function copyData() {
  console.log("\n📋 Copiando datos de dev.db → Turso...");
  for (const table of TABLES) {
    try { await copyTable(table); }
    catch (e) { console.warn(`  ⚠️  ${table}: ${e.message?.split("\n")[0]}`); }
  }
}

// ── 3. Verificar ────────────────────────────────────────────────────────────
async function verify() {
  console.log("\n🔍 Tablas en Turso:");
  const r = await remote.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  r.rows.forEach(row => console.log("  -", row.name));

  console.log("\n🔍 Conteo de filas:");
  let total = 0;
  for (const table of TABLES) {
    try {
      const r2 = await remote.execute(`SELECT COUNT(*) as n FROM "${table}"`);
      const n = Number(r2.rows[0]?.n ?? 0);
      total += n;
      console.log(`  ${n > 0 ? "✅" : "⬜"} ${table}: ${n}`);
    } catch (e) { console.log(`  ❌ ${table}: ${e.message?.split("\n")[0]}`); }
  }
  return total;
}

try {
  await runMigrations();
  await copyData();
  const total = await verify();
  console.log(`\n✅ Listo. ${total} filas totales en Turso.\n`);
  process.exit(0);
} catch (e) {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
}
