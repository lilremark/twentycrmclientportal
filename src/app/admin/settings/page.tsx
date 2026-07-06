import { KeyRound, Mail, ServerCog, ShieldCheck } from "lucide-react";

import { SettingsSectionLayout } from "@/components/settings-section-layout";
import {
  ApplicationSettingsForm,
  InvitationEmailTemplateForm,
  ProfileSettingsForm,
  SmtpSettingsForm,
  SsoSettingsForm,
  TwentySettingsForm,
} from "@/components/settings-forms";
import { requireAdmin } from "@/lib/access";
import { getApplicationSettings } from "@/lib/application-settings";
import { getEnv } from "@/lib/env";
import { getAdminIntegrationSettingsSummary } from "@/lib/integration-settings";
import { getInvitationEmailEditorValues } from "@/lib/invitation-email";

export default async function AdminSettingsPage() {
  const [current, settings, integrations] = await Promise.all([
    requireAdmin(),
    getApplicationSettings(),
    getAdminIntegrationSettingsSummary(),
  ]);
  const env = getEnv();
  const invitationEmailTemplate = getInvitationEmailEditorValues(
    settings,
    env.APP_URL,
  );

  return (
    <SettingsSectionLayout
      access={
        <SsoSettingsForm
          callbackBaseUrl={env.APP_URL.replace(/\/$/, "")}
          settings={integrations}
        />
      }
      brand={<ApplicationSettingsForm settings={settings} />}
      deployment={
        <section className="deployment-settings-panel">
          <div className="deployment-settings-heading">
            <span className="settings-section-icon">
              <ServerCog size={19} />
            </span>
            <div>
              <h2>Deployment configuration</h2>
              <p>
                Sensitive values stay in the server environment and are never
                exposed to the browser.
              </p>
            </div>
          </div>
          <div className="deployment-status-grid">
            <ConfigurationStatus
              configured={Boolean(
                integrations.hasTwentyApiKey && integrations.twentyBaseUrl,
              )}
              icon={<KeyRound size={18} />}
              label="Twenty CRM API"
            />
            <ConfigurationStatus
              configured={Boolean(
                integrations.smtpHost && integrations.smtpFrom,
              )}
              icon={<Mail size={18} />}
              label="Email delivery"
            />
            <ConfigurationStatus
              configured={Boolean(env.AUTH_SECRET)}
              icon={<ShieldCheck size={18} />}
              label="Authentication secrets"
            />
          </div>
          <div className="deployment-settings-footer">
            Update deployment secrets and URLs in the server environment, then restart the portal.
          </div>
        </section>
      }
      email={
        <>
          <SmtpSettingsForm settings={integrations} />
          <InvitationEmailTemplateForm template={invitationEmailTemplate} />
        </>
      }
      profile={
        <ProfileSettingsForm
          email={current.user.email}
          initialImage={current.user.image ?? null}
          initialName={current.user.name}
        />
      }
      twenty={<TwentySettingsForm settings={integrations} />}
    />
  );
}

function ConfigurationStatus({
  configured,
  icon,
  label,
}: {
  configured: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className={`deployment-status ${configured ? "is-configured" : "needs-attention"}`}>
      <span className="configuration-icon">{icon}</span>
      <div>
        <strong>{label}</strong>
        <span>{configured ? "Configured" : "Needs attention"}</span>
      </div>
      <span className={`status-dot ${configured ? "configured" : ""}`} />
    </div>
  );
}
