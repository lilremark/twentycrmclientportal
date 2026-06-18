import Link from "next/link";

export type AdminTopTab = {
  href: string;
  label: string;
  description?: string;
};

export function AdminTopTabs({
  activeHref,
  tabs,
}: {
  activeHref: string;
  tabs: AdminTopTab[];
}) {
  return (
    <nav aria-label="Section navigation" className="admin-top-tabs">
      {tabs.map((tab) => (
        <Link
          aria-current={activeHref === tab.href ? "page" : undefined}
          className={activeHref === tab.href ? "active" : ""}
          href={tab.href}
          key={tab.href}
        >
          <span>{tab.label}</span>
          {tab.description ? <small>{tab.description}</small> : null}
        </Link>
      ))}
    </nav>
  );
}

export const settingsTabs: AdminTopTab[] = [
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Branding, profile, integrations",
  },
  {
    href: "/admin/settings/audit",
    label: "Audit",
    description: "Activity and security history",
  },
];

export const invitationTabs: AdminTopTab[] = [
  {
    href: "/admin/invitations",
    label: "Invitations",
    description: "Invite and revoke access",
  },
  {
    href: "/admin/invitations/clients",
    label: "Client accounts",
    description: "Person mappings and access scope",
  },
];
