import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = 1;

  // Last 7 days including today
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.mealLog.findMany({
    where: {
      userId,
      loggedAt: { gte: sevenDaysAgo, lte: today },
    },
    orderBy: { loggedAt: "asc" },
  });

  // Group by date
  const byDate: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDate[key] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  }

  for (const log of logs) {
    const key = new Date(log.loggedAt).toISOString().slice(0, 10);
    if (byDate[key]) {
      byDate[key].calories += log.calories;
      byDate[key].protein += log.protein;
      byDate[key].carbs += log.carbs;
      byDate[key].fats += log.fats;
    }
  }

  const history = Object.entries(byDate).map(([date, totals]) => {
    const d = new Date(date);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    return {
      date,
      label,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fats: Math.round(totals.fats),
    };
  });

  return NextResponse.json(history);
}
