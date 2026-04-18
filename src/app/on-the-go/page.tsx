import { redirect } from "next/navigation";
import { OnTheGoTab } from "@/components/onthego/OnTheGoTab";
import { getOrCreateAppUser, isUserProfileComplete } from "@/lib/app-user";

export default async function OnTheGoPage() {
  const user = await getOrCreateAppUser();

  if (!isUserProfileComplete(user)) {
    redirect("/login");
  }

  return <OnTheGoTab />;
}
