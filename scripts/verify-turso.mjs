import { createClient } from "@libsql/client";
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});
const tables = ["User","CompanyProfile","Producto","Proveedor","Cotizacion","CotizacionSimple","CotizacionSimpleItem","CotizacionSimpleCondicion"];
for (const t of tables) {
  try {
    const r = await db.execute(`SELECT COUNT(*) as n FROM "${t}"`);
    console.log(`${t}: ${r.rows[0].n} filas`);
  } catch(e) { console.log(`${t}: ERROR - ${e.message.split('\n')[0]}`); }
}
