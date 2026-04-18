import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppUser } from "@/lib/app-user";

export async function GET() {
  try {
    const user = await getOrCreateAppUser();
    const items = await prisma.pantryItem.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to load pantry", error);
    return NextResponse.json(
      { error: "Unable to load your pantry right now." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    }

    const user = await getOrCreateAppUser();
    const existingItem = await prisma.pantryItem.findFirst({
      where: {
        userId: user.id,
        name,
      },
    });

    if (existingItem) {
      return NextResponse.json({ item: existingItem, existing: true });
    }

    const item = await prisma.pantryItem.create({
      data: {
        userId: user.id,
        name,
        quantity: typeof body.quantity === "string" ? body.quantity.trim() : "",
        unit: typeof body.unit === "string" ? body.unit.trim() : "",
      },
    });

    return NextResponse.json({ item, existing: false }, { status: 201 });
  } catch (error) {
    console.error("Failed to add pantry item", error);
    return NextResponse.json(
      { error: "Unable to add that item to your pantry right now." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getOrCreateAppUser();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.pantryItem.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove pantry item", error);
    return NextResponse.json(
      { error: "Unable to remove that pantry item right now." },
      { status: 500 }
    );
  }
}
