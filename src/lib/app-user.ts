import { prisma } from "@/lib/prisma";
import { hasBodyMetrics } from "@/lib/user-goals";

export const APP_USER_ID = 1;

export interface AppUserRecord {
  id: number;
  name: string;
  heightCm: number | null;
  weightKg: number | null;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  goal: string;
  dietPreference: string;
  createdAt: Date;
}

export async function getOrCreateAppUser() {
  const existingUser = await getAppUserById(APP_USER_ID);

  if (existingUser) {
    return existingUser;
  }

  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "name", "goal", "dietPreference")
    VALUES (${APP_USER_ID}, ${"Alex"}, ${"maintenance"}, ${"none"})
  `;

  const createdUser = await getAppUserById(APP_USER_ID);
  if (!createdUser) {
    throw new Error("Failed to create app user.");
  }

  return createdUser;
}

export function isUserProfileComplete(
  user: Pick<AppUserRecord, "heightCm" | "weightKg"> | null | undefined
) {
  return hasBodyMetrics(user);
}

export async function getAppUserById(id: number) {
  const rows = await prisma.$queryRaw<AppUserRecord[]>`
    SELECT
      "id",
      "name",
      "heightCm",
      "weightKg",
      "dailyCalories",
      "dailyProtein",
      "dailyCarbs",
      "dailyFats",
      "goal",
      "dietPreference",
      "createdAt"
    FROM "User"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}
