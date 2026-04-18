import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const recipes = await prisma.recipe.findMany({
    where: {
      AND: [
        query ? { name: { contains: query } } : {},
        tag ? { tags: { contains: tag } } : {},
      ],
    },
    include: { ingredients: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(recipes);
}
