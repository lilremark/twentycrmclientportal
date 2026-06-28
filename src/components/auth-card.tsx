import { connection } from "next/server";
import { Database, PanelsTopLeft, ShieldCheck } from "lucide-react";

import { getApplicationSettings } from "@/lib/application-settings";

export async function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  await connection();
  const settings = await getApplicationSettings();
  const branding = {
    name: settings.brandName,
    logoUrl: settings.brandLogoUrl,
    primaryColor: settings.primaryColor,
    loginBackgroundUrl: settings.loginBackgroundUrl,
  };
  return (
    <main
      className={`auth-shell ${
        branding.loginBackgroundUrl ? "has-custom-background" : ""
      }`}
      style={
        {
          "--brand-primary": branding.primaryColor,
          "--auth-background-image": branding.loginBackgroundUrl
            ? `url("${branding.loginBackgroundUrl}")`
            : "none",
        } as React.CSSProperties
      }
    >
      <section className="auth-story">
        <div className="auth-story-copy">
          <div className="auth-story-brand">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={branding.name} src={branding.logoUrl} />
            ) : (
              <span>{branding.name.slice(0, 2).toUpperCase()}</span>
            )}
            <strong>{branding.name}</strong>
          </div>
          <p className="eyebrow">A clearer client workspace</p>
          <h2>One calm place for every shared CRM record.</h2>
          <p>
            Review activity, collaborate on records, and keep client access
            connected to the source of truth in Twenty CRM.
          </p>
          <div className="auth-story-points">
            <span>
              <ShieldCheck size={16} /> Invite-only access
            </span>
            <span>
              <PanelsTopLeft size={16} /> Purpose-built portal views
            </span>
            <span>
              <Database size={16} /> Live Twenty CRM data
            </span>
          </div>
        </div>
        <div className="auth-preview" aria-hidden="true">
          <aside className="auth-preview-sidebar">
            <div className="auth-preview-brand">
              <span>{branding.name.slice(0, 2).toUpperCase()}</span>
              <strong>{branding.name}</strong>
            </div>
            {["Overview", "Clients", "Portal views", "Settings"].map(
              (item, index) => (
                <span className={index === 2 ? "active" : ""} key={item}>
                  {item}
                </span>
              ),
            )}
          </aside>
          <div className="auth-preview-main">
            <div className="auth-preview-header">
              <span />
              <span />
            </div>
            <div className="auth-preview-grid">
              <div className="auth-preview-card large">
                <span />
                <strong />
                <p />
                <p />
              </div>
              <div className="auth-preview-card">
                <span />
                <strong />
                <p />
              </div>
              <div className="auth-preview-card">
                <span />
                <strong />
                <p />
              </div>
            </div>
            <div className="auth-preview-table">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="auth-form-pane">
        <section className="auth-card">
          <div className="auth-card-heading">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={branding.name}
                className="brand-logo"
                src={branding.logoUrl}
              />
            ) : (
              <div className="brand-mark">
                {branding.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <p>{branding.name}</p>
            <h1>{title}</h1>
            <span>{description}</span>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
