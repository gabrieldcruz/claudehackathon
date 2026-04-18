export type GoalType = "cutting" | "maintenance" | "bulking";
import { HEIGHT_LIMITS_CM, WEIGHT_LIMITS_KG } from "@/lib/body-metrics";

interface GoalCalculationInput {
  heightCm: number;
  weightKg: number;
  goal: string;
}

interface GoalCalculationResult {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  bmi: number;
}

const CALORIE_ADJUSTMENTS: Record<GoalType, number> = {
  cutting: -300,
  maintenance: 0,
  bulking: 250,
};

const PROTEIN_MULTIPLIERS: Record<GoalType, number> = {
  cutting: 2.2,
  maintenance: 1.8,
  bulking: 2.0,
};

const FAT_SPLITS: Record<GoalType, number> = {
  cutting: 0.25,
  maintenance: 0.27,
  bulking: 0.28,
};

export function normalizeGoal(goal: string): GoalType {
  if (goal === "cutting" || goal === "bulking") {
    return goal;
  }

  return "maintenance";
}

export function hasBodyMetrics(
  user: { heightCm: number | null; weightKg: number | null } | null | undefined
) {
  return Boolean(
    user &&
      typeof user.heightCm === "number" &&
      Number.isFinite(user.heightCm) &&
      user.heightCm > 0 &&
      typeof user.weightKg === "number" &&
      Number.isFinite(user.weightKg) &&
      user.weightKg > 0
  );
}

export function calculateDailyGoals({
  heightCm,
  weightKg,
  goal,
}: GoalCalculationInput): GoalCalculationResult {
  const safeHeightCm = clamp(heightCm, HEIGHT_LIMITS_CM.min, HEIGHT_LIMITS_CM.max);
  const safeWeightKg = clamp(weightKg, WEIGHT_LIMITS_KG.min, WEIGHT_LIMITS_KG.max);
  const normalizedGoal = normalizeGoal(goal);
  const heightMeters = safeHeightCm / 100;
  const bmi = safeWeightKg / (heightMeters * heightMeters);

  const maintenanceFactor =
    bmi < 18.5 ? 33 : bmi < 25 ? 31 : bmi < 30 ? 29 : 27;
  const heightOffset = (safeHeightCm - 170) * 1.5;
  const estimatedMaintenanceCalories = Math.round(
    safeWeightKg * maintenanceFactor + heightOffset
  );

  const startingCalories = clamp(
    estimatedMaintenanceCalories + CALORIE_ADJUSTMENTS[normalizedGoal],
    1400,
    4200
  );

  const dailyProtein = Math.round(
    safeWeightKg * PROTEIN_MULTIPLIERS[normalizedGoal]
  );
  const dailyFats = Math.max(
    Math.round(safeWeightKg * 0.7),
    Math.round((startingCalories * FAT_SPLITS[normalizedGoal]) / 9)
  );
  const carbsCalories = Math.max(
    80 * 4,
    startingCalories - dailyProtein * 4 - dailyFats * 9
  );
  const dailyCarbs = Math.round(carbsCalories / 4);
  const dailyCalories = dailyProtein * 4 + dailyCarbs * 4 + dailyFats * 9;

  return {
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFats,
    bmi: Number(bmi.toFixed(1)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
