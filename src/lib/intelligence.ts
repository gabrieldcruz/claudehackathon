import type { IntelligenceContext, NutritionStatus } from "@/types";

/**
 * Cross-tab intelligence engine.
 * Analyzes today's nutrition and returns recommendation signals.
 */
export function getIntelligenceContext(
  status: NutritionStatus
): IntelligenceContext {
  const { remaining, percentages } = status;

  const proteinLow = percentages.protein < 50;
  const carbsExceeded = percentages.carbs > 100;
  const fatsExceeded = percentages.fats > 100;
  const caloriesAlmostReached = percentages.calories >= 85 && percentages.calories <= 100;
  const caloriesExceeded = percentages.calories > 100;

  let recommendation = "Balanced meals recommended for today.";
  let priorityMacro: IntelligenceContext["priorityMacro"] = "balanced";

  if (caloriesExceeded) {
    recommendation = "You've exceeded your calorie goal. Light, low-calorie options recommended.";
    priorityMacro = "calories";
  } else if (caloriesAlmostReached) {
    recommendation = "Almost at your calorie limit. Choose a light, nutrient-dense option.";
    priorityMacro = "calories";
  } else if (carbsExceeded) {
    recommendation = "Carb intake is high. Prioritize high-protein, low-carb meals.";
    priorityMacro = "carbs";
  } else if (fatsExceeded) {
    recommendation = "Fat intake is high. Look for lean, low-fat protein sources.";
    priorityMacro = "fats";
  } else if (proteinLow) {
    recommendation = `Need ${Math.round(remaining.protein)}g more protein today. High-protein meals recommended.`;
    priorityMacro = "protein";
  }

  return {
    proteinLow,
    carbsExceeded,
    caloriesAlmostReached,
    caloriesExceeded,
    fatsExceeded,
    recommendation,
    priorityMacro,
  };
}

/**
 * Score a meal for recommendation based on current nutrition needs.
 * Higher score = better match.
 */
export function scoreMeal(
  meal: { calories: number; protein: number; carbs: number; fats: number },
  context: IntelligenceContext
): number {
  let score = 50; // base score

  if (context.priorityMacro === "protein") {
    // Reward protein density
    score += meal.protein * 2;
    score -= meal.carbs * 0.5;
  } else if (context.priorityMacro === "carbs") {
    // Penalize high carbs
    score -= meal.carbs * 1.5;
    score += meal.protein * 1;
  } else if (context.priorityMacro === "calories") {
    // Reward low calorie density
    score -= meal.calories * 0.1;
    score += meal.protein * 1;
  } else if (context.priorityMacro === "fats") {
    // Penalize high fat
    score -= meal.fats * 2;
  } else {
    // Balanced: reward well-rounded macros
    score += meal.protein * 0.5;
    score -= Math.abs(meal.protein / meal.calories * 100 - 30) * 0.5;
  }

  return Math.max(0, score);
}

export function getTagBadgeColor(tag: string): string {
  const tagColors: Record<string, string> = {
    "high-protein": "bg-blue-100 text-blue-700",
    "low-carb": "bg-orange-100 text-orange-700",
    "low-calorie": "bg-green-100 text-green-700",
    vegan: "bg-emerald-100 text-emerald-700",
    keto: "bg-purple-100 text-purple-700",
    halal: "bg-amber-100 text-amber-700",
    vegetarian: "bg-lime-100 text-lime-700",
    "high-fiber": "bg-teal-100 text-teal-700",
    "low-fat": "bg-pink-100 text-pink-700",
    "quick-prep": "bg-yellow-100 text-yellow-700",
    recommended: "bg-indigo-100 text-indigo-700",
  };
  return tagColors[tag] ?? "bg-gray-100 text-gray-600";
}
