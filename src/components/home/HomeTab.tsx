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
} from "lucide-react";
import { useNutritionStore } from "@/store/nutritionStore";
import { IntelligenceBanner } from "@/components/ui/IntelligenceBanner";
import { MealCard } from "@/components/ui/MealCard";
import { scoreMeal } from "@/lib/intelligence";
import { useIngredientDetector } from "@/hooks/useIngredientDetector";
import type { RecipeWithIngredients } from "@/types";

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

export function HomeTab() {
  const { status, context, fetchTodayNutrition, logMeal } = useNutritionStore();
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
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
    () => fetch("/api/pantry").then((r) => r.json()).then(setPantry),
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

  const addPantryItem = async () => {
    if (!newItem.trim()) return;
    await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newItem.trim() }),
    });
    setNewItem("");
    fetchPantry();
  };

  const removePantryItem = async (id: number) => {
    await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });
    fetchPantry();
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
    setDetectMsg("Loading AI model… (first time takes ~10s)");

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
    for (const name of detectedIngredients) {
      await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    fetchPantry();
    setShowDetected(false);
    setDetectedIngredients([]);
  };

  const addToGroceryList = (recipe: RecipeWithIngredients) => {
    const newItems: GroceryItem[] = recipe.ingredients
      .filter((ing) => !groceryList.some((g) => g.name.toLowerCase() === ing.name.toLowerCase()))
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
                  Add recipe ingredients using the button on each recipe card.
                </p>
              ) : (
                <>
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
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm ${
                              item.checked ? "text-gray-400 line-through" : "text-gray-700"
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.amount && (
                            <span className="text-xs text-gray-400 ml-2">{item.amount}</span>
                          )}
                        </div>
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
                  title="Add ingredients to grocery list"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>Grocery list</span>
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
