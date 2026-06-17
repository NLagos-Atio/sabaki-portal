import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});

const sql = readFileSync(path.join(ROOT, "prisma/migrations/20260529143537_init/migration.sql"), "utf-8");

// Dividir por ";\n" o ";\r\n"
const stmts = sql
  .split(/;\s*\n/)
  .map(s => s.replace(/^--.*$/gm, "").trim())
  .filter(s => s.length > 0);

console.log(`Total statements: ${stmts.length}`);

for (let i = 0; i < stmts.length; i++) {
  const stmt = stmts[i].trim();
  if (!stmt) continue;
  try {
    await db.execute(stmt);
    console.log(`✅ [${i+1}/${stmts.length}]: ${stmt.substring(0, 60).replace(/\n/g, " ")}...`);
  } catch (e) {
    console.error(`❌ [${i+1}/${stmts.length}]: ${e.message.split("\n")[0]}`);
    console.error(`   SQL: ${stmt.substring(0, 100).replace(/\n/g, " ")}`);
  }
}

// Verificar tablas creadas
const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log(`\nTablas en Turso: ${r.rows.length}`);
r.rows.forEach(row => console.log(" -", row.name));
