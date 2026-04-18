import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppUser } from "@/lib/app-user";

export async function GET() {
  try {
    const user = await getOrCreateAppUser();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await prisma.mealLog.findMany({
      where: {
        userId: user.id,
        loggedAt: { gte: today, lt: tomorrow },
      },
      include: {
        recipe: { select: { id: true, name: true } },
        menuItem: {
          select: {
            id: true,
            name: true,
            price: true,
            restaurant: { select: { name: true } },
          },
        },
      },
      orderBy: { loggedAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to load nutrition logs", error);
    return NextResponse.json(
      { error: "Unable to load today’s meal logs right now." },
      { status: 500 }
    );
  }
}
