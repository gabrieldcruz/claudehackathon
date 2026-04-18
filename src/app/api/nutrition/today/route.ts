import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppUser } from "@/lib/app-user";

export async function GET() {
  try {
    const user = await getOrCreateAppUser();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await prisma.mealLog.findMany({
      where: {
        userId: user.id,
        loggedAt: { gte: today, lt: tomorrow },
      },
    });

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
      calories:
        goals.dailyCalories > 0
          ? Math.round((totals.calories / goals.dailyCalories) * 100)
          : 0,
      protein:
        goals.dailyProtein > 0 ? Math.round((totals.protein / goals.dailyProtein) * 100) : 0,
      carbs: goals.dailyCarbs > 0 ? Math.round((totals.carbs / goals.dailyCarbs) * 100) : 0,
      fats: goals.dailyFats > 0 ? Math.round((totals.fats / goals.dailyFats) * 100) : 0,
    };

    return NextResponse.json({ totals, goals, remaining, percentages });
  } catch (error) {
    console.error("Failed to load nutrition status", error);
    return NextResponse.json(
      { error: "Unable to load today’s nutrition right now." },
      { status: 500 }
    );
  }
}
