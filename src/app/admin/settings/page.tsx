import { KeyRound, Mail, ServerCog, ShieldCheck } from "lucide-react";

import {
  ApplicationSettingsForm,
  ProfileSettingsForm,
} from "@/components/settings-forms";
import { requireAdmin } from "@/lib/access";
import { getApplicationSettings } from "@/lib/application-settings";
import { getEnv } from "@/lib/env";

export default async function AdminSettingsPage() {
  const [current, settings] = await Promise.all([
    requireAdmin(),
    getApplicationSettings(),
  ]);
  const env = getEnv();

  return (
    <div className="settings-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Settings</h2>
          <p>
            Manage the portal identity, your profile, and review deployment
            configuration.
          </p>
        </div>
      </div>

      <ApplicationSettingsForm settings={settings} />
      <ProfileSettingsForm
        email={current.user.email}
        initialImage={current.user.image ?? null}
        initialName={current.user.name}
      />

      <section className="card settings-card">
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
            configured={Boolean(env.TWENTY_API_KEY && env.TWENTY_BASE_URL)}
            icon={<KeyRound size={18} />}
            label="Twenty CRM API"
          />
          <ConfigurationStatus
            configured={Boolean(env.SMTP_HOST && env.SMTP_FROM)}
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
