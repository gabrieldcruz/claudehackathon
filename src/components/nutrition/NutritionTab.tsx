"use client";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Trash2,
  Plus,
  Search,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Settings,
  DollarSign,
  TrendingUp,
  History,
  RotateCcw,
} from "lucide-react";
import { useNutritionStore } from "@/store/nutritionStore";
import { MacroRing } from "@/components/ui/MacroRing";
import { MacroBar } from "@/components/ui/MacroBar";
import { calculateDailyGoals, normalizeGoal } from "@/lib/user-goals";
import type { AppUserProfile } from "@/types";
import {
  getImperialBodyMetricsForm,
  parseImperialBodyMetrics,
} from "@/lib/body-metrics";

const MACRO_COLORS = {
  protein: "#3b82f6",
  carbs: "#f59e0b",
  fats: "#ec4899",
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

interface CustomFoodForm {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  mealType: string;
}

interface SavedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  savedAt: number;
}

interface HistoryDay {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

function loadSavedFoods(): SavedFood[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("savedFoods") || "[]");
  } catch {
    return [];
  }
}

function persistSavedFoods(foods: SavedFood[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("savedFoods", JSON.stringify(foods.slice(0, 20)));
  }
}

function loadBudget(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("dailyBudget") || "";
}

export function NutritionTab() {
  const { status, todayLogs, fetchTodayNutrition, logMeal, removeMealLog } =
    useNutritionStore();
  const [activeSection, setActiveSection] = useState<"dashboard" | "log" | "history" | "settings">("dashboard");
  const [customForm, setCustomForm] = useState<CustomFoodForm>({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    mealType: "snack",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    type: "recipe" | "menu";
    id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    subtitle: string;
  }[]>([]);
  const [userSettings, setUserSettings] = useState<AppUserProfile>({
    id: 1,
    name: "Alex",
    heightCm: 170,
    weightKg: 70,
    dailyCalories: 2000,
    dailyProtein: 150,
    dailyCarbs: 200,
    dailyFats: 65,
    goal: "maintenance",
    dietPreference: "none",
  });
  const [bodyMetricsForm, setBodyMetricsForm] = useState(() =>
    getImperialBodyMetricsForm(170, 70)
  );
  const [settingsError, setSettingsError] = useState("");

  // Saved foods
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>(loadSavedFoods);

  // History
  const [weekHistory, setWeekHistory] = useState<HistoryDay[]>([]);
  const [historyMacro, setHistoryMacro] = useState<"calories" | "protein" | "carbs" | "fats">("calories");

  // Budget
  const [dailyBudget, setDailyBudget] = useState(loadBudget);
  const [budgetInput, setBudgetInput] = useState(loadBudget);

  useEffect(() => {
    fetchTodayNutrition();
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        if (u) {
          setUserSettings(u);
          setBodyMetricsForm(getImperialBodyMetricsForm(u.heightCm, u.weightKg));
        }
      });
  }, [fetchTodayNutrition]);

  useEffect(() => {
    if (activeSection === "history" && weekHistory.length === 0) {
      fetch("/api/nutrition/history")
        .then((r) => r.json())
        .then(setWeekHistory);
    }
  }, [activeSection, weekHistory.length]);

  const searchFood = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const [recipes, restaurants] = await Promise.all([
      fetch(`/api/recipes?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      fetch(`/api/restaurants?q=${encodeURIComponent(q)}`).then((r) => r.json()),
    ]);
    const results = [
      ...recipes.map((r: { id: number; name: string; calories: number; protein: number; carbs: number; fats: number }) => ({
        type: "recipe" as const,
        id: r.id,
        name: r.name,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        subtitle: "Recipe",
      })),
      ...restaurants.flatMap((rest: { name: string; menuItems: { id: number; name: string; calories: number; protein: number; carbs: number; fats: number }[] }) =>
        rest.menuItems.map((item) => ({
          type: "menu" as const,
          id: item.id,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
          subtitle: rest.name,
        }))
      ),
    ];
    setSearchResults(results);
  };

  const logSearchResult = async (item: typeof searchResults[0]) => {
    await logMeal({
      mealType: "snack",
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      recipeId: item.type === "recipe" ? item.id : undefined,
      menuItemId: item.type === "menu" ? item.id : undefined,
      customName: item.name,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleCustomLog = async () => {
    if (!customForm.name || !customForm.calories) return;
    const food: SavedFood = {
      name: customForm.name,
      calories: Number(customForm.calories),
      protein: Number(customForm.protein || 0),
      carbs: Number(customForm.carbs || 0),
      fats: Number(customForm.fats || 0),
      savedAt: Date.now(),
    };
    await logMeal({
      mealType: customForm.mealType,
      ...food,
      customName: food.name,
    });
    // Save for reuse — deduplicate by name, newest first
    const updated = [food, ...savedFoods.filter((f) => f.name.toLowerCase() !== food.name.toLowerCase())];
    setSavedFoods(updated);
    persistSavedFoods(updated);
    setCustomForm({ name: "", calories: "", protein: "", carbs: "", fats: "", mealType: "snack" });
  };

  const relogSavedFood = async (food: SavedFood, mealType = "snack") => {
    await logMeal({
      mealType,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      customName: food.name,
    });
  };

  const removeSavedFood = (name: string) => {
    const updated = savedFoods.filter((f) => f.name !== name);
    setSavedFoods(updated);
    persistSavedFoods(updated);
  };

  const saveBudget = () => {
    setDailyBudget(budgetInput);
    if (typeof window !== "undefined") {
      localStorage.setItem("dailyBudget", budgetInput);
    }
  };

  const saveSettings = async () => {
    setSettingsError("");
    const parsedBodyMetrics = parseImperialBodyMetrics(bodyMetricsForm);
    if (!parsedBodyMetrics) {
      setSettingsError("Enter a valid height in feet/inches and weight in pounds.");
      return;
    }
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...userSettings,
        heightCm: parsedBodyMetrics.heightCm,
        weightKg: parsedBodyMetrics.weightKg,
      }),
    });
    const data = await readJsonSafely(res);
    if (!res.ok) {
      setSettingsError(getSettingsErrorMessage(data) || "Unable to save your settings.");
      return;
    }
    if (!data || "error" in data) {
      setSettingsError("Unable to save your settings.");
      return;
    }
    const updatedUser = data as AppUserProfile;
    setUserSettings(updatedUser);
    setBodyMetricsForm(getImperialBodyMetricsForm(updatedUser.heightCm, updatedUser.weightKg));
    await fetchTodayNutrition(true);
  };

  const parsedSettingsBodyMetrics = parseImperialBodyMetrics(bodyMetricsForm);
  const projectedGoals = parsedSettingsBodyMetrics
    ? calculateDailyGoals({
        heightCm: parsedSettingsBodyMetrics.heightCm,
        weightKg: parsedSettingsBodyMetrics.weightKg,
        goal: userSettings.goal,
      })
    : null;

  const macroByMealType = MEAL_TYPES.map((type) => {
    const entries = todayLogs.filter((l) => l.mealType === type);
    return {
      name: type.charAt(0).toUpperCase() + type.slice(1),
      calories: Math.round(entries.reduce((s, l) => s + l.calories, 0)),
      protein: Math.round(entries.reduce((s, l) => s + l.protein, 0)),
    };
  });

  const pieData = status
    ? [
        { name: "Protein", value: Math.round(status.totals.protein * 4), color: MACRO_COLORS.protein },
        { name: "Carbs", value: Math.round(status.totals.carbs * 4), color: MACRO_COLORS.carbs },
        { name: "Fats", value: Math.round(status.totals.fats * 9), color: MACRO_COLORS.fats },
      ].filter((d) => d.value > 0)
    : [];

  // Budget calculations
  const todaySpend = todayLogs.reduce(
    (sum, log) => sum + (log.menuItem?.price ?? 0) * log.servings,
    0
  );
  const budgetNum = parseFloat(dailyBudget) || 0;
  const budgetPct = budgetNum > 0 ? Math.min(100, (todaySpend / budgetNum) * 100) : 0;
  const budgetOver = budgetNum > 0 && todaySpend > budgetNum;

  const SUB_TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "log", label: "Log Food" },
    { id: "history", label: "History" },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nutrition</h1>
            <p className="text-sm text-gray-500">Track your daily macros</p>
          </div>
          <button
            onClick={() => setActiveSection("settings")}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex border-b border-gray-100">
          {SUB_TABS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeSection === s.id
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-500 border-transparent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      {activeSection === "dashboard" && status && (
        <div className="px-4 pt-4 space-y-5">
          {/* Calorie Hero */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-sm opacity-80 mb-1">Calories Today</p>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-bold">{Math.round(status.totals.calories)}</span>
              <span className="text-lg opacity-70 mb-1">/ {status.goals.dailyCalories}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, status.percentages.calories)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs opacity-70">
              <span>{Math.round(status.remaining.calories)} kcal remaining</span>
              <span>{status.percentages.calories}% of goal</span>
            </div>
          </div>

          {/* Budget card — only shown if budget is set OR meals logged */}
          {(budgetNum > 0 || todaySpend > 0) && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Food Budget</h3>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${budgetOver ? "text-red-500" : "text-emerald-600"}`}>
                    ${todaySpend.toFixed(2)}
                  </span>
                  {budgetNum > 0 && (
                    <span className="text-xs text-gray-400 ml-1">/ ${budgetNum.toFixed(2)}</span>
                  )}
                </div>
              </div>
              {budgetNum > 0 && (
                <>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        budgetOver ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <p className={`text-xs ${budgetOver ? "text-red-400" : "text-gray-400"}`}>
                    {budgetOver
                      ? `$${(todaySpend - budgetNum).toFixed(2)} over budget`
                      : `$${(budgetNum - todaySpend).toFixed(2)} remaining today`}
                  </p>
                </>
              )}
              {todaySpend > 0 && (
                <div className="mt-2 space-y-1">
                  {todayLogs.filter((l) => l.menuItem?.price).map((log) => (
                    <div key={log.id} className="flex justify-between text-xs text-gray-500">
                      <span className="truncate flex-1">{log.menuItem?.name ?? log.customName}</span>
                      <span className="font-medium text-emerald-600 ml-2">
                        ${((log.menuItem?.price ?? 0) * log.servings).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Macro Rings */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Macro Breakdown</h3>
            <div className="flex justify-around">
              <MacroRing label="Protein" value={status.totals.protein} max={status.goals.dailyProtein} color={MACRO_COLORS.protein} size={90} />
              <MacroRing label="Carbs" value={status.totals.carbs} max={status.goals.dailyCarbs} color={MACRO_COLORS.carbs} size={90} />
              <MacroRing label="Fats" value={status.totals.fats} max={status.goals.dailyFats} color={MACRO_COLORS.fats} size={90} />
            </div>
          </div>

          {/* Macro Bars */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Progress</h3>
            <MacroBar label="Protein" value={status.totals.protein} max={status.goals.dailyProtein} color={MACRO_COLORS.protein} />
            <MacroBar label="Carbs" value={status.totals.carbs} max={status.goals.dailyCarbs} color={MACRO_COLORS.carbs} />
            <MacroBar label="Fats" value={status.totals.fats} max={status.goals.dailyFats} color={MACRO_COLORS.fats} />
          </div>

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Calorie Sources</h3>
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-700 font-medium">{d.name}</span>
                      <span className="text-gray-400">{d.value} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bar chart by meal */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Calories by Meal</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={macroByMealType} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <Bar dataKey="calories" fill="#6366f1" radius={[4, 4, 0, 0]} name="Calories" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Today's Log */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Today&apos;s Log</h3>
              <span className="text-xs text-gray-400">{todayLogs.length} entries</span>
            </div>
            {todayLogs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No meals logged yet</p>
            )}
            <div className="divide-y divide-gray-50">
              {todayLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.mealType === "breakfast" ? "bg-yellow-400" :
                    log.mealType === "lunch" ? "bg-green-400" :
                    log.mealType === "dinner" ? "bg-blue-400" : "bg-purple-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {log.recipe?.name ?? log.menuItem?.name ?? log.customName}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{log.mealType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{Math.round(log.calories)} kcal</p>
                    <p className="text-[10px] text-gray-400">P:{Math.round(log.protein)}g C:{Math.round(log.carbs)}g F:{Math.round(log.fats)}g</p>
                  </div>
                  <button onClick={() => removeMealLog(log.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Tracker */}
          {(() => {
            const restaurantLogs = todayLogs.filter((l) => l.menuItem?.price);
            const todaySpend = restaurantLogs.reduce(
              (sum, l) => sum + (l.menuItem?.price ?? 0) * l.servings,
              0
            );
            if (restaurantLogs.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Today&apos;s Spend</h3>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">${todaySpend.toFixed(2)}</span>
                </div>
                <div className="space-y-1.5">
                  {restaurantLogs.map((log) => (
                    <div key={log.id} className="flex justify-between text-xs text-gray-600">
                      <span className="truncate flex-1">{log.menuItem?.name ?? log.customName}</span>
                      <span className="font-medium ml-2 text-emerald-600">
                        ${((log.menuItem?.price ?? 0) * log.servings).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── LOG FOOD ── */}
      {activeSection === "log" && (
        <div className="px-4 pt-4 space-y-5">
          {/* Quick stats */}
          {status && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Flame, label: "kcal", value: Math.round(status.remaining.calories), color: "text-orange-500", bg: "bg-orange-50" },
                { icon: Beef, label: "P left", value: `${Math.round(status.remaining.protein)}g`, color: "text-blue-500", bg: "bg-blue-50" },
                { icon: Wheat, label: "C left", value: `${Math.round(status.remaining.carbs)}g`, color: "text-amber-500", bg: "bg-amber-50" },
                { icon: Droplets, label: "F left", value: `${Math.round(status.remaining.fats)}g`, color: "text-pink-500", bg: "bg-pink-50" },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
                  <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                  <p className={`text-xs font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Saved/Recent Foods */}
          {savedFoods.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-gray-900">Saved Foods</h3>
                <span className="text-xs text-gray-400 ml-auto">{savedFoods.length} items</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {savedFoods.map((food) => (
                  <div key={food.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{food.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {food.calories} kcal · P:{food.protein}g · C:{food.carbs}g · F:{food.fats}g
                      </p>
                    </div>
                    <button
                      onClick={() => relogSavedFood(food)}
                      className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1.5 hover:bg-indigo-100 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Log
                    </button>
                    <button
                      onClick={() => removeSavedFood(food.name)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Food */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Search Foods</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); searchFood(e.target.value); }}
                  placeholder="Search recipes or restaurant items..."
                  className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => logSearchResult(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.subtitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-700">{item.calories} kcal</p>
                      <p className="text-[10px] text-gray-400">
                        P:{item.protein}g
                        {item.fats < 5 && <span className="ml-1 text-pink-500 font-medium">low-fat</span>}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Food Entry */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Log Custom Food</h3>
            <p className="text-xs text-gray-400 mb-3">Custom foods are saved for quick re-logging.</p>
            <div className="space-y-3">
              <input
                value={customForm.name}
                onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                placeholder="Food name *"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400"
              />
              <select
                value={customForm.mealType}
                onChange={(e) => setCustomForm({ ...customForm, mealType: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 bg-white"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories", label: "Calories (kcal) *" },
                  { key: "protein", label: "Protein (g)" },
                  { key: "carbs", label: "Carbs (g)" },
                  { key: "fats", label: "Fats (g)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={customForm[key as keyof typeof customForm]}
                      onChange={(e) => setCustomForm({ ...customForm, [key]: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleCustomLog}
                disabled={!customForm.name || !customForm.calories}
                className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Log &amp; Save Food
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {/* HISTORY */}
      {activeSection === "history" && (
        <div className="px-4 pt-4 space-y-5">
          {/* Weekly calorie goal line */}
          {status && (
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-indigo-900 text-sm">Daily Goal</h3>
              </div>
              <p className="text-xs text-indigo-600">
                Target: <strong>{status.goals.dailyCalories} kcal</strong> · {status.goals.dailyProtein}g protein · {status.goals.dailyCarbs}g carbs · {status.goals.dailyFats}g fats
                Target: <strong>{status.goals.dailyCalories} kcal</strong> ·{" "}
                {status.goals.dailyProtein}g protein · {status.goals.dailyCarbs}g carbs ·{" "}
                {status.goals.dailyFats}g fats
              </p>
            </div>
          )}

          {/* Macro selector */}
          <div className="flex gap-2">
            {(["calories", "protein", "carbs", "fats"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setHistoryMacro(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${
                  historyMacro === m
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Weekly Line Chart */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 capitalize">
              {historyMacro === "calories" ? "Calories" : historyMacro.charAt(0).toUpperCase() + historyMacro.slice(1)} — Last 7 Days
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              {historyMacro === "calories" ? "kcal" : "grams"} per day
            </p>
            {weekHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weekHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v: string) => v.split(",")[0]}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v) =>
                      historyMacro === "calories" ? [`${v} kcal`, "Calories"] : [`${v}g`, historyMacro]
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey={historyMacro}
                    stroke={
                      historyMacro === "calories"
                        ? "#6366f1"
                        : historyMacro === "protein"
                        ? "#3b82f6"
                        : historyMacro === "carbs"
                        ? "#f59e0b"
                        : "#ec4899"
                    }
                    strokeWidth={2}
                    dot={{ r: 4, fill: "white", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  {/* Goal reference line rendered as a regular line on duplicate data */}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                Loading history...
              </div>
            )}
          </div>

          {/* Daily breakdown table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">Daily Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {weekHistory.map((day) => (
                <div key={day.date} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{day.label}</p>
                    <p className="text-xs text-gray-400">
                      P:{day.protein}g · C:{day.carbs}g · F:{day.fats}g
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{day.calories} kcal</p>
                    {status && (
                      <p
                        className={`text-[10px] font-medium ${
                          day.calories === 0
                            ? "text-gray-300"
                            : day.calories > status.goals.dailyCalories
                            ? "text-red-400"
                            : "text-emerald-500"
                        }`}
                      >
                        {day.calories === 0
                          ? "No data"
                          : day.calories > status.goals.dailyCalories
                          ? `+${day.calories - status.goals.dailyCalories} over`
                          : `${status.goals.dailyCalories - day.calories} under`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeSection === "settings" && (
        <div className="px-4 pt-4 space-y-5">
          {/* Budget setting */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Daily Food Budget</h3>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 25.00"
                  className="w-full text-sm border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={saveBudget}
                className="bg-emerald-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>
            </div>
            {dailyBudget && (
              <p className="text-xs text-gray-400 mt-2">Budget set to ${parseFloat(dailyBudget).toFixed(2)}/day</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Profile &amp; Goals</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Name</label>
              <input
                value={userSettings.name}
                onChange={(e) => setUserSettings({ ...userSettings, name: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Goal</label>
              <select
                value={userSettings.goal}
                onChange={(e) => setUserSettings({ ...userSettings, goal: normalizeGoal(e.target.value) })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-indigo-400"
              >
                <option value="cutting">Cutting (lose fat)</option>
                <option value="bulking">Bulking (gain muscle)</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Diet Preference</label>
              <select
                value={userSettings.dietPreference}
                onChange={(e) => setUserSettings({ ...userSettings, dietPreference: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-indigo-400"
              >
                <option value="none">No preference</option>
                <option value="vegan">Vegan</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="keto">Keto</option>
                <option value="halal">Halal</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "heightFeet" as const, label: "Height", unit: "ft", min: "3", max: "7", step: "1" },
                { key: "heightInches" as const, label: "Height", unit: "in", min: "0", max: "11.9", step: "0.1" },
                { key: "weightLbs" as const, label: "Weight", unit: "lbs", min: "77", max: "573.2", step: "0.1" },
              ].map(({ key, label, unit, min, max, step }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label} ({unit})</label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={bodyMetricsForm[key] ?? ""}
                    onChange={(e) => setBodyMetricsForm({ ...bodyMetricsForm, [key]: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Auto-calculated targets</h4>
              <p className="text-xs text-gray-500 mb-3">Your macros update from height, weight, and goal when you save.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "dailyCalories", label: "Calories", value: projectedGoals?.dailyCalories ?? userSettings.dailyCalories, unit: "kcal" },
                  { key: "dailyProtein", label: "Protein", value: projectedGoals?.dailyProtein ?? userSettings.dailyProtein, unit: "g" },
                  { key: "dailyCarbs", label: "Carbs", value: projectedGoals?.dailyCarbs ?? userSettings.dailyCarbs, unit: "g" },
                  { key: "dailyFats", label: "Fats", value: projectedGoals?.dailyFats ?? userSettings.dailyFats, unit: "g" },
                ].map(({ key, label, value, unit }) => (
                  <div key={key} className="rounded-xl bg-white border border-gray-100 px-3 py-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {value} <span className="text-xs font-medium text-gray-400">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {settingsError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {settingsError}
              </p>
            )}
            <button
              onClick={saveSettings}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function readJsonSafely(response: Response): Promise<{ error?: string; details?: string } | AppUserProfile | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as { error?: string; details?: string } | AppUserProfile;
  } catch {
    return null;
  }
}

function getSettingsErrorMessage(data: { error?: string; details?: string } | AppUserProfile | null) {
  if (!data || !("error" in data)) return "";
  return [data.error, data.details].filter(Boolean).join(" ");
}
