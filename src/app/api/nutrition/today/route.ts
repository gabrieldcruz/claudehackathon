import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [user, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const goals = {
    dailyCalories: user.dailyCalories,
    dailyProtein: user.dailyProtein,
    dailyCarbs: user.dailyCarbs,
    dailyFats: user.dailyFats,
    goal: user.goal,
    dietPreference: user.dietPreference,
  };

  const remaining = {
    calories: Math.max(0, goals.dailyCalories - totals.calories),
    protein: Math.max(0, goals.dailyProtein - totals.protein),
    carbs: Math.max(0, goals.dailyCarbs - totals.carbs),
    fats: Math.max(0, goals.dailyFats - totals.fats),
  };

  const percentages = {
    calories: Math.round((totals.calories / goals.dailyCalories) * 100),
    protein: Math.round((totals.protein / goals.dailyProtein) * 100),
    carbs: Math.round((totals.carbs / goals.dailyCarbs) * 100),
    fats: Math.round((totals.fats / goals.dailyFats) * 100),
  };

  return NextResponse.json({ totals, goals, remaining, percentages });
}
