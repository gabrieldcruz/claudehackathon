import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Clear existing data
  await prisma.mealLog.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.pantryItem.deleteMany();
  await prisma.user.deleteMany();

  // Create default user
  await prisma.user.create({
    data: {
      id: 1,
      name: "Alex",
      dailyCalories: 2000,
      dailyProtein: 150,
      dailyCarbs: 200,
      dailyFats: 65,
      goal: "maintenance",
      dietPreference: "none",
    },
  });

  // Recipes
  const recipes = [
    {
      name: "Grilled Chicken & Rice Bowl",
      description: "Lean protein with fluffy white rice and steamed broccoli.",
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
      prepTime: 25,
      servings: 1,
      calories: 480,
      protein: 42,
      carbs: 48,
      fats: 9,
      fiber: 4,
      tags: "high-protein,meal-prep",
      ingredients: [
        { name: "Chicken breast", amount: "200g" },
        { name: "White rice", amount: "1 cup cooked" },
        { name: "Broccoli", amount: "1 cup" },
        { name: "Olive oil", amount: "1 tsp" },
        { name: "Garlic powder", amount: "½ tsp" },
      ],
    },
    {
      name: "Greek Yogurt Parfait",
      description: "Protein-packed breakfast with berries and granola.",
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
      prepTime: 5,
      servings: 1,
      calories: 320,
      protein: 24,
      carbs: 38,
      fats: 6,
      fiber: 3,
      tags: "high-protein,quick-prep,breakfast",
      ingredients: [
        { name: "Greek yogurt (0% fat)", amount: "200g" },
        { name: "Mixed berries", amount: "½ cup" },
        { name: "Granola", amount: "¼ cup" },
        { name: "Honey", amount: "1 tsp" },
      ],
    },
    {
      name: "Tuna Avocado Salad",
      description: "Heart-healthy fats with lean tuna on fresh greens.",
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
      prepTime: 10,
      servings: 1,
      calories: 380,
      protein: 35,
      carbs: 12,
      fats: 22,
      fiber: 7,
      tags: "high-protein,low-carb,keto",
      ingredients: [
        { name: "Canned tuna", amount: "150g" },
        { name: "Avocado", amount: "½ medium" },
        { name: "Mixed greens", amount: "2 cups" },
        { name: "Cherry tomatoes", amount: "½ cup" },
        { name: "Lemon juice", amount: "1 tbsp" },
      ],
    },
    {
      name: "Egg White Omelette",
      description: "High-protein breakfast with spinach and mushrooms.",
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
      prepTime: 15,
      servings: 1,
      calories: 180,
      protein: 28,
      carbs: 5,
      fats: 4,
      fiber: 2,
      tags: "high-protein,low-calorie,low-carb,breakfast",
      ingredients: [
        { name: "Egg whites", amount: "6 large" },
        { name: "Spinach", amount: "1 cup" },
        { name: "Mushrooms", amount: "½ cup" },
        { name: "Bell pepper", amount: "¼ cup" },
        { name: "Cooking spray", amount: "as needed" },
      ],
    },
    {
      name: "Overnight Oats",
      description: "Complex carbs and fiber for sustained energy.",
      imageUrl: "https://images.unsplash.com/photo-1571748982800-fa51082c2224?w=400",
      prepTime: 5,
      servings: 1,
      calories: 420,
      protein: 18,
      carbs: 62,
      fats: 10,
      fiber: 8,
      tags: "high-fiber,meal-prep,breakfast",
      ingredients: [
        { name: "Rolled oats", amount: "½ cup" },
        { name: "Almond milk", amount: "¾ cup" },
        { name: "Chia seeds", amount: "1 tbsp" },
        { name: "Protein powder", amount: "1 scoop" },
        { name: "Banana", amount: "½ medium" },
      ],
    },
    {
      name: "Salmon with Asparagus",
      description: "Omega-3 rich salmon with roasted asparagus.",
      imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
      prepTime: 30,
      servings: 1,
      calories: 420,
      protein: 40,
      carbs: 8,
      fats: 26,
      fiber: 4,
      tags: "high-protein,low-carb,keto",
      ingredients: [
        { name: "Salmon fillet", amount: "180g" },
        { name: "Asparagus", amount: "200g" },
        { name: "Olive oil", amount: "1 tbsp" },
        { name: "Lemon", amount: "½" },
        { name: "Dill", amount: "1 tsp" },
      ],
    },
    {
      name: "Black Bean Tacos",
      description: "Plant-based protein with fresh salsa.",
      imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
      prepTime: 20,
      servings: 2,
      calories: 360,
      protein: 16,
      carbs: 52,
      fats: 8,
      fiber: 12,
      tags: "vegan,vegetarian,high-fiber",
      ingredients: [
        { name: "Black beans (canned)", amount: "1 cup" },
        { name: "Corn tortillas", amount: "4" },
        { name: "Salsa", amount: "¼ cup" },
        { name: "Avocado", amount: "½" },
        { name: "Cilantro", amount: "2 tbsp" },
      ],
    },
    {
      name: "Turkey Lettuce Wraps",
      description: "Low-carb wraps with lean ground turkey.",
      imageUrl: "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400",
      prepTime: 20,
      servings: 2,
      calories: 290,
      protein: 32,
      carbs: 10,
      fats: 12,
      fiber: 3,
      tags: "high-protein,low-carb,low-calorie",
      ingredients: [
        { name: "Ground turkey (93% lean)", amount: "300g" },
        { name: "Butter lettuce leaves", amount: "8" },
        { name: "Soy sauce (low sodium)", amount: "2 tbsp" },
        { name: "Ginger", amount: "1 tsp" },
        { name: "Water chestnuts", amount: "¼ cup" },
      ],
    },
    {
      name: "Quinoa Power Bowl",
      description: "Complete protein with roasted vegetables.",
      imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
      prepTime: 35,
      servings: 2,
      calories: 450,
      protein: 18,
      carbs: 68,
      fats: 14,
      fiber: 9,
      tags: "vegan,vegetarian,high-fiber",
      ingredients: [
        { name: "Quinoa", amount: "½ cup dry" },
        { name: "Sweet potato", amount: "1 medium" },
        { name: "Chickpeas", amount: "½ cup" },
        { name: "Kale", amount: "2 cups" },
        { name: "Tahini", amount: "2 tbsp" },
      ],
    },
    {
      name: "Protein Smoothie Bowl",
      description: "Thick smoothie bowl topped with seeds and fruit.",
      imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400",
      prepTime: 10,
      servings: 1,
      calories: 350,
      protein: 30,
      carbs: 42,
      fats: 7,
      fiber: 5,
      tags: "high-protein,quick-prep,breakfast",
      ingredients: [
        { name: "Frozen banana", amount: "1 medium" },
        { name: "Protein powder", amount: "1 scoop" },
        { name: "Almond milk", amount: "½ cup" },
        { name: "Berries", amount: "½ cup" },
        { name: "Hemp seeds", amount: "1 tbsp" },
      ],
    },
  ];

  for (const r of recipes) {
    const { ingredients, ...recipeData } = r;
    const created = await prisma.recipe.create({
      data: {
        ...recipeData,
        ingredients: { create: ingredients },
      },
    });
    console.log("Created recipe:", created.name);
  }

  // Restaurants
  const restaurantData = [
    {
      name: "Chipotle Mexican Grill",
      cuisine: "Mexican",
      imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
      rating: 4.2,
      priceRange: "$$",
      address: "123 Main St",
      menuItems: [
        {
          name: "Chicken Burrito Bowl",
          description: "Grilled chicken with rice, beans, and pico de gallo.",
          price: 10.95,
          calories: 620,
          protein: 40,
          carbs: 68,
          fats: 16,
          tags: "high-protein",
        },
        {
          name: "Sofritas Salad",
          description: "Plant-based protein on romaine with fresh toppings.",
          price: 9.95,
          calories: 380,
          protein: 22,
          carbs: 28,
          fats: 18,
          tags: "vegan,vegetarian,low-calorie",
        },
        {
          name: "Barbacoa Tacos",
          description: "Slow-cooked beef in soft corn tortillas.",
          price: 10.50,
          calories: 545,
          protein: 35,
          carbs: 52,
          fats: 18,
          tags: "high-protein",
        },
      ],
    },
    {
      name: "Sweetgreen",
      cuisine: "Salads",
      imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
      rating: 4.5,
      priceRange: "$$",
      address: "456 Park Ave",
      menuItems: [
        {
          name: "Harvest Bowl",
          description: "Roasted chicken, wild rice, apples, and goat cheese.",
          price: 13.95,
          calories: 680,
          protein: 38,
          carbs: 72,
          fats: 22,
          tags: "high-protein",
        },
        {
          name: "Shroomami Bowl",
          description: "Roasted tofu, wild rice, cucumber, and edamame.",
          price: 12.95,
          calories: 490,
          protein: 24,
          carbs: 58,
          fats: 16,
          tags: "vegan,vegetarian",
        },
        {
          name: "Kale Caesar",
          description: "Kale, parmesan, chicken, and housemade caesar.",
          price: 12.50,
          calories: 420,
          protein: 32,
          carbs: 22,
          fats: 24,
          tags: "high-protein,low-carb",
        },
      ],
    },
    {
      name: "Shake Shack",
      cuisine: "American",
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
      rating: 4.3,
      priceRange: "$$",
      address: "789 Broadway",
      menuItems: [
        {
          name: "ShackBurger",
          description: "Angus beef, american cheese, lettuce, tomato, ShackSauce.",
          price: 7.99,
          calories: 500,
          protein: 26,
          carbs: 40,
          fats: 28,
          tags: "",
        },
        {
          name: "Grilled Chicken Sandwich",
          description: "Herb-marinated grilled chicken, lettuce, tomato.",
          price: 8.99,
          calories: 480,
          protein: 38,
          carbs: 42,
          fats: 14,
          tags: "high-protein",
        },
        {
          name: "Veggie Shack",
          description: "Garden veggie burger, lettuce, tomato.",
          price: 7.99,
          calories: 420,
          protein: 18,
          carbs: 48,
          fats: 16,
          tags: "vegetarian",
        },
      ],
    },
    {
      name: "Cava",
      cuisine: "Mediterranean",
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
      rating: 4.6,
      priceRange: "$$",
      address: "321 Elm St",
      menuItems: [
        {
          name: "Grilled Chicken Pita",
          description: "Herb chicken, hummus, tzatziki in warm pita.",
          price: 11.50,
          calories: 560,
          protein: 42,
          carbs: 55,
          fats: 14,
          tags: "high-protein",
        },
        {
          name: "Lemon Herb Salmon Bowl",
          description: "Salmon over greens with feta and lemon vinaigrette.",
          price: 13.95,
          calories: 520,
          protein: 36,
          carbs: 30,
          fats: 26,
          tags: "high-protein,low-carb",
        },
        {
          name: "Falafel Salad",
          description: "Crispy falafel, hummus, roasted vegetables.",
          price: 10.95,
          calories: 460,
          protein: 18,
          carbs: 48,
          fats: 20,
          tags: "vegan,vegetarian",
        },
      ],
    },
    {
      name: "Panera Bread",
      cuisine: "Cafe",
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
      rating: 4.0,
      priceRange: "$",
      address: "654 Oak Blvd",
      menuItems: [
        {
          name: "Turkey Avocado BLT",
          description: "Sliced turkey, avocado, bacon on sourdough.",
          price: 10.99,
          calories: 560,
          protein: 34,
          carbs: 48,
          fats: 22,
          tags: "high-protein",
        },
        {
          name: "Greek Salad with Chicken",
          description: "Romaine, feta, olives, tomatoes, grilled chicken.",
          price: 11.49,
          calories: 390,
          protein: 30,
          carbs: 18,
          fats: 22,
          tags: "high-protein,low-carb",
        },
        {
          name: "Steel-Cut Oatmeal",
          description: "Steel-cut oats with fresh fruit and brown sugar.",
          price: 5.99,
          calories: 340,
          protein: 10,
          carbs: 58,
          fats: 6,
          tags: "high-fiber,vegetarian,breakfast",
        },
      ],
    },
  ];

  for (const rest of restaurantData) {
    const { menuItems, ...restData } = rest;
    await prisma.restaurant.create({
      data: {
        ...restData,
        menuItems: { create: menuItems },
      },
    });
  }

  // Pantry items
  const pantryItems = [
    { name: "Chicken breast", quantity: "500", unit: "g" },
    { name: "Eggs", quantity: "12", unit: "pcs" },
    { name: "Greek yogurt", quantity: "2", unit: "cups" },
    { name: "Oats", quantity: "1", unit: "cup" },
    { name: "Rice", quantity: "2", unit: "cups" },
    { name: "Broccoli", quantity: "1", unit: "head" },
    { name: "Spinach", quantity: "1", unit: "bag" },
    { name: "Avocado", quantity: "2", unit: "pcs" },
    { name: "Canned tuna", quantity: "3", unit: "cans" },
    { name: "Almonds", quantity: "1", unit: "cup" },
  ];

  await prisma.pantryItem.createMany({
    data: pantryItems.map((p) => ({ ...p, userId: 1 })),
  });

  return NextResponse.json({ success: true, message: "Database seeded successfully!" });
}
