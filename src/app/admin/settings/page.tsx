import {
  Building2,
  KeyRound,
  Mail,
  ServerCog,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  ApplicationSettingsForm,
  InvitationEmailTemplateForm,
  ProfileSettingsForm,
  SsoSettingsForm,
  SmtpSettingsForm,
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
    <div className="settings-layout">
      <aside className="settings-local-nav">
        <p>Configuration</p>
        <a href="#brand">
          <Building2 size={15} /> Brand and portal
        </a>
        <a href="#twenty">
          <ServerCog size={15} /> Twenty CRM
        </a>
        <a href="#email">
          <Mail size={15} /> Email
        </a>
        <a href="#access">
          <ShieldCheck size={15} /> Access and SSO
        </a>
        <a href="#profile">
          <UserRound size={15} /> Profile
        </a>
      </aside>
      <div className="settings-page">
        <div className="settings-anchor" id="brand">
          <ApplicationSettingsForm settings={settings} />
        </div>
        <div className="settings-anchor" id="twenty">
          <TwentySettingsForm settings={integrations} />
        </div>
        <div className="settings-anchor" id="email">
          <SmtpSettingsForm settings={integrations} />
          <InvitationEmailTemplateForm template={invitationEmailTemplate} />
        </div>
        <div className="settings-anchor" id="access">
          <SsoSettingsForm
            callbackBaseUrl={env.APP_URL.replace(/\/$/, "")}
            settings={integrations}
          />
        </div>
        <div className="settings-anchor" id="profile">
          <ProfileSettingsForm
            email={current.user.email}
            initialImage={current.user.image ?? null}
            initialName={current.user.name}
          />
        </div>

        <section className="card settings-card" id="deployment">
          <div className="settings-card-heading">
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
          <div className="configuration-list">
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
              configured={Boolean(env.AUTH_SECRET && env.SETUP_TOKEN)}
              icon={<ShieldCheck size={18} />}
              label="Authentication secrets"
            />
          </div>
          <p className="settings-note">
            Update API keys, webhook secrets, SMTP credentials, URLs, and
            authentication secrets in your deployment environment, then restart
            the portal.
          </p>
        </section>
      </div>
    </div>
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
    <div className="configuration-row">
      <span className="configuration-icon">{icon}</span>
      <span>{label}</span>
      <span className={`status-dot ${configured ? "configured" : ""}`} />
      <strong>{configured ? "Configured" : "Needs attention"}</strong>
    </div>
  );
}
