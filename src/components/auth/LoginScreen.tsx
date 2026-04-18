"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calculateDailyGoals, normalizeGoal } from "@/lib/user-goals";
import {
  getImperialBodyMetricsForm,
  parseImperialBodyMetrics,
} from "@/lib/body-metrics";

interface LoginScreenProps {
  initialUser: {
    name: string;
    heightCm: number | null;
    weightKg: number | null;
    goal: string;
    dietPreference: string;
  };
}

export function LoginScreen({ initialUser }: LoginScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initialUser.name || "Alex",
    ...getImperialBodyMetricsForm(initialUser.heightCm, initialUser.weightKg),
    goal: normalizeGoal(initialUser.goal),
    dietPreference: initialUser.dietPreference || "none",
  });

  const parsedBodyMetrics = parseImperialBodyMetrics({
    heightFeet: form.heightFeet,
    heightInches: form.heightInches,
    weightLbs: form.weightLbs,
  });
  const previewGoals = parsedBodyMetrics
    ? calculateDailyGoals({
        heightCm: parsedBodyMetrics.heightCm,
        weightKg: parsedBodyMetrics.weightKg,
        goal: form.goal,
      })
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!parsedBodyMetrics) {
      setError("Enter a valid height in feet/inches and weight in pounds.");
      return;
    }

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          heightCm: parsedBodyMetrics.heightCm,
          weightKg: parsedBodyMetrics.weightKg,
          goal: form.goal,
          dietPreference: form.dietPreference,
        }),
      });

      const data = await readJsonSafely(res);

      if (!res.ok) {
        setError(
          [data?.error, data?.details].filter(Boolean).join(" ") ||
            "Unable to save your profile."
        );
        return;
      }

      startTransition(() => {
        router.replace("/");
        router.refresh();
      });
    } catch {
      setError("Something went wrong while saving your profile. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0e7ff_0%,_#f8fafc_38%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center">
        <div className="w-full rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(79,70,229,0.18)] backdrop-blur">
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">
              NutriTrack Login
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Set your body stats once and we&apos;ll tailor your macros.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter your height in feet and inches plus your weight in pounds to generate daily calorie, protein, carb, and fat targets automatically.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </label>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Height (ft)
                </label>
                <input
                  required
                  type="number"
                  min="3"
                  max="7"
                  step="1"
                  value={form.heightFeet}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, heightFeet: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Height (in)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  max="11.9"
                  step="0.1"
                  value={form.heightInches}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, heightInches: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Weight (lbs)
                </label>
                <input
                  required
                  type="number"
                  min="77"
                  max="573.2"
                  step="0.1"
                  value={form.weightLbs}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, weightLbs: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Goal
                </label>
                <select
                  value={form.goal}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, goal: normalizeGoal(event.target.value) }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                >
                  <option value="cutting">Lose fat</option>
                  <option value="maintenance">Maintain</option>
                  <option value="bulking">Build muscle</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Diet
                </label>
                <select
                  value={form.dietPreference}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dietPreference: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                >
                  <option value="none">No preference</option>
                  <option value="vegan">Vegan</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="keto">Keto</option>
                  <option value="halal">Halal</option>
                </select>
              </div>
            </div>

            {previewGoals && (
              <div className="rounded-3xl bg-slate-950 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                  Your daily targets
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    { label: "Calories", value: `${previewGoals.dailyCalories} kcal` },
                    { label: "Protein", value: `${previewGoals.dailyProtein} g` },
                    { label: "Carbs", value: `${previewGoals.dailyCarbs} g` },
                    { label: "Fats", value: `${previewGoals.dailyFats} g` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xs text-indigo-100">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Continue to my plan"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

async function readJsonSafely(
  response: Response
): Promise<{ error?: string; details?: string } | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { error?: string; details?: string };
  } catch {
    return null;
  }
}
