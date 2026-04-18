import { redirect } from "next/navigation";
import { NutritionTab } from "@/components/nutrition/NutritionTab";
import { getOrCreateAppUser, isUserProfileComplete } from "@/lib/app-user";

export default async function NutritionPage() {
  const user = await getOrCreateAppUser();

  if (!isUserProfileComplete(user)) {
    redirect("/login");
  }

  return <NutritionTab />;
}
