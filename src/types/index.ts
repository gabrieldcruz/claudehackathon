export type GoalType = "cutting" | "maintenance" | "bulking";

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface UserGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  goal: GoalType;
  dietPreference: string;
}

export interface AppUserProfile extends UserGoals {
  id: number;
  name: string;
  heightCm: number | null;
  weightKg: number | null;
  profileComplete?: boolean;
}

export interface NutritionStatus {
  totals: NutritionTotals;
  goals: UserGoals;
  remaining: NutritionTotals;
  percentages: NutritionTotals;
}

export interface IntelligenceContext {
  proteinLow: boolean;
  carbsExceeded: boolean;
  caloriesAlmostReached: boolean;
  caloriesExceeded: boolean;
  fatsExceeded: boolean;
  recommendation: string;
  priorityMacro: "protein" | "carbs" | "fats" | "calories" | "balanced";
}

export interface RecipeWithIngredients {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  prepTime: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  tags: string;
  ingredients: { id: number; name: string; amount: string }[];
}

export interface MenuItemWithRestaurant {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  tags: string;
  restaurant: {
    id: number;
    name: string;
    cuisine: string;
    rating: number;
    priceRange: string;
  };
}

export interface MealLogEntry {
  id: number;
  mealType: string;
  loggedAt: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  customName: string;
  servings: number;
  recipe?: { id: number; name: string } | null;
  menuItem?: { id: number; name: string; price: number; restaurant: { name: string } } | null;
}
