import { redirect } from "next/navigation";
import { HomeTab } from "@/components/home/HomeTab";
import { getOrCreateAppUser, isUserProfileComplete } from "@/lib/app-user";

export default async function HomePage() {
  const user = await getOrCreateAppUser();

  if (!isUserProfileComplete(user)) {
    redirect("/login");
  }

  return <HomeTab />;
}
