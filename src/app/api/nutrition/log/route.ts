import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    userId = 1,
    mealType = "snack",
    calories,
    protein,
    carbs,
    fats,
    recipeId,
    menuItemId,
    customName = "",
    servings = 1,
  } = body;

  if (calories === undefined || protein === undefined) {
    return NextResponse.json(
      { error: "calories and protein are required" },
      { status: 400 }
    );
  }

  const log = await prisma.mealLog.create({
    data: {
      userId,
      mealType,
      calories: Number(calories) * Number(servings),
      protein: Number(protein) * Number(servings),
      carbs: Number(carbs ?? 0) * Number(servings),
      fats: Number(fats ?? 0) * Number(servings),
      recipeId: recipeId ?? null,
      menuItemId: menuItemId ?? null,
      customName,
      servings: Number(servings),
    },
  });

  return NextResponse.json(log, { status: 201 });
}
