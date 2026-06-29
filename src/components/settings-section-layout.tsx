"use client";

import {
  Building2,
  KeyRound,
  Mail,
  ServerCog,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";

type SectionId =
  | "brand"
  | "twenty"
  | "email"
  | "access"
  | "profile"
  | "deployment";

const sections = [
  {
    id: "brand" as const,
    label: "Brand and portal",
    description: "Identity, colors, and portal messaging",
    icon: Building2,
  },
  {
    id: "twenty" as const,
    label: "Twenty CRM",
    description: "Data source and webhook connection",
    icon: ServerCog,
  },
  {
    id: "email" as const,
    label: "Email",
    description: "Delivery and invitation template",
    icon: Mail,
  },
  {
    id: "access" as const,
    label: "Access and SSO",
    description: "Identity providers and sign-in rules",
    icon: ShieldCheck,
  },
  {
    id: "profile" as const,
    label: "Profile",
    description: "Your administrator identity",
    icon: UserRound,
  },
  {
    id: "deployment" as const,
    label: "Deployment",
    description: "Environment and secret readiness",
    icon: KeyRound,
  },
];

export function SettingsSectionLayout({
  access,
  brand,
  deployment,
  email,
  profile,
  twenty,
}: Record<SectionId, React.ReactNode>) {
  const [activeSection, setActiveSection] = useState<SectionId>("brand");

  const content: Record<SectionId, React.ReactNode> = {
    access,
    brand,
    deployment,
    email,
    profile,
    twenty,
  };
  const active = sections.find((section) => section.id === activeSection)!;

  return (
    <div className="settings-layout">
      <aside className="settings-local-nav" aria-label="Settings sections">
        <div className="settings-local-nav-heading">
          <p>Configuration</p>
          <span>Choose one area to edit.</span>
        </div>
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              aria-controls={`settings-panel-${section.id}`}
              aria-current={activeSection === section.id ? "page" : undefined}
              className={activeSection === section.id ? "active" : ""}
              id={`settings-nav-${section.id}`}
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                window.history.replaceState(null, "", `#${section.id}`);
              }}
              type="button"
            >
              <Icon size={16} />
              <span>
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
            </button>
          );
        })}
      </aside>

      <div className="settings-workspace">
        <header className="settings-workspace-heading">
          <p className="eyebrow">Settings</p>
          <h2>{active.label}</h2>
          <p>{active.description}</p>
        </header>
        {sections.map((section) => (
          <section
            aria-labelledby={`settings-nav-${section.id}`}
            className="settings-section-panel"
            hidden={activeSection !== section.id}
            id={`settings-panel-${section.id}`}
            key={section.id}
          >
            {content[section.id]}
          </section>
        ))}
      </div>
    </div>
  );
}
