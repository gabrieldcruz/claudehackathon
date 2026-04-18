"use client";
import { create } from "zustand";
import type { NutritionStatus, IntelligenceContext, MealLogEntry } from "@/types";
import { getIntelligenceContext } from "@/lib/intelligence";

interface NutritionStore {
  status: NutritionStatus | null;
  context: IntelligenceContext | null;
  todayLogs: MealLogEntry[];
  isLoading: boolean;
  lastFetched: number;
  fetchTodayNutrition: (force?: boolean) => Promise<void>;
  logMeal: (data: {
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    recipeId?: number;
    menuItemId?: number;
    customName?: string;
    servings?: number;
  }) => Promise<void>;
  removeMealLog: (id: number) => Promise<void>;
}

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  status: null,
  context: null,
  todayLogs: [],
  isLoading: false,
  lastFetched: 0,

  fetchTodayNutrition: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().lastFetched < 10000 && get().status) return; // 10s cache

    set({ isLoading: true });
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch("/api/nutrition/today"),
        fetch("/api/nutrition/logs"),
      ]);
      const statusData = await statusRes.json();
      const logsData = await logsRes.json();

      const context = getIntelligenceContext(statusData);
      set({
        status: statusData,
        context,
        todayLogs: logsData,
        isLoading: false,
        lastFetched: now,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  logMeal: async (data) => {
    const res = await fetch("/api/nutrition/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      set({ lastFetched: 0 }); // invalidate cache
      await get().fetchTodayNutrition();
    }
  },

  removeMealLog: async (id: number) => {
    const res = await fetch(`/api/nutrition/log/${id}`, { method: "DELETE" });
    if (res.ok) {
      set({ lastFetched: 0 });
      await get().fetchTodayNutrition();
    }
  },
}));
