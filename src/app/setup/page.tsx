import { count } from "drizzle-orm";
import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup-form";
import { db } from "@/lib/db";
import { getDefaultApplicationSettings } from "@/lib/application-settings";
import { portalAdministrators } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ value }] = await db
    .select({ value: count() })
    .from(portalAdministrators);
  if (value > 0) redirect("/login");

  const branding = getDefaultApplicationSettings();

  return (
    <main
      className="setup-shell"
      style={{ "--brand-primary": branding.primaryColor } as React.CSSProperties}
    >
      <header className="setup-header">
        <div className="setup-header-brand">
          {branding.brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={branding.brandLogoUrl} />
          ) : (
            <span>{branding.brandName.slice(0, 2).toUpperCase()}</span>
          )}
          <div>
            <strong>{branding.brandName}</strong>
            <small>Initial configuration</small>
          </div>
        </div>
        <p>Your settings remain editable after setup.</p>
      </header>

      <section className="setup-layout">
        <div className="setup-page-intro">
          <div>
            <span className="eyebrow">Initial configuration</span>
            <h1>Set up your client portal</h1>
          </div>
          <p>
            Create the administrator, connect Twenty CRM, configure email, and
            apply your branding. Nothing is saved until setup is complete.
          </p>
        </div>

        <SetupForm />
      </section>
    </main>
  );
}
