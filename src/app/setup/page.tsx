import { count } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { SetupForm } from "@/components/setup-form";
import { db } from "@/lib/db";
import { portalAdministrators } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ value }] = await db
    .select({ value: count() })
    .from(portalAdministrators);
  if (value > 0) redirect("/login");

  return (
    <AuthCard
      title="Set up your portal"
      description="Create the first administrator. This screen is disabled after setup."
    >
      <SetupForm />
    </AuthCard>
  );
}
