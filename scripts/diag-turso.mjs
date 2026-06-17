import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});

console.log("URL:", process.env.DATABASE_URL);
console.log("Token:", process.env.DATABASE_AUTH_TOKEN?.substring(0, 20) + "...");

try {
  // Listar todas las tablas existentes
  const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  if (r.rows.length === 0) {
    console.log("\n⚠️  No hay tablas en la base de datos Turso.");
  } else {
    console.log("\n✅ Tablas en Turso:");
    r.rows.forEach(row => console.log("  -", row.name));
  }
} catch (e) {
  console.error("\n❌ Error al conectar:", e.message);
  console.error("Código:", e.code);
}

// Intentar crear una tabla de prueba
try {
  await db.execute("CREATE TABLE IF NOT EXISTS _test_connection (id INTEGER PRIMARY KEY)");
  const r2 = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='_test_connection'");
  if (r2.rows.length > 0) {
    console.log("\n✅ Escritura OK — conexión funciona correctamente");
    await db.execute("DROP TABLE _test_connection");
  }
} catch (e) {
  console.error("\n❌ Error en escritura:", e.message);
}
