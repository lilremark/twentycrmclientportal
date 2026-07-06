import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentSession } from "@/lib/access";
import { getAdminIntegrationSettingsSummary } from "@/lib/integration-settings";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const callbackURL = query.tour === "1" ? "/admin?tour=1" : "/";
  if (await getCurrentSession()) redirect(callbackURL);
  const integrations = await getAdminIntegrationSettingsSummary();
  return (
    <AuthCard
      title="Sign in"
      description="Access is limited to users invited by a portal administrator."
    >
      <LoginForm
        callbackURL={callbackURL}
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
