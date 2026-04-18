"use client";
import { useEffect, useState } from "react";
import { Search, Plus, ShoppingBag, ChevronRight, Trash2 } from "lucide-react";
import { useNutritionStore } from "@/store/nutritionStore";
import { IntelligenceBanner } from "@/components/ui/IntelligenceBanner";
import { MealCard } from "@/components/ui/MealCard";
import { scoreMeal } from "@/lib/intelligence";
import type { RecipeWithIngredients } from "@/types";

interface PantryItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
}

export function HomeTab() {
  const { status, context, fetchTodayNutrition, logMeal } = useNutritionStore();
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newItem, setNewItem] = useState("");
  const [loggedId, setLoggedId] = useState<number | null>(null);
  const [mealTypeMap, setMealTypeMap] = useState<Record<number, string>>({});

  const fetchPantry = () =>
    fetch("/api/pantry").then((r) => r.json()).then(setPantry);

  useEffect(() => {
    fetchTodayNutrition();
    fetchPantry();
  }, [fetchTodayNutrition]);

  useEffect(() => {
    const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
    const tag = context?.priorityMacro === "protein"
      ? "high-protein"
      : context?.priorityMacro === "carbs"
      ? "low-carb"
      : context?.priorityMacro === "calories"
      ? "low-calorie"
      : "";
    fetch(`/api/recipes${q || (tag ? `?tag=${tag}` : "")}`)
      .then((r) => r.json())
      .then(setRecipes);
  }, [searchQuery, context?.priorityMacro]);

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

  const sorted = context
    ? [...recipes].sort((a, b) => scoreMeal(b, context) - scoreMeal(a, context))
    : recipes;

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
              <span className="text-xs text-gray-400">{pantry.length} items</span>
            </div>
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

        {/* Recipe Cards */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">
            {context?.priorityMacro !== "balanced"
              ? "Recommended for You"
              : "All Recipes"}
          </h2>
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
