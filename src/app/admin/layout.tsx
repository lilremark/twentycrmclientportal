import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/access";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/views", label: "Portal views" },
  { href: "/admin/invitations", label: "Invitations" },
  { href: "/admin/audit", label: "Audit" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await requireAdmin();
  return (
    <AppShell
      title="Portal administration"
      subtitle={current.user.email}
      navigation={navigation}
    >
      {children}
    </AppShell>
  );
}
