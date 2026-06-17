import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });

const newHash = await bcrypt.hash("admin123", 10);
console.log("New hash:", newHash);

await db.execute({ sql: 'UPDATE "User" SET password = ? WHERE email = ?', args: [newHash, "admin@sabaki.com"] });
console.log("Password updated in Turso");

// Verify
const r = await db.execute({ sql: 'SELECT password FROM "User" WHERE email = ?', args: ["admin@sabaki.com"] });
const ok = await bcrypt.compare("admin123", r.rows[0].password);
console.log("Verify bcrypt:", ok ? "OK" : "FAIL");
