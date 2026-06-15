"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  FileClock,
  House,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Settings,
  Sun,
  UserPlus,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

const navigationIcons: Record<string, LucideIcon> = {
  audit: FileClock,
  clients: Building2,
  home: House,
  invitations: UserPlus,
  overview: LayoutDashboard,
  records: ClipboardList,
  settings: Settings,
  views: PanelsTopLeft,
};

export function AppShell({
  title,
  subtitle,
  user,
  navigation,
  branding,
  children,
}: {
  title: string;
  subtitle: string;
  user: { name: string; email: string; image: string | null };
  navigation: Array<{ href: string; label: string; icon: string }>;
  branding: { name: string; logoUrl: string | null; primaryColor: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      localStorage.setItem("sidebar-collapsed", String(!current));
      return !current;
    });
  };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <div
      className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}
      style={{ "--brand-primary": branding.primaryColor } as React.CSSProperties}
    >
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}
      <aside className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Link className="brand-link" href="/" title={branding.name}>
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={branding.name}
                className="brand-logo"
                src={branding.logoUrl}
              />
            ) : (
              <span className="brand-mark">
                {branding.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="brand-copy">
              <strong>{branding.name}</strong>
              <span>Client portal</span>
            </span>
          </Link>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="sidebar-collapse-button desktop-only"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
          <button
            aria-label="Close navigation"
            className="icon-button mobile-only"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <X size={19} />
          </button>
        </div>
        <div className="sidebar-section-label">
          <span>Workspace</span>
        </div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = navigationIcons[item.icon] ?? ClipboardList;
            return (
              <Link
                className={`sidebar-link ${
                  pathname === item.href ||
                  (item.href !== "/portal" &&
                    item.href !== "/admin" &&
                    pathname.startsWith(`${item.href}/`))
                    ? "active"
                    : ""
                }`}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-link-icon">
                  <Icon size={18} strokeWidth={1.9} />
                </span>
                <span className="sidebar-link-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-profile" title={collapsed ? user.name : undefined}>
          <div className="sidebar-avatar">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src={user.image} />
            ) : (
              <span>{user.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="sidebar-profile-copy">
            <strong>{user.name}</strong>
            <span>{subtitle}</span>
          </div>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-header">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="icon-button mobile-only"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1>{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="icon-button"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <SignOutButton />
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
