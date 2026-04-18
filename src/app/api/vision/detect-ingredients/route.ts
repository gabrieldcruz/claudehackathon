import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured", ingredients: [] },
      { status: 200 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type || "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Look at this image and identify all food ingredients, produce, pantry items, or groceries visible.
Return ONLY a JSON array of ingredient names as strings, nothing else.
Example: ["eggs", "spinach", "milk", "chicken breast", "rice"]
Be specific but concise. List each distinct ingredient once.`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";

  let ingredients: string[] = [];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      ingredients = JSON.parse(match[0]);
    }
  } catch {
    ingredients = [];
  }

  return NextResponse.json({ ingredients });
}
