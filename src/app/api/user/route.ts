import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: 1 } });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const user = await prisma.user.update({
    where: { id: 1 },
    data: {
      name: body.name,
      dailyCalories: body.dailyCalories,
      dailyProtein: body.dailyProtein,
      dailyCarbs: body.dailyCarbs,
      dailyFats: body.dailyFats,
      goal: body.goal,
      dietPreference: body.dietPreference,
    },
  });
  return NextResponse.json(user);
}
