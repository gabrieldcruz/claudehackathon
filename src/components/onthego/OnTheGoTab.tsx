"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  LocateFixed,
  Search,
  MapPin,
  Star,
  DollarSign,
} from "lucide-react";
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
  id: number | string;
  placeId?: string;
  name: string;
  cuisine: string;
  imageUrl: string;
  rating: number;
  priceRange: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  distanceMeters?: number;
  source?: "local" | "google";
  hasNutrition?: boolean;
  menuItems: MenuItemData[];
}

interface UserLocation {
  lat: number;
  lng: number;
}

export function OnTheGoTab() {
  const { status, context, todayLogs, fetchTodayNutrition, logMeal } =
    useNutritionStore();
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loggedId, setLoggedId] = useState<number | null>(null);
  const [mealTypeMap, setMealTypeMap] = useState<Record<number, string>>({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [restaurantError, setRestaurantError] = useState("");
  const [userDietPreference, setUserDietPreference] = useState("none");

  const filters = [
    { label: "All", value: "all" },
    { label: "High Protein", value: "high-protein" },
    { label: "Low Carb", value: "low-carb" },
    { label: "Low Cal", value: "low-calorie" },
    { label: "Vegan", value: "vegan" },
    { label: "Halal", value: "halal" },
  ];

  useEffect(() => {
    fetchTodayNutrition();
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        if (u?.dietPreference && u.dietPreference !== "none") {
          setUserDietPreference(u.dietPreference);
          setActiveFilter(u.dietPreference);
        }
      });
  }, [fetchTodayNutrition]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (activeFilter !== "all") params.set("tag", activeFilter);
    if (userLocation) {
      params.set("lat", String(userLocation.lat));
      params.set("lng", String(userLocation.lng));
    }

    const endpoint = userLocation ? "/api/restaurants/nearby" : "/api/restaurants";
    const qs = params.toString() ? `?${params.toString()}` : "";

    fetch(`${endpoint}${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Restaurants unavailable");
        return data as RestaurantData[];
      })
      .then((data) => {
        setRestaurantError("");
        setRestaurants(data);
      })
      .catch((error: Error) => {
        setRestaurantError(error.message);
        setRestaurants([]);
      });
  }, [searchQuery, activeFilter, userLocation]);

  const handleUseLocation = () => {
    setLocationError("");
    setRestaurantError("");

    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoadingLocation(false);
      },
      () => {
        setLocationError("Location permission was denied or unavailable.");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    setLocationError("");
    setRestaurantError("");
  };

  const formatDistance = (meters?: number) => {
    if (meters === undefined || !Number.isFinite(meters)) return "";
    const miles = meters / 1609.344;
    return miles < 0.1 ? "Nearby" : `${miles.toFixed(1)} mi`;
  };

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

  const todaySpend = todayLogs.reduce((sum, log) => {
    if (log.menuItem?.price) return sum + log.menuItem.price * log.servings;
    return sum;
  }, 0);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">On the Go</h1>
        <p className="text-sm text-gray-500">Eat smart at restaurants nearby</p>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {context && <IntelligenceBanner context={context} />}

        {status && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between text-sm mb-3">
              <span className="font-semibold text-gray-700">Remaining Budget</span>
              <span className="text-indigo-600 font-bold">
                {Math.round(status.remaining.calories)} kcal
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-blue-50 rounded-xl p-2">
                <p className="text-xs font-bold text-blue-600">
                  {Math.round(status.remaining.protein)}g
                </p>
                <p className="text-[10px] text-gray-500">Protein left</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2">
                <p className="text-xs font-bold text-amber-600">
                  {Math.round(status.remaining.carbs)}g
                </p>
                <p className="text-[10px] text-gray-500">Carbs left</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-2">
                <p className="text-xs font-bold text-pink-600">
                  {Math.round(status.remaining.fats)}g
                </p>
                <p className="text-[10px] text-gray-500">Fats left</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                Today&apos;s restaurant spend
              </span>
              <span className="text-sm font-bold text-emerald-600">
                ${todaySpend.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-4 py-3 outline-none focus:border-indigo-400 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUseLocation}
              disabled={isLoadingLocation}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isLoadingLocation ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" />
              )}
              {userLocation ? "Refresh nearby" : "Use my location"}
            </button>
            {userLocation && (
              <button
                onClick={handleClearLocation}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600"
              >
                Show saved picks
              </button>
            )}
          </div>

          {userLocation && (
            <p className="text-xs font-medium text-emerald-700">
              Nearby saved-menu matches appear first when nutrition is available.
            </p>
          )}
          {(locationError || restaurantError) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {locationError || restaurantError}
            </p>
          )}
        </div>

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

        {userDietPreference !== "none" && (
          <p className="text-xs text-indigo-500 -mt-2">
            Filtered for your <strong>{userDietPreference}</strong> preference
          </p>
        )}

        {restaurants.map((restaurant) => {
          const scored = context
            ? [...restaurant.menuItems].sort(
                (a, b) => scoreMeal(b, context) - scoreMeal(a, context)
              )
            : restaurant.menuItems;

          return (
            <div key={restaurant.id} className="space-y-3">
              <div className="flex items-center gap-3">
                {restaurant.imageUrl && (
                  <img
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    className="w-12 h-12 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 text-base">
                    {restaurant.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      {restaurant.rating}
                    </span>
                    <span>·</span>
                    <span>{restaurant.cuisine}</span>
                    <span>·</span>
                    <span>{restaurant.priceRange}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{restaurant.address}</span>
                    {restaurant.distanceMeters !== undefined && (
                      <>
                        <span>·</span>
                        <span>{formatDistance(restaurant.distanceMeters)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {restaurant.source === "google" && restaurant.menuItems.length > 0 && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  Recommended items matched from saved nutrition data.
                </p>
              )}

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

              {restaurant.source === "google" && restaurant.menuItems.length === 0 && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">Nearby pick</p>
                  <p className="mt-1 text-xs">
                    Check the menu before logging a meal. Google Places does not return nutrition
                    details.
                  </p>
                  {restaurant.placeId && (
                    <a
                      href={`https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Open in Google Maps
                    </a>
                  )}
                </div>
              )}

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
