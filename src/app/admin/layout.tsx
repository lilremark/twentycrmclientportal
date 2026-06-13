import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/access";
import {
  getApplicationSettings,
  getSettingsBranding,
} from "@/lib/application-settings";

const navigation = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/clients", label: "Clients", icon: "clients" },
  { href: "/admin/views", label: "Portal views", icon: "views" },
  { href: "/admin/invitations", label: "Invitations", icon: "invitations" },
  { href: "/admin/audit", label: "Audit", icon: "audit" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [current, settings] = await Promise.all([
    requireAdmin(),
    getApplicationSettings(),
  ]);
  return (
    <AppShell
      title="Portal administration"
      subtitle="Administrator"
      user={{
        name: current.user.name,
        email: current.user.email,
        image: current.user.image ?? null,
      }}
      navigation={navigation}
      branding={getSettingsBranding(settings)}
    >
      {children}
    </AppShell>
  );
}
