import { AppShell } from "@/components/app-shell";
import { requirePortalContext } from "@/lib/access";
import {
  getApplicationSettings,
  getSettingsBranding,
} from "@/lib/application-settings";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [context, settings] = await Promise.all([
    requirePortalContext(),
    getApplicationSettings(),
  ]);
  return (
    <AppShell
      title={context.clientName}
      user={{
        name: context.session.user.name,
        email: context.session.user.email,
        image: context.session.user.image ?? null,
      }}
      branding={getSettingsBranding(settings)}
      variant="portal"
      navigation={[
        { href: "/portal", label: "Home", icon: "home" },
        ...context.views.map((view) => ({
          href: `/portal/${view.slug}`,
          label: view.label,
          icon: "records",
          reportsEnabled: view.dashboardWidgets.length > 0,
        })),
        { href: "/portal/settings", label: "Settings", icon: "settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}
