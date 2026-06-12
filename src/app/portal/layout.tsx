import { AppShell } from "@/components/app-shell";
import { requirePortalContext } from "@/lib/access";
import { getBranding } from "@/lib/env";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requirePortalContext();
  return (
    <AppShell
      title={context.clientName}
      subtitle={`${context.session.user.email} · ${context.role}`}
      branding={getBranding()}
      navigation={[
        { href: "/portal", label: "Home" },
        ...context.views.map((view) => ({
          href: `/portal/${view.slug}`,
          label: view.label,
        })),
      ]}
    >
      {children}
    </AppShell>
  );
}
