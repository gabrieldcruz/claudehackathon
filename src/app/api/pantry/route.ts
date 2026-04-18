import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.pantryItem.findMany({
    where: { userId: 1 },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.pantryItem.create({
    data: {
      userId: 1,
      name: body.name,
      quantity: body.quantity ?? "",
      unit: body.unit ?? "",
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.pantryItem.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
