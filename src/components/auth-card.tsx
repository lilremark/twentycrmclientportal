import { connection } from "next/server";

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
      <div className="auth-preview" aria-hidden="true">
        <aside className="auth-preview-sidebar">
          <div className="auth-preview-brand">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src={branding.logoUrl} />
            ) : (
              <span>{branding.name.slice(0, 2).toUpperCase()}</span>
            )}
            <strong>{branding.name}</strong>
          </div>
          {["Overview", "Clients", "Portal views", "Settings"].map((item, index) => (
            <span className={index === 2 ? "active" : ""} key={item}>
              {item}
            </span>
          ))}
        </aside>
        <section className="auth-preview-main">
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
        </section>
      </div>
      <section className="auth-card">
        <div className="auth-card-heading">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={branding.name} className="brand-logo" src={branding.logoUrl} />
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
    </main>
  );
}
