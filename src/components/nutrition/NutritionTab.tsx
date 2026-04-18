"use client";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Trash2, Plus, Search, Flame, Beef, Wheat, Droplets, Settings } from "lucide-react";
import { useNutritionStore } from "@/store/nutritionStore";
import { MacroRing } from "@/components/ui/MacroRing";
import { MacroBar } from "@/components/ui/MacroBar";

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

export function NutritionTab() {
  const { status, todayLogs, fetchTodayNutrition, logMeal, removeMealLog } =
    useNutritionStore();
  const [activeSection, setActiveSection] = useState<"dashboard" | "log" | "settings">("dashboard");
  const [customForm, setCustomForm] = useState<CustomFoodForm>({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    mealType: "snack",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: "recipe" | "menu"; id: number; name: string; calories: number; protein: number; carbs: number; fats: number; subtitle: string }[]>([]);
  const [userSettings, setUserSettings] = useState({
    name: "Alex",
    dailyCalories: 2000,
    dailyProtein: 150,
    dailyCarbs: 200,
    dailyFats: 65,
    goal: "maintenance",
    dietPreference: "none",
  });

  useEffect(() => {
    fetchTodayNutrition();
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        if (u) setUserSettings(u);
      });
  }, []);

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
    await logMeal({
      mealType: customForm.mealType,
      calories: Number(customForm.calories),
      protein: Number(customForm.protein || 0),
      carbs: Number(customForm.carbs || 0),
      fats: Number(customForm.fats || 0),
      customName: customForm.name,
    });
    setCustomForm({ name: "", calories: "", protein: "", carbs: "", fats: "", mealType: "snack" });
  };

  const saveSettings = async () => {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userSettings),
    });
    fetchTodayNutrition();
  };

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
        {/* Sub-tabs */}
        <div className="flex border-b border-gray-100">
          {(["dashboard", "log"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeSection === s
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-500 border-transparent"
              }`}
            >
              {s === "dashboard" ? "Dashboard" : "Log Food"}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD */}
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

          {/* Macro Rings */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Macro Breakdown</h3>
            <div className="flex justify-around">
              <MacroRing
                label="Protein"
                value={status.totals.protein}
                max={status.goals.dailyProtein}
                color={MACRO_COLORS.protein}
                size={90}
              />
              <MacroRing
                label="Carbs"
                value={status.totals.carbs}
                max={status.goals.dailyCarbs}
                color={MACRO_COLORS.carbs}
                size={90}
              />
              <MacroRing
                label="Fats"
                value={status.totals.fats}
                max={status.goals.dailyFats}
                color={MACRO_COLORS.fats}
                size={90}
              />
            </div>
          </div>

          {/* Macro Bars */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Progress</h3>
            <MacroBar label="Protein" value={status.totals.protein} max={status.goals.dailyProtein} color={MACRO_COLORS.protein} />
            <MacroBar label="Carbs" value={status.totals.carbs} max={status.goals.dailyCarbs} color={MACRO_COLORS.carbs} />
            <MacroBar label="Fats" value={status.totals.fats} max={status.goals.dailyFats} color={MACRO_COLORS.fats} />
          </div>

          {/* Macro Pie Chart */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Calorie Sources</h3>
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
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

          {/* Bar Chart by Meal Type */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Calories by Meal</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={macroByMealType} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
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
                  <button
                    onClick={() => removeMealLog(log.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOG FOOD */}
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

          {/* Search Food */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Search Foods</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchFood(e.target.value);
                  }}
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
                      <p className="text-[10px] text-gray-400">P: {item.protein}g</p>
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
                  { key: "calories", label: "Calories (kcal) *", suffix: "" },
                  { key: "protein", label: "Protein (g)", suffix: "" },
                  { key: "carbs", label: "Carbs (g)", suffix: "" },
                  { key: "fats", label: "Fats (g)", suffix: "" },
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
                Log Food
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeSection === "settings" && (
        <div className="px-4 pt-4 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Profile & Goals</h3>
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
                onChange={(e) => setUserSettings({ ...userSettings, goal: e.target.value })}
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
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "dailyCalories", label: "Daily Calories", unit: "kcal" },
                { key: "dailyProtein", label: "Daily Protein", unit: "g" },
                { key: "dailyCarbs", label: "Daily Carbs", unit: "g" },
                { key: "dailyFats", label: "Daily Fats", unit: "g" },
              ].map(({ key, label, unit }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label} ({unit})</label>
                  <input
                    type="number"
                    min="0"
                    value={userSettings[key as keyof typeof userSettings]}
                    onChange={(e) =>
                      setUserSettings({ ...userSettings, [key]: Number(e.target.value) })
                    }
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
            </div>
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
