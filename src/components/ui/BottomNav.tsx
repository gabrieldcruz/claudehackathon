"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/", label: "At Home", icon: Home },
  { href: "/on-the-go", label: "On the Go", icon: MapPin },
  { href: "/nutrition", label: "Nutrition", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                active ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className={`text-[10px] font-medium ${active ? "font-bold" : ""}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
