import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const restaurants = await prisma.restaurant.findMany({
    where: query ? { name: { contains: query } } : {},
    include: {
      menuItems: {
        where: tag ? { tags: { contains: tag } } : {},
        orderBy: { name: "asc" },
      },
    },
    orderBy: { rating: "desc" },
  });

  // Filter out restaurants with no matching items when tag filter applied
  const filtered = tag
    ? restaurants.filter((r) => r.menuItems.length > 0)
    : restaurants;

  return NextResponse.json(filtered);
}
