import { AppShell } from "@/components/app-shell";
import { requirePortalContext } from "@/lib/access";
import { getEnabledPortalViews } from "@/lib/portal";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [context, views] = await Promise.all([
    requirePortalContext(),
    getEnabledPortalViews(),
  ]);
  return (
    <AppShell
      title={context.clientName}
      subtitle={`${context.session.user.email} · ${context.role}`}
      navigation={[
        { href: "/portal", label: "Home" },
        ...views.map((view) => ({
          href: `/portal/${view.slug}`,
          label: view.label,
        })),
      ]}
    >
      {children}
    </AppShell>
  );
}
