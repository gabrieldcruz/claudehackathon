"use client";
import { Brain } from "lucide-react";
import type { IntelligenceContext } from "@/types";

const bannerColors: Record<string, string> = {
  protein: "from-blue-500 to-blue-600",
  carbs: "from-orange-500 to-orange-600",
  calories: "from-red-500 to-rose-600",
  fats: "from-pink-500 to-pink-600",
  balanced: "from-emerald-500 to-teal-600",
};

interface Props {
  context: IntelligenceContext;
}

export function IntelligenceBanner({ context }: Props) {
  const gradient = bannerColors[context.priorityMacro] ?? bannerColors.balanced;

  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-4 text-white flex items-start gap-3 shadow-md`}>
      <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
        <Brain className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-0.5">
          AI Recommendation
        </p>
        <p className="text-sm font-medium leading-snug">{context.recommendation}</p>
      </div>
    </div>
  );
}
