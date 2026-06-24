"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  Users,
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
  users: Users,
  views: PanelsTopLeft,
};

export function AppShell({
  title,
  user,
  navigation,
  branding,
  variant = "admin",
  children,
}: {
  title: string;
  user: { name: string; email: string; image: string | null };
  navigation: Array<{ href: string; label: string; icon: string }>;
  branding: { name: string; logoUrl: string | null; primaryColor: string };
  variant?: "admin" | "portal";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileClosing, setProfileClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const previousBrand = root.style.getPropertyValue("--brand-primary");
    root.style.setProperty("--brand-primary", branding.primaryColor);
    const frame = requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    });
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      const next = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      setTheme(next);
    };
    window.addEventListener("storage", syncTheme);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", syncTheme);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (previousBrand) {
        root.style.setProperty("--brand-primary", previousBrand);
      } else {
        root.style.removeProperty("--brand-primary");
      }
    };
  }, [branding.primaryColor]);

  const openAccountDrawer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setProfileClosing(false);
    setProfileOpen(true);
  };

  const closeAccountDrawer = () => {
    setProfileClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setProfileOpen(false);
      setProfileClosing(false);
      closeTimerRef.current = null;
    }, 110);
  };

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      localStorage.setItem("sidebar-collapsed", String(!current));
      return !current;
    });
  };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("theme", next);
    document.cookie = `theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setTheme(next);
  };
  const isActiveNavigation = (href: string) =>
    pathname === href ||
    (href !== "/portal" && href !== "/admin" && pathname.startsWith(`${href}/`));
  const activeNavigation = navigation.find((item) =>
    isActiveNavigation(item.href),
  );
  const headerTitle = activeNavigation?.label ?? title;
  const sectionTabs = pathname.startsWith("/admin/settings")
    ? [
        { href: "/admin/settings", label: "Settings" },
        { href: "/admin/settings/audit", label: "Audit" },
        { href: "/admin/settings/health", label: "Health" },
      ]
    : pathname.startsWith("/admin/invitations")
      ? [
          { href: "/admin/invitations", label: "Invitations" },
          { href: "/admin/invitations/clients", label: "Client accounts" },
        ]
      : [];
  const settingsHref = variant === "admin" ? "/admin/settings" : "/portal/settings";

  return (
    <div
      className={`app-frame ${variant}-shell ${
        collapsed ? "sidebar-collapsed" : "sidebar-expanded"
      }`}
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
            className={`sidebar-collapse-button desktop-only ${
              collapsed ? "is-collapsed" : ""
            }`}
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <>
                <span className="collapsed-brand-face">
                  {branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={branding.logoUrl} />
                  ) : (
                    branding.name.slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="collapsed-open-face">
                  <PanelLeftOpen size={16} />
                </span>
              </>
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
            const active = isActiveNavigation(item.href);
            return (
              <Link
                className={`sidebar-link ${active ? "active" : ""}`}
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
      </aside>
      {profileOpen ? (
        <>
          <button
            aria-label="Close account menu"
            className={`account-drawer-backdrop ${
              profileClosing ? "is-closing" : ""
            }`}
            onClick={closeAccountDrawer}
            type="button"
          />
          <aside
            aria-label="Account menu"
            className={`account-drawer ${profileClosing ? "is-closing" : ""}`}
          >
            <div className="account-drawer-header">
              <div className="sidebar-avatar">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={user.image} />
                ) : (
                  <span>{user.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <button
                aria-label="Close account menu"
                className="icon-button"
                onClick={closeAccountDrawer}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="account-drawer-actions">
              <Link href={settingsHref} onClick={closeAccountDrawer}>
                <Settings size={16} />
                <span>Settings</span>
              </Link>
              <SignOutButton className="account-drawer-signout" label="Sign out" />
            </nav>
          </aside>
        </>
      ) : null}
      <main className="app-main">
        <header className="app-header">
          <div className="app-header-top">
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
                <h1>{headerTitle}</h1>
              </div>
            </div>
            <div className="app-header-actions">
              <button
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="icon-button"
                onClick={toggleTheme}
                type="button"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                aria-expanded={profileOpen}
                aria-label="Open account menu"
                className="header-account-button"
                onClick={profileOpen ? closeAccountDrawer : openAccountDrawer}
                title={user.name}
                type="button"
              >
                <span className="sidebar-avatar">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={user.image} />
                  ) : (
                    user.name.slice(0, 2).toUpperCase()
                  )}
                </span>
              </button>
            </div>
          </div>
          {sectionTabs.length ? (
            <nav aria-label={`${headerTitle} sections`} className="app-section-tabs">
              {sectionTabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`app-section-tab ${active ? "active" : ""}`}
                    href={tab.href}
                    key={tab.href}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
