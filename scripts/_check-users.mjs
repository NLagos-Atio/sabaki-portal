import { createClient } from "@libsql/client";
const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
const r = await db.execute('SELECT id, email, name, role, active, password FROM "User"');
for (const row of r.rows) {
  console.log(`email: ${row.email} | active: ${row.active} | role: ${row.role} | pwdLen: ${String(row.password).length}`);
}
