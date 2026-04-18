"use client";

interface MacroBarProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, value, max, unit = "g", color }: MacroBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const exceeded = value > max;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`text-xs font-semibold ${exceeded ? "text-red-500" : "text-gray-500"}`}>
          {Math.round(value)}/{max}{unit}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: exceeded ? "#ef4444" : color,
          }}
        />
      </div>
    </div>
  );
}
