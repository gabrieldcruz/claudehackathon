import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "NutriTrack — Smart Meal Planner",
  description: "Track macros, get smart meal recommendations at home and on the go.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 antialiased">
        <div className="max-w-lg mx-auto min-h-screen flex flex-col relative">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
