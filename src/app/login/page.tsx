import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentSession } from "@/lib/access";
import { getAdminIntegrationSettingsSummary } from "@/lib/integration-settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/");
  const integrations = await getAdminIntegrationSettingsSummary();
  return (
    <AuthCard
      title="Sign in"
      description="Access is limited to users invited by a portal administrator."
    >
      <LoginForm
        customProvider={{
          enabled:
            integrations.customOauthEnabled &&
            Boolean(
              integrations.customOauthClientId &&
                integrations.hasCustomOauthClientSecret,
            ),
          name: integrations.customOauthName,
        }}
        googleEnabled={
          integrations.googleOauthEnabled &&
          Boolean(
            integrations.googleOauthClientId &&
              integrations.hasGoogleOauthClientSecret,
          )
        }
      />
    </AuthCard>
  );
}
