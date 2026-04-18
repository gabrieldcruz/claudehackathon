"use client";
import { useEffect, useState } from "react";
import { Search, MapPin, Star, DollarSign } from "lucide-react";
import { useNutritionStore } from "@/store/nutritionStore";
import { IntelligenceBanner } from "@/components/ui/IntelligenceBanner";
import { MealCard } from "@/components/ui/MealCard";
import { scoreMeal } from "@/lib/intelligence";

interface MenuItemData {
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
}

interface RestaurantData {
  id: number;
  name: string;
  cuisine: string;
  imageUrl: string;
  rating: number;
  priceRange: string;
  address: string;
  menuItems: MenuItemData[];
}

export function OnTheGoTab() {
  const { status, context, fetchTodayNutrition, logMeal } = useNutritionStore();
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loggedId, setLoggedId] = useState<number | null>(null);
  const [mealTypeMap, setMealTypeMap] = useState<Record<number, string>>({});
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { label: "All", value: "all" },
    { label: "High Protein", value: "high-protein" },
    { label: "Low Carb", value: "low-carb" },
    { label: "Low Cal", value: "low-calorie" },
    { label: "Vegan", value: "vegan" },
  ];

  useEffect(() => {
    fetchTodayNutrition();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (activeFilter !== "all") params.set("tag", activeFilter);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/restaurants${qs}`)
      .then((r) => r.json())
      .then(setRestaurants);
  }, [searchQuery, activeFilter]);

  const handleLog = async (item: MenuItemData, restaurantName: string) => {
    const mealType = mealTypeMap[item.id] ?? "lunch";
    await logMeal({
      mealType,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      menuItemId: item.id,
      customName: `${item.name} @ ${restaurantName}`,
    });
    setLoggedId(item.id);
    setTimeout(() => setLoggedId(null), 2000);
  };

  // Flatten all items for scoring, keep restaurant reference
  const allItems = restaurants.flatMap((r) =>
    r.menuItems.map((item) => ({ ...item, restaurantData: r }))
  );

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">On the Go</h1>
        <p className="text-sm text-gray-500">Eat smart at restaurants nearby</p>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Intelligence Banner */}
        {context && <IntelligenceBanner context={context} />}

        {/* Calorie Summary */}
        {status && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Remaining Budget</span>
              <span className="text-indigo-600 font-bold">
                {Math.round(status.remaining.calories)} kcal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-xl p-2">
                <p className="text-xs font-bold text-blue-600">{Math.round(status.remaining.protein)}g</p>
                <p className="text-[10px] text-gray-500">Protein left</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2">
                <p className="text-xs font-bold text-amber-600">{Math.round(status.remaining.carbs)}g</p>
                <p className="text-[10px] text-gray-500">Carbs left</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-2">
                <p className="text-xs font-bold text-pink-600">{Math.round(status.remaining.fats)}g</p>
                <p className="text-[10px] text-gray-500">Fats left</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurants..."
            className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-4 py-3 outline-none focus:border-indigo-400 bg-white"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
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

        {/* Restaurant Sections */}
        {restaurants.map((restaurant) => {
          const scored = context
            ? [...restaurant.menuItems].sort(
                (a, b) => scoreMeal(b, context) - scoreMeal(a, context)
              )
            : restaurant.menuItems;

          return (
            <div key={restaurant.id} className="space-y-3">
              {/* Restaurant Header */}
              <div className="flex items-center gap-3">
                {restaurant.imageUrl && (
                  <img
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    className="w-12 h-12 rounded-xl object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 text-base">{restaurant.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      {restaurant.rating}
                    </span>
                    <span>·</span>
                    <span>{restaurant.cuisine}</span>
                    <span>·</span>
                    <span className="flex items-center">
                      {restaurant.priceRange}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{restaurant.address}</span>
                  </div>
                </div>
              </div>

              {scored.map((item, idx) => (
                <div key={item.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <select
                      value={mealTypeMap[item.id] ?? "lunch"}
                      onChange={(e) =>
                        setMealTypeMap({ ...mealTypeMap, [item.id]: e.target.value })
                      }
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white outline-none"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                    {item.price > 0 && (
                      <span className="flex items-center text-xs text-gray-500 font-medium">
                        <DollarSign className="w-3 h-3" />
                        {item.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <MealCard
                    name={item.name}
                    description={item.description}
                    imageUrl={item.imageUrl}
                    calories={item.calories}
                    protein={item.protein}
                    carbs={item.carbs}
                    fats={item.fats}
                    tags={item.tags}
                    recommended={idx === 0 && context?.priorityMacro !== "balanced"}
                    onLog={() => handleLog(item, restaurant.name)}
                  />
                  {loggedId === item.id && (
                    <p className="text-xs text-emerald-600 font-medium text-center mt-2">
                      Logged successfully!
                    </p>
                  )}
                </div>
              ))}

              <div className="border-b border-gray-100 pt-2" />
            </div>
          );
        })}

        {restaurants.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No restaurants found</p>
          </div>
        )}
      </div>
    </div>
  );
}
