"use client";

interface MacroRingProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color: string;
  size?: number;
}

export function MacroRing({
  label,
  value,
  max,
  unit = "g",
  color,
  size = 90,
}: MacroRingProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-gray-800 leading-none">
            {pct}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-500">
          {Math.round(value)}/{max}{unit}
        </p>
      </div>
    </div>
  );
}
