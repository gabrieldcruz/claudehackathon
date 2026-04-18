"use client";
import { useState } from "react";
import { Plus, Clock, ChevronDown, ChevronUp, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { getTagBadgeColor } from "@/lib/intelligence";

interface MealCardProps {
  name: string;
  description?: string;
  imageUrl?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime?: number;
  tags?: string;
  recommended?: boolean;
  onLog?: () => void;
  children?: React.ReactNode;
}

export function MealCard({
  name,
  description,
  imageUrl,
  calories,
  protein,
  carbs,
  fats,
  prepTime,
  tags = "",
  recommended,
  onLog,
  children,
}: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tagList = tags.split(",").filter(Boolean);
  if (recommended && !tagList.includes("recommended")) tagList.unshift("recommended");

  // Low fat: < 5g fats OR fats calories < 15% of total
  const fatPct = calories > 0 ? (fats * 9) / calories : 1;
  const isLowFat = fats < 5 || fatPct < 0.15;
  if (isLowFat && !tagList.includes("low-fat")) tagList.push("low-fat");

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${recommended ? "border-indigo-200 ring-1 ring-indigo-100" : "border-gray-100"}`}>
      {imageUrl && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {recommended && (
            <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Best Match
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{name}</h3>
          {onLog && (
            <button
              onClick={onLog}
              className="flex-shrink-0 bg-indigo-600 text-white rounded-full p-1.5 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {description && (
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">{description}</p>
        )}

        {/* Macro Pills */}
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-semibold">{Math.round(calories)}</span>
            <span className="text-gray-400">kcal</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Beef className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold">{Math.round(protein)}g</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Wheat className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold">{Math.round(carbs)}g</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Droplets className="w-3.5 h-3.5 text-pink-500" />
            <span className="font-semibold">{Math.round(fats)}g</span>
          </div>
          {prepTime && (
            <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
              <Clock className="w-3 h-3" />
              <span>{prepTime}m</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tagList.map((t) => (
              <span
                key={t}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getTagBadgeColor(t)}`}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Expandable content (e.g. ingredients) */}
        {children && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-indigo-600 font-medium mt-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> View details
                </>
              )}
            </button>
            {expanded && <div className="mt-3">{children}</div>}
          </>
        )}
      </div>
    </div>
  );
}
