import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDailyGoals, hasBodyMetrics, normalizeGoal } from "@/lib/user-goals";
import { getAppUserById, getOrCreateAppUser } from "@/lib/app-user";
import {
  HEIGHT_LIMITS_CM,
  WEIGHT_LIMITS_KG,
  isValidHeightCm,
  isValidWeightKg,
  parseImperialBodyMetrics,
} from "@/lib/body-metrics";

export async function GET() {
  const user = await getOrCreateAppUser();
  return NextResponse.json({
    ...user,
    profileComplete: hasBodyMetrics(user),
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const currentUser = await getOrCreateAppUser();
    const hasImperialBodyMetrics =
      body.heightFeet !== undefined ||
      body.heightInches !== undefined ||
      body.weightLbs !== undefined;
    const imperialMetrics = hasImperialBodyMetrics
      ? parseImperialBodyMetrics({
          heightFeet: body.heightFeet,
          heightInches: body.heightInches,
          weightLbs: body.weightLbs,
        })
      : null;

    const nextGoal = normalizeGoal(body.goal ?? currentUser.goal);
    const nextHeightCm =
      imperialMetrics?.heightCm ??
      (body.heightCm === undefined || body.heightCm === null
        ? currentUser.heightCm
        : Number(body.heightCm));
    const nextWeightKg =
      imperialMetrics?.weightKg ??
      (body.weightKg === undefined || body.weightKg === null
        ? currentUser.weightKg
        : Number(body.weightKg));

    if (hasImperialBodyMetrics && !imperialMetrics) {
      return NextResponse.json(
        { error: "Enter a valid height in feet/inches and weight in pounds." },
        { status: 400 }
      );
    }

    if (nextHeightCm !== null && !isValidHeightCm(nextHeightCm)) {
      return NextResponse.json(
        {
          error: `Height must be between ${HEIGHT_LIMITS_CM.min} cm and ${HEIGHT_LIMITS_CM.max} cm.`,
        },
        { status: 400 }
      );
    }

    if (nextWeightKg !== null && !isValidWeightKg(nextWeightKg)) {
      return NextResponse.json(
        {
          error: `Weight must be between ${WEIGHT_LIMITS_KG.min} kg and ${WEIGHT_LIMITS_KG.max} kg.`,
        },
        { status: 400 }
      );
    }

    const calculatedGoals =
      nextHeightCm !== null && nextWeightKg !== null
        ? calculateDailyGoals({
            heightCm: nextHeightCm,
            weightKg: nextWeightKg,
            goal: nextGoal,
          })
        : {
            dailyCalories: currentUser.dailyCalories,
            dailyProtein: currentUser.dailyProtein,
            dailyCarbs: currentUser.dailyCarbs,
            dailyFats: currentUser.dailyFats,
          };

    const userData = {
      name:
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : currentUser.name,
      heightCm: nextHeightCm,
      weightKg: nextWeightKg,
      dailyCalories: calculatedGoals.dailyCalories,
      dailyProtein: calculatedGoals.dailyProtein,
      dailyCarbs: calculatedGoals.dailyCarbs,
      dailyFats: calculatedGoals.dailyFats,
      goal: nextGoal,
      dietPreference:
        typeof body.dietPreference === "string" && body.dietPreference.trim()
          ? body.dietPreference
          : currentUser.dietPreference,
    };

    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "name" = ${userData.name},
        "heightCm" = ${userData.heightCm},
        "weightKg" = ${userData.weightKg},
        "dailyCalories" = ${userData.dailyCalories},
        "dailyProtein" = ${userData.dailyProtein},
        "dailyCarbs" = ${userData.dailyCarbs},
        "dailyFats" = ${userData.dailyFats},
        "goal" = ${userData.goal},
        "dietPreference" = ${userData.dietPreference}
      WHERE "id" = ${currentUser.id}
    `;

    const user = await getAppUserById(currentUser.id);
    if (!user) {
      throw new Error("Updated user could not be loaded.");
    }

    return NextResponse.json({
      ...user,
      profileComplete: hasBodyMetrics(user),
    });
  } catch (error) {
    console.error("Failed to update user profile", error);
    return NextResponse.json(
      {
        error: "Unable to save your profile right now.",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
