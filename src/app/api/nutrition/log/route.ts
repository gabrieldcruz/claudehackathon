import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppUser } from "@/lib/app-user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
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

    const user = await getOrCreateAppUser();
    const log = await prisma.mealLog.create({
      data: {
        userId: user.id,
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
  } catch (error) {
    console.error("Failed to create meal log", error);
    return NextResponse.json(
      { error: "Unable to log that meal right now." },
      { status: 500 }
    );
  }
}
