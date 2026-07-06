import { count } from "drizzle-orm";
import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup-form";
import { SetupThemeToggle } from "@/components/setup-theme-toggle";
import { db } from "@/lib/db";
import { getDefaultApplicationSettings } from "@/lib/application-settings";
import { portalAdministrators } from "@/lib/db/schema";

import "./oobe.css";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ value }] = await db
    .select({ value: count() })
    .from(portalAdministrators);
  if (value > 0) redirect("/login");

  const branding = getDefaultApplicationSettings();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{const t=localStorage.getItem('setup-theme')==='dark'?'dark':'light';const r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t}catch(e){}",
        }}
      />
      <main
        className="setup-shell"
        style={{ "--brand-primary": branding.primaryColor } as React.CSSProperties}
      >
        <SetupThemeToggle />
        <section className="setup-layout">
          <SetupForm
            brandLogoUrl={branding.brandLogoUrl}
            brandName={branding.brandName}
          />
        </section>
      </main>
    </>
  );
}
