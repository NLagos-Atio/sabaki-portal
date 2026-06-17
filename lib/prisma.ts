import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
  if (raw.startsWith("file:")) {
    const filePart = raw.replace(/^file:/, "");
    const absolute = path.isAbsolute(filePart) ? filePart : path.resolve(process.cwd(), filePart);
    return `file:${absolute}`;
  }
  return raw;
}

function createPrismaClient() {
  const url = resolveDbUrl();
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error"] : [] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
