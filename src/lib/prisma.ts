import path from "path";
import { PrismaClient } from "@prisma/client";

const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
const resolvedDatabaseUrl =
  rawDatabaseUrl === "file:./dev.db" || rawDatabaseUrl === "file:./prisma/dev.db"
    ? `file:${path.join(process.cwd(), "prisma", "dev.db")}`
    : rawDatabaseUrl;

if (resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

const prismaCacheKey = resolvedDatabaseUrl ?? "default";
const globalForPrisma = globalThis as unknown as {
  prismaClients: Record<string, PrismaClient | undefined> | undefined;
};

if (!globalForPrisma.prismaClients) {
  globalForPrisma.prismaClients = {};
}

export const prisma =
  globalForPrisma.prismaClients[prismaCacheKey] ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClients[prismaCacheKey] = prisma;
}
