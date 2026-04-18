"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  ShoppingBag,
  ChevronRight,
  Trash2,
  Camera,
  Loader2,
  ShoppingCart,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  ChefHat,
  Target,
} from "lucide-react";
import { useNutritionStore } from "@/store/nutritionStore";
import { IntelligenceBanner } from "@/components/ui/IntelligenceBanner";
import { MealCard } from "@/components/ui/MealCard";
import { scoreMeal } from "@/lib/intelligence";
import { useIngredientDetector } from "@/hooks/useIngredientDetector";
import type { IntelligenceContext, RecipeWithIngredients } from "@/types";

interface PantryItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
}

interface GroceryItem {
  name: string;
  amount: string;
  checked: boolean;
}

interface PantryPostResponse {
  item: PantryItem;
  existing?: boolean;
}

const DIET_FILTERS = [
  { label: "All", value: "" },
  { label: "High Protein", value: "high-protein" },
  { label: "Low Carb", value: "low-carb" },
  { label: "Low Cal", value: "low-calorie" },
  { label: "Vegan", value: "vegan" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Keto", value: "keto" },
  { label: "Quick (<20 min)", value: "quick-prep" },
];

interface PantryMatchedRecipe extends RecipeWithIngredients {
  matchedIngredients: string[];
  missingCount: number;
  pantryCoverage: number;
}

const TOKEN_STOP_WORDS = new Set([
  "and",
  "boneless",
  "chopped",
  "cup",
  "cups",
  "diced",
  "extra",
  "fresh",
  "gram",
  "grams",
  "ground",
  "kg",
  "lb",
  "lbs",
  "lean",
  "large",
  "medium",
  "minced",
  "ml",
  "of",
  "optional",
  "or",
  "ounce",
  "ounces",
  "oz",
  "pound",
  "pounds",
  "skinless",
  "small",
  "slice",
  "slices",
  "tablespoon",
  "tablespoons",
  "tbsp",
  "teaspoon",
  "teaspoons",
  "to",
  "taste",
  "tsp",
  "whole",
]);

function getIngredientTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) =>
      token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token
    )
    .filter((token) => token.length > 2 && !TOKEN_STOP_WORDS.has(token));
}

function ingredientMatchesPantry(ingredientName: string, pantryNames: string[]): boolean {
  const ingredientTokens = getIngredientTokens(ingredientName);
  if (ingredientTokens.length === 0) return false;

  return pantryNames.some((pantryName) => {
    const pantryTokens = getIngredientTokens(pantryName);
    if (pantryTokens.length === 0) return false;

    return ingredientTokens.some(
      (token) =>
        pantryTokens.includes(token) ||
        pantryTokens.some(
          (pantryToken) => pantryToken.includes(token) || token.includes(pantryToken)
        )
    );
  });
}

function getFeaturedReason(
  recipe: PantryMatchedRecipe,
  context: IntelligenceContext | null
): string {
  if (recipe.missingCount === 0 && recipe.ingredients.length > 0) {
    return "You already have everything for this one, so it is the easiest win tonight.";
  }

  if (context?.priorityMacro === "protein") {
    return `Strong fit for today with ${Math.round(recipe.protein)}g of protein.`;
  }

  if (context?.priorityMacro === "calories") {
    return `A lighter choice that still keeps protein respectable at ${Math.round(
      recipe.protein
    )}g.`;
  }

  if (context?.priorityMacro === "carbs") {
    return "A steadier lower-carb option for the rest of your day.";
  }

  if (context?.priorityMacro === "fats") {
    return "A leaner macro balance that keeps fat in check.";
  }

  if (recipe.matchedIngredients.length > 0) {
    const pantryLead = recipe.matchedIngredients.slice(0, 2).join(" and ");
    return `You can already start with ${pantryLead} from your kitchen.`;
  }

  return "A strong all-around pick based on your current goals and recipe filters.";
}

function sortPantryItems(items: PantryItem[]): PantryItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function mergePantryItem(items: PantryItem[], nextItem: PantryItem): PantryItem[] {
  const normalizedName = nextItem.name.trim().toLowerCase();
  const existingIndex = items.findIndex(
    (item) => item.id === nextItem.id || item.name.trim().toLowerCase() === normalizedName
  );

  if (existingIndex === -1) {
    return sortPantryItems([...items, nextItem]);
  }

  const nextItems = [...items];
  nextItems[existingIndex] = nextItem;
  return sortPantryItems(nextItems);
}

function parsePantryAmount(amount: string) {
  const trimmedAmount = amount.trim();
  if (!trimmedAmount) {
    return { quantity: "", unit: "" };
  }

  const match = trimmedAmount.match(/^([\d./-]+)\s*(.*)$/);
  if (!match) {
    return { quantity: trimmedAmount, unit: "" };
  }

  return {
    quantity: match[1].trim(),
    unit: match[2].trim(),
  };
}

async function readJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function HomeTab() {
  const { status, context, fetchTodayNutrition, logMeal } = useNutritionStore();
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [pantryError, setPantryError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newItem, setNewItem] = useState("");
  const [loggedId, setLoggedId] = useState<number | null>(null);
  const [mealTypeMap, setMealTypeMap] = useState<Record<number, string>>({});
  const [activeFilter, setActiveFilter] = useState("");

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [showDetected, setShowDetected] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const { detect, loading: detecting } = useIngredientDetector();

  // Grocery list state
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("groceryList") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });
  const [showGrocery, setShowGrocery] = useState(false);

  // Diet preference from user
  const [userDietPreference, setUserDietPreference] = useState("none");

  const fetchPantry = useCallback(
    async () => {
      try {
        const res = await fetch("/api/pantry");
        const data = await readJsonResponse<PantryItem[] | { error?: string }>(res);

        if (!res.ok || !Array.isArray(data)) {
          setPantryError(
            !Array.isArray(data) && data?.error
              ? data.error
              : "Unable to load your pantry right now."
          );
          return;
        }

        setPantry(sortPantryItems(data));
        setPantryError("");
      } catch {
        setPantryError("Unable to load your pantry right now.");
      }
    },
    []
  );

  useEffect(() => {
    fetchTodayNutrition();
    fetchPantry();
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        if (u?.dietPreference && u.dietPreference !== "none") {
          setUserDietPreference(u.dietPreference);
          setActiveFilter(u.dietPreference);
        }
      });
  }, [fetchTodayNutrition, fetchPantry]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);

    // Active filter takes priority, then smart suggestion from context
    const tagToUse =
      activeFilter ||
      (context?.priorityMacro === "protein"
        ? "high-protein"
        : context?.priorityMacro === "carbs"
        ? "low-carb"
        : context?.priorityMacro === "calories"
        ? "low-calorie"
        : "");

    if (tagToUse) params.set("tag", tagToUse);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/recipes${qs}`)
      .then((r) => r.json())
      .then(setRecipes);
  }, [searchQuery, context?.priorityMacro, activeFilter]);

  // Persist grocery list to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("groceryList", JSON.stringify(groceryList));
    }
  }, [groceryList]);

  const createPantryItem = useCallback(
    async ({
      name,
      quantity = "",
      unit = "",
    }: {
      name: string;
      quantity?: string;
      unit?: string;
    }) => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      try {
        const res = await fetch("/api/pantry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, quantity, unit }),
        });
        const data = await readJsonResponse<PantryPostResponse | { error?: string }>(res);

        if (!res.ok || !data || !("item" in data)) {
          setPantryError(
            data && "error" in data && data.error
              ? data.error
              : "Unable to add that item to your pantry right now."
          );
          return null;
        }

        setPantry((prev) => mergePantryItem(prev, data.item));
        setPantryError("");
        return data.item;
      } catch {
        setPantryError("Unable to add that item to your pantry right now.");
        return null;
      }
    },
    []
  );

  const addPantryItem = async () => {
    if (!newItem.trim()) return;

    const item = await createPantryItem({ name: newItem });
    if (item) {
      setNewItem("");
    }
  };

  const removePantryItem = async (id: number) => {
    try {
      const res = await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await readJsonResponse<{ error?: string }>(res);
        setPantryError(data?.error ?? "Unable to remove that pantry item right now.");
        return;
      }

      setPantry((prev) => prev.filter((item) => item.id !== id));
      setPantryError("");
    } catch {
      setPantryError("Unable to remove that pantry item right now.");
    }
  };

  const handleLog = async (recipe: RecipeWithIngredients) => {
    const mealType = mealTypeMap[recipe.id] ?? "lunch";
    await logMeal({
      mealType,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      recipeId: recipe.id,
      customName: recipe.name,
    });
    setLoggedId(recipe.id);
    setTimeout(() => setLoggedId(null), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowDetected(false);
    setDetectMsg("Analyzing fridge image...");

    const ingredients = await detect(file);

    setDetectMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (ingredients.length > 0) {
      setDetectedIngredients(ingredients);
      setShowDetected(true);
    } else {
      setDetectMsg("No food items detected. Try a clearer photo of your fridge or pantry.");
      setTimeout(() => setDetectMsg(""), 4000);
    }
  };

  const addDetectedToPantry = async () => {
    const addedItems = await Promise.all(
      detectedIngredients.map((name) => createPantryItem({ name }))
    );

    if (!addedItems.some(Boolean)) return;

    setShowDetected(false);
    setDetectedIngredients([]);
  };

  const moveGroceryItemToPantry = async (index: number) => {
    const groceryItem = groceryList[index];
    if (!groceryItem) return;

    const { quantity, unit } = parsePantryAmount(groceryItem.amount);
    const pantryItem = await createPantryItem({
      name: groceryItem.name,
      quantity,
      unit,
    });

    if (!pantryItem) return;

    setGroceryList((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const addToGroceryList = (recipe: RecipeWithIngredients) => {
    const newItems: GroceryItem[] = recipe.ingredients
      .filter(
        (ing) =>
          !ingredientMatchesPantry(ing.name, pantryNames) &&
          !groceryList.some((g) => g.name.toLowerCase() === ing.name.toLowerCase())
      )
      .map((ing) => ({ name: ing.name, amount: ing.amount, checked: false }));

    if (newItems.length > 0) {
      setGroceryList((prev) => [...prev, ...newItems]);
      setShowGrocery(true);
    }
  };

  const toggleGroceryItem = (i: number) => {
    setGroceryList((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, checked: !item.checked } : item))
    );
  };

  const removeGroceryItem = (i: number) => {
    setGroceryList((prev) => prev.filter((_, idx) => idx !== i));
  };

  const clearCheckedGrocery = () => {
    setGroceryList((prev) => prev.filter((item) => !item.checked));
  };

  const sorted = context
    ? [...recipes].sort((a, b) => scoreMeal(b, context) - scoreMeal(a, context))
    : recipes;

  const checkedCount = groceryList.filter((g) => g.checked).length;
  const pantryNames = pantry.map((item) => item.name);
  const pantryMatches: PantryMatchedRecipe[] = sorted
    .map((recipe) => {
      const matchedIngredients = recipe.ingredients
        .filter((ingredient) => ingredientMatchesPantry(ingredient.name, pantryNames))
        .map((ingredient) => ingredient.name);

      return {
        ...recipe,
        matchedIngredients,
        missingCount: Math.max(recipe.ingredients.length - matchedIngredients.length, 0),
        pantryCoverage:
          recipe.ingredients.length > 0
            ? matchedIngredients.length / recipe.ingredients.length
            : 0,
      };
    })
    .sort((a, b) => {
      if (b.matchedIngredients.length !== a.matchedIngredients.length) {
        return b.matchedIngredients.length - a.matchedIngredients.length;
      }

      if (a.missingCount !== b.missingCount) {
        return a.missingCount - b.missingCount;
      }

      return a.prepTime - b.prepTime;
    });
  const pantryReadyRecipes = pantryMatches.filter((recipe) => recipe.matchedIngredients.length > 0);
  const featuredRecipe =
    pantryReadyRecipes[0] ??
    (sorted[0] ? pantryMatches.find((recipe) => recipe.id === sorted[0].id) ?? null : null);
  const quickCookCount = pantryMatches.filter((recipe) => recipe.missingCount <= 2).length;
  const pantryQuickPrepCount = pantryReadyRecipes.filter(
    (recipe) => recipe.prepTime > 0 && recipe.prepTime <= 20
  ).length;
  const openGroceryCount = groceryList.length - checkedCount;

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">At Home</h1>
        <p className="text-sm text-gray-500">Cook something great today</p>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Intelligence Banner */}
        {context && <IntelligenceBanner context={context} />}

        {/* Calorie Summary */}
        {status && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Today&apos;s Calories</span>
              <span className="text-xs text-gray-400">
                {Math.round(status.remaining.calories)} kcal remaining
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${Math.min(100, status.percentages.calories)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px] text-gray-400">
              <span>{Math.round(status.totals.calories)} eaten</span>
              <span>{status.goals.dailyCalories} goal</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
              Pantry
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{pantry.length}</p>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              ingredients saved for tonight
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              Cook Now
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{quickCookCount}</p>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              recipes needing 2 or fewer extras
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
              To Buy
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">{openGroceryCount}</p>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              {checkedCount > 0 ? `${checkedCount} already checked off` : "built from recipe gaps"}
            </p>
          </div>
        </div>

        {featuredRecipe && (
          <div className="relative overflow-hidden rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-indigo-50 p-5 shadow-sm">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-200/40 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tonight&apos;s Best Pick
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-gray-900">
                    {featuredRecipe.name}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {getFeaturedReason(featuredRecipe, context)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-right shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Pantry Match
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {featuredRecipe.ingredients.length > 0
                      ? `${featuredRecipe.matchedIngredients.length}/${featuredRecipe.ingredients.length}`
                      : "0/0"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/85 px-3 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Calories</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {Math.round(featuredRecipe.calories)} kcal
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 px-3 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Protein</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {Math.round(featuredRecipe.protein)}g
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 px-3 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Prep Time</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {featuredRecipe.prepTime || "<20"} min
                  </p>
                </div>
              </div>

              {featuredRecipe.matchedIngredients.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Already in your kitchen
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {featuredRecipe.matchedIngredients.slice(0, 5).map((ingredient) => (
                      <span
                        key={`${featuredRecipe.id}-${ingredient}`}
                        className="rounded-full border border-emerald-200 bg-white/90 px-2.5 py-1 text-xs text-emerald-700"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-gray-500">
                  Add a few pantry items or scan your shelves to unlock smarter pantry-first picks.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {featuredRecipe.missingCount > 0 && (
                  <button
                    onClick={() => addToGroceryList(featuredRecipe)}
                    className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Fill {featuredRecipe.missingCount} gap
                    {featuredRecipe.missingCount > 1 ? "s" : ""}
                  </button>
                )}
                <button
                  onClick={() => setSearchQuery(featuredRecipe.name)}
                  className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-white"
                >
                  Focus this recipe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pantry Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <h2 className="font-semibold text-gray-900">My Pantry</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{pantry.length} items</span>
                {/* AI Image Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={detecting}
                  className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  title="Scan fridge/pantry with AI"
                >
                  {detecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <span>{detecting ? "Scanning..." : "Scan"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* Status message */}
            {detectMsg && (
              <div className="mb-3 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-700">
                {detectMsg}
              </div>
            )}

            {pantryError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {pantryError}
              </div>
            )}

            {/* Detected ingredients */}
            {showDetected && detectedIngredients.length > 0 && (
              <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-2">
                  AI detected {detectedIngredients.length} ingredients:
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {detectedIngredients.map((ing) => (
                    <span
                      key={ing}
                      className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-0.5"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addDetectedToPantry}
                    className="flex-1 text-xs bg-emerald-600 text-white rounded-lg py-2 font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Add all to pantry
                  </button>
                  <button
                    onClick={() => setShowDetected(false)}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPantryItem()}
                placeholder="Add ingredient..."
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
              />
              <button
                onClick={addPantryItem}
                className="bg-indigo-600 text-white rounded-xl px-3 py-2 hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
            {pantry.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No pantry items yet</p>
            )}
            {pantry.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <span className="text-sm text-gray-700">{item.name}</span>
                  {item.quantity && (
                    <span className="text-xs text-gray-400">
                      {item.quantity} {item.unit}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removePantryItem(item.id)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {pantry.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h2 className="font-semibold text-gray-900">Cook From Your Pantry</h2>
                    <p className="text-xs text-gray-500">
                      Recipes that already match what you have on hand
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  {pantryQuickPrepCount} quick options
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {pantryReadyRecipes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  Nothing is matching yet. Add a few more pantry staples or try a broader recipe
                  search.
                </div>
              ) : (
                pantryReadyRecipes.slice(0, 3).map((recipe) => (
                  <div
                    key={recipe.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          You already have {recipe.matchedIngredients.length} of{" "}
                          {recipe.ingredients.length} ingredients.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          recipe.missingCount === 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {recipe.missingCount === 0
                          ? "Ready now"
                          : `${recipe.missingCount} item${recipe.missingCount > 1 ? "s" : ""} left`}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400"
                        style={{ width: `${Math.max(10, Math.round(recipe.pantryCoverage * 100))}%` }}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.matchedIngredients.slice(0, 4).map((ingredient) => (
                        <span
                          key={`${recipe.id}-match-${ingredient}`}
                          className="rounded-full border border-white bg-white px-2.5 py-1 text-xs text-gray-600"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.missingCount > 0 && (
                        <button
                          onClick={() => addToGroceryList(recipe)}
                          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                        >
                          Fill recipe gaps
                        </button>
                      )}
                      <button
                        onClick={() => setSearchQuery(recipe.name)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Show recipe
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 p-4">
            <p className="text-sm font-medium text-indigo-900">Make this tab smarter in one scan.</p>
            <p className="mt-1 text-xs leading-5 text-indigo-700">
              Add a few pantry items or use the scan button above and this page will start surfacing
              better pantry-first recipes automatically.
            </p>
          </div>
        )}

        {/* Grocery List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowGrocery((v) => !v)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Grocery List</h2>
              {groceryList.length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                  {groceryList.length - checkedCount} left
                </span>
              )}
            </div>
            {showGrocery ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showGrocery && (
            <div className="border-t border-gray-50">
              {groceryList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 px-4">
                  Add missing ingredients from a recipe card to start your list.
                </p>
              ) : (
                <>
                  <p className="px-4 pt-3 text-[11px] text-emerald-700">
                    Click an item name to move it into your pantry.
                  </p>
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {groceryList.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <button onClick={() => toggleGroceryItem(i)} className="flex-shrink-0">
                          {item.checked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGroceryItemToPantry(i)}
                          className="flex-1 min-w-0 rounded-lg px-2 py-1 text-left transition-colors hover:bg-emerald-50"
                        >
                          <span
                            className={`block text-sm ${
                              item.checked ? "text-gray-400 line-through" : "text-gray-700"
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.amount && (
                            <span className="mt-0.5 block text-xs text-gray-400">
                              {item.amount}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] font-medium text-emerald-600">
                            Move to pantry
                          </span>
                        </button>
                        <button
                          onClick={() => removeGroceryItem(i)}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {checkedCount > 0 && (
                    <div className="p-3 border-t border-gray-50">
                      <button
                        onClick={clearCheckedGrocery}
                        className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
                      >
                        Clear {checkedCount} checked item{checkedCount > 1 ? "s" : ""}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Recipe Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-4 py-3 outline-none focus:border-indigo-400 bg-white"
          />
        </div>

        {/* Diet Filters */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {DIET_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() =>
                  setActiveFilter((prev) => (prev === f.value ? "" : f.value))
                }
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  activeFilter === f.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Diet preference badge */}
        {userDietPreference !== "none" && (
          <p className="text-xs text-indigo-500 -mt-2">
            Showing results for your <strong>{userDietPreference}</strong> preference
          </p>
        )}

        {/* Recipe Cards */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">
            {context?.priorityMacro !== "balanced" ? "Recommended for You" : "All Recipes"}
          </h2>
          {sorted.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No recipes found. Try a different filter.
            </p>
          )}
          {sorted.map((recipe, idx) => (
            <div key={recipe.id}>
              <div className="mb-2 flex items-center gap-2">
                <select
                  value={mealTypeMap[recipe.id] ?? "lunch"}
                  onChange={(e) =>
                    setMealTypeMap({ ...mealTypeMap, [recipe.id]: e.target.value })
                  }
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white outline-none"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <button
                  onClick={() => addToGroceryList(recipe)}
                  className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50 transition-colors"
                  title="Add missing ingredients to grocery list"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>Fill gaps</span>
                </button>
              </div>
              <MealCard
                name={recipe.name}
                description={recipe.description}
                imageUrl={recipe.imageUrl}
                calories={recipe.calories}
                protein={recipe.protein}
                carbs={recipe.carbs}
                fats={recipe.fats}
                prepTime={recipe.prepTime}
                tags={recipe.tags}
                recommended={idx === 0 && context?.priorityMacro !== "balanced"}
                onLog={() => handleLog(recipe)}
              >
                {recipe.ingredients.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Ingredients</p>
                    <ul className="space-y-1">
                      {recipe.ingredients.map((ing) => (
                        <li key={ing.id} className="flex justify-between text-xs text-gray-600">
                          <span>{ing.name}</span>
                          <span className="text-gray-400">{ing.amount}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </MealCard>
              {loggedId === recipe.id && (
                <p className="text-xs text-emerald-600 font-medium text-center mt-2">
                  Logged successfully!
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
