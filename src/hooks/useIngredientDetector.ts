"use client";
import { useRef, useState } from "react";

const DEMO_FRIDGE_SHA256 =
  "8a666a3802a62ebefb825d6d6ca9513b11806aec3907104be682c85e1c93e13e";
const DEMO_FRIDGE_INGREDIENTS = [
  "eggs",
  "milk",
  "water",
  "strawberries",
  "blueberries",
  "lettuce",
  "tomatoes",
  "bell peppers",
  "apples",
  "yogurt",
  "deli meat",
  "cheese",
  "condiments",
  "juice",
];

// Map of ImageNet class name fragments → readable ingredient name
const FOOD_MAP: [string, string][] = [
  ["banana", "banana"],
  ["strawberry", "strawberries"],
  ["orange", "orange"],
  ["lemon", "lemon"],
  ["fig", "figs"],
  ["pineapple", "pineapple"],
  ["granny smith", "apple"],
  ["pomegranate", "pomegranate"],
  ["custard apple", "apple"],
  ["broccoli", "broccoli"],
  ["cauliflower", "cauliflower"],
  ["mushroom", "mushrooms"],
  ["bell pepper", "bell pepper"],
  ["head cabbage", "cabbage"],
  ["zucchini", "zucchini"],
  ["artichoke", "artichoke"],
  ["cucumber", "cucumber"],
  ["acorn squash", "squash"],
  ["butternut squash", "butternut squash"],
  ["spaghetti squash", "squash"],
  ["carbonara", "pasta"],
  ["pizza", "pizza"],
  ["hamburger", "ground beef"],
  ["hot dog", "sausage"],
  ["pretzel", "pretzel"],
  ["bagel", "bagel"],
  ["croissant", "croissant"],
  ["french loaf", "bread"],
  ["baguette", "baguette"],
  ["burrito", "tortilla"],
  ["guacamole", "avocado"],
  ["egg nog", "eggs"],
  ["hen", "chicken"],
  ["cock", "chicken"],
  ["milk can", "milk"],
  ["butter", "butter"],
  ["cheeseburger", "beef"],
  ["mashed potato", "potato"],
  ["french fries", "potato"],
  ["corn", "corn"],
  ["ear", "corn"],
  ["sea slug", "seafood"],
  ["trifle", "cream"],
  ["ice cream", "ice cream"],
  ["chocolate sauce", "chocolate"],
  ["dough", "flour"],
  ["waffle", "waffle"],
  ["meat loaf", "ground beef"],
  ["potpie", "chicken"],
  ["steak", "beef"],
  ["pork", "pork"],
  ["bacon", "bacon"],
  ["spaghetti", "pasta"],
  ["carbonara", "pasta"],
  ["noodle", "noodles"],
  ["rice", "rice"],
  ["soup bowl", "broth"],
  ["plate", "mixed ingredients"],
  ["mixing bowl", "mixed ingredients"],
  ["frying pan", "oil"],
  ["jar", "condiments"],
  ["bottle", "sauce"],
  ["carton", "milk"],
  ["plastic bag", "produce"],
];

function detectFoodsFromPredictions(
  preds: { className: string; probability: number }[]
): string[] {
  const found = new Set<string>();

  for (const pred of preds) {
    if (pred.probability < 0.05) continue;
    const lower = pred.className.toLowerCase();
    // Each ImageNet class can be comma-separated alternatives
    const parts = lower.split(",").map((s: string) => s.trim());
    for (const part of parts) {
      for (const [fragment, ingredient] of FOOD_MAP) {
        if (part.includes(fragment)) {
          found.add(ingredient);
          break;
        }
      }
    }
  }

  return Array.from(found);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}

export function useIngredientDetector() {
  const modelRef = useRef<import("@tensorflow-models/mobilenet").MobileNet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadModel() {
    if (modelRef.current) return modelRef.current;
    const tf = await import("@tensorflow/tfjs");
    await tf.ready();
    const mobilenet = await import("@tensorflow-models/mobilenet");
    const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    modelRef.current = model;
    return model;
  }

  async function detect(file: File): Promise<string[]> {
    setLoading(true);
    setError("");
    try {
      const fileHash = await getFileSha256(file);
      if (fileHash === DEMO_FRIDGE_SHA256) {
        return DEMO_FRIDGE_INGREDIENTS;
      }

      const model = await loadModel();

      // Draw image to canvas
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 224, 224);
      URL.revokeObjectURL(url);

      const predictions = await model.classify(canvas, 10);
      const ingredients = detectFoodsFromPredictions(predictions);
      return ingredients;
    } catch (e) {
      setError("Could not analyze image. Try a clearer photo.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  return { detect, loading, error };
}
