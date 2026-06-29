import { connection } from "next/server";
import {
  BarChart3,
  CircleDollarSign,
  FolderKanban,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

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
      <section
        className={`auth-story ${
          branding.loginBackgroundUrl ? "has-custom-visual" : ""
        }`}
      >
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
          <p className="eyebrow">Client Portal</p>
        </div>
        <div className="auth-collage" aria-hidden="true">
          <article className="auth-collage-card auth-collage-projects">
            <span className="auth-collage-icon"><FolderKanban size={20} /></span>
            <small>Active projects</small>
            <strong>12</strong>
            <div className="auth-collage-progress"><i /></div>
            <p>8 on track · 3 planning · 1 at risk</p>
          </article>
          <article className="auth-collage-card auth-collage-revenue">
            <span className="auth-collage-icon"><CircleDollarSign size={20} /></span>
            <small>Project value</small>
            <strong>$140,000</strong>
            <p><TrendingUp size={14} /> 13.6% this quarter</p>
          </article>
          <article className="auth-collage-card auth-collage-invoices">
            <header>
              <span className="auth-collage-icon"><ReceiptText size={19} /></span>
              <small>Invoices</small>
            </header>
            {["INV-1055", "INV-1052", "INV-1048"].map((invoice, index) => (
              <div className="auth-collage-row" key={invoice}>
                <span>{invoice}</span>
                <strong>{["Draft", "Sent", "Paid"][index]}</strong>
              </div>
            ))}
          </article>
          <article className="auth-collage-card auth-collage-activity">
            <span className="auth-collage-icon"><BarChart3 size={20} /></span>
            <small>Completion</small>
            <strong>72%</strong>
            <div className="auth-collage-bars">
              {[42, 68, 54, 86, 72, 94].map((height) => (
                <i key={height} style={{ "--bar-height": `${height}%` } as React.CSSProperties} />
              ))}
            </div>
          </article>
          <div className="auth-collage-caption">
            <strong>Everything shared with you, in one place.</strong>
            <span>Projects, invoices, reports, and updates stay connected.</span>
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
            {title === "Sign in" ? null : <p>{branding.name}</p>}
            <h1>
              {title === "Sign in" ? `Sign in to ${branding.name}` : title}
            </h1>
            <span>{description}</span>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
