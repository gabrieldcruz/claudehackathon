import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface GooglePlace {
  place_id?: string;
  name?: string;
  vicinity?: string;
  rating?: number;
  price_level?: number;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  photos?: {
    photo_reference: string;
  }[];
  types?: string[];
}

interface GooglePlacesResponse {
  results?: GooglePlace[];
  status: string;
  error_message?: string;
}

const keywordByTag: Record<string, string> = {
  "high-protein": "high protein restaurant",
  "low-carb": "low carb restaurant",
  "low-calorie": "healthy restaurant",
  vegan: "vegan restaurant",
};

function priceRange(priceLevel?: number) {
  if (priceLevel === undefined) return "";
  return "$".repeat(Math.max(1, Math.min(priceLevel, 4)));
}

function cuisineFromTypes(types?: string[]) {
  const type = types?.find(
    (value) =>
      ![
        "restaurant",
        "food",
        "point_of_interest",
        "establishment",
        "meal_takeaway",
        "meal_delivery",
      ].includes(value)
  );

  return type
    ? type
        .split("_")
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(" ")
    : "Restaurant";
}

function photoUrl(photoReference: string, apiKey: string) {
  const params = new URLSearchParams({
    maxwidth: "400",
    photo_reference: photoReference,
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|restaurant|restaurants|grill|kitchen|cafe|bar)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingRestaurant<
  T extends { id: number; name: string; menuItems: unknown[] },
>(placeName: string, restaurants: T[]) {
  const normalizedPlaceName = normalizeName(placeName);

  return restaurants.find((restaurant) => {
    const normalizedLocalName = normalizeName(restaurant.name);
    return (
      normalizedPlaceName === normalizedLocalName ||
      normalizedPlaceName.includes(normalizedLocalName) ||
      normalizedLocalName.includes(normalizedPlaceName)
    );
  });
}

async function fetchNearbyPlaces(apiKey: string, lat: number, lng: number, keyword: string) {
  const placesParams = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: "5000",
    type: "restaurant",
    key: apiKey,
  });

  if (keyword) placesParams.set("keyword", keyword);

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${placesParams.toString()}`,
    { cache: "no-store" }
  );
  const data = (await response.json()) as GooglePlacesResponse;

  return { response, data };
}

function placeKey(place: GooglePlace) {
  return place.place_id ?? `${normalizeName(place.name ?? "")}:${place.vicinity ?? ""}`;
}

function distanceMeters(
  origin: { lat: number; lng: number },
  destination?: { lat: number; lng: number }
) {
  if (!destination) return Number.POSITIVE_INFINITY;

  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

function restaurantKey(restaurant: { localRestaurantId: number | null; name: string }) {
  return restaurant.localRestaurantId
    ? `local:${restaurant.localRestaurantId}`
    : `name:${normalizeName(restaurant.name)}`;
}

function keepClosestRestaurant<
  T extends { localRestaurantId: number | null; name: string; distanceMeters: number },
>(restaurants: T[]) {
  const closestByRestaurant = new Map<string, T>();

  for (const restaurant of restaurants) {
    const key = restaurantKey(restaurant);
    const existing = closestByRestaurant.get(key);

    if (!existing || restaurant.distanceMeters < existing.distanceMeters) {
      closestByRestaurant.set(key, restaurant);
    }
  }

  return Array.from(closestByRestaurant.values());
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_API_KEY server environment variable." },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const query = searchParams.get("q")?.trim() ?? "";
  const tag = searchParams.get("tag") ?? "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required." },
      { status: 400 }
    );
  }

  const localRestaurants = await prisma.restaurant.findMany({
    where: query ? { name: { contains: query } } : {},
    include: {
      menuItems: {
        where: tag ? { tags: { contains: tag } } : {},
        orderBy: { name: "asc" },
      },
    },
  });

  const nutritionCandidates = localRestaurants
    .filter((restaurant) => restaurant.menuItems.length > 0)
    .slice(0, 8);

  const generalKeyword = [query, keywordByTag[tag] ?? ""].filter(Boolean).join(" ");
  const [generalResult, ...candidateResults] = await Promise.all([
    fetchNearbyPlaces(apiKey, lat, lng, generalKeyword),
    ...nutritionCandidates.map((restaurant) =>
      fetchNearbyPlaces(apiKey, lat, lng, restaurant.name)
    ),
  ]);

  if (
    !generalResult.response.ok ||
    !["OK", "ZERO_RESULTS"].includes(generalResult.data.status)
  ) {
    return NextResponse.json(
      {
        error: generalResult.data.error_message ?? "Google Places request failed.",
        status: generalResult.data.status,
      },
      { status: 502 }
    );
  }

  const placesByKey = new Map<string, GooglePlace>();

  for (const result of candidateResults) {
    if (!result.response.ok || !["OK", "ZERO_RESULTS"].includes(result.data.status)) {
      continue;
    }

    for (const place of result.data.results ?? []) {
      placesByKey.set(placeKey(place), place);
    }
  }

  for (const place of generalResult.data.results ?? []) {
    const key = placeKey(place);
    if (!placesByKey.has(key)) placesByKey.set(key, place);
  }

  const restaurants = keepClosestRestaurant(
    Array.from(placesByKey.values())
    .map((place) => {
      const localMatch = place.name
        ? findMatchingRestaurant(place.name, localRestaurants)
        : undefined;
      const location = place.geometry?.location ?? null;

      return {
        id: place.place_id ?? place.name ?? "",
        localRestaurantId: localMatch?.id ?? null,
        placeId: place.place_id ?? "",
        name: place.name ?? localMatch?.name ?? "Restaurant",
        cuisine: localMatch?.cuisine ?? cuisineFromTypes(place.types),
        imageUrl: place.photos?.[0]?.photo_reference
          ? photoUrl(place.photos[0].photo_reference, apiKey)
          : localMatch?.imageUrl ?? "",
        rating: place.rating ?? localMatch?.rating ?? 0,
        priceRange: priceRange(place.price_level) || localMatch?.priceRange || "",
        address: place.vicinity ?? localMatch?.address ?? "",
        location,
        distanceMeters: distanceMeters({ lat, lng }, location ?? undefined),
        source: "google",
        hasNutrition: Boolean(localMatch?.menuItems.length),
        menuItems: localMatch?.menuItems ?? [],
      };
    })
  )
    .sort((a, b) => {
      if (a.hasNutrition !== b.hasNutrition) return a.hasNutrition ? -1 : 1;
      if (a.hasNutrition && b.hasNutrition) {
        return a.distanceMeters - b.distanceMeters;
      }
      return b.rating - a.rating;
    });

  return NextResponse.json(restaurants);
}
