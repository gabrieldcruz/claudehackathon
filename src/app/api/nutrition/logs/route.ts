import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await prisma.mealLog.findMany({
    where: {
      userId,
      loggedAt: { gte: today, lt: tomorrow },
    },
    include: {
      recipe: { select: { id: true, name: true } },
      menuItem: {
        select: {
          id: true,
          name: true,
          price: true,
          restaurant: { select: { name: true } },
        },
      },
    },
    orderBy: { loggedAt: "desc" },
  });

  return NextResponse.json(logs);
}
