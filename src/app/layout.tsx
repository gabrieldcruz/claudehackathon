import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

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
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <div className="max-w-lg mx-auto min-h-screen flex flex-col relative">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
