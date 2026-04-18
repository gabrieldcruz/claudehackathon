import { redirect } from "next/navigation";
import { getOrCreateAppUser, isUserProfileComplete } from "@/lib/app-user";
import { LoginScreen } from "@/components/auth/LoginScreen";

export default async function LoginPage() {
  const user = await getOrCreateAppUser();

  if (isUserProfileComplete(user)) {
    redirect("/");
  }

  return (
    <LoginScreen
      initialUser={{
        name: user.name,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        goal: user.goal,
        dietPreference: user.dietPreference,
      }}
    />
  );
}
