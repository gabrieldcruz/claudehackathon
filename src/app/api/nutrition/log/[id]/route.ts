import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppUser } from "@/lib/app-user";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateAppUser();
    const { id } = await params;

    await prisma.mealLog.deleteMany({
      where: {
        id: Number(id),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove meal log", error);
    return NextResponse.json(
      { error: "Unable to remove that meal right now." },
      { status: 500 }
    );
  }
}
