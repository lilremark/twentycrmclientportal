import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentSession } from "@/lib/access";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/");
  return (
    <AuthCard
      title="Sign in"
      description="Access is limited to users invited by a portal administrator."
    >
      <LoginForm />
    </AuthCard>
  );
}
