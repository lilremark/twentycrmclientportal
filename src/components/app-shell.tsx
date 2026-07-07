"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Building2,
  BriefcaseBusiness,
  BarChart3,
  ChevronDown,
  ClipboardList,
  CalendarDays,
  FileText,
  Folder,
  FileClock,
  House,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Table2,
  Target,
  Settings,
  Sun,
  UserPlus,
  Users,
  X,
  icons,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ClientOnboardingTour } from "@/components/client-onboarding-tour";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";

const navigationIcons: Record<string, LucideIcon> = {
  audit: FileClock,
  clients: Building2,
  home: House,
  invitations: UserPlus,
  overview: LayoutDashboard,
  records: ClipboardList,
  reports: BarChart3,
  settings: Settings,
  users: Users,
  views: PanelsTopLeft,
  table: Table2,
  folder: Folder,
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  chart: BarChart3,
  file: FileText,
  target: Target,
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
  navigation: Array<{
    href: string;
    label: string;
    icon: string;
    reportsEnabled?: boolean;
    iconColor?: string;
  }>;
  branding: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    iconColor: string;
  };
  variant?: "admin" | "portal";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(232);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileClosing, setProfileClosing] = useState(false);
  const [openSidebarSections, setOpenSidebarSections] = useState({
    account: true,
    shared: true,
    workspace: true,
  });
  const closeTimerRef = useRef<number | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const [accountPosition, setAccountPosition] = useState({ top: 54, right: 12 });
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const previousBrand = root.style.getPropertyValue("--brand-primary");
    const previousIcon = root.style.getPropertyValue("--icon-color");
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--icon-color", branding.iconColor);
    const frame = requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
      const storedWidth = Number(localStorage.getItem("sidebar-width"));
      if (Number.isFinite(storedWidth) && storedWidth >= 200 && storedWidth <= 360) {
        setSidebarWidth(storedWidth);
      }
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
      const storedSections = localStorage.getItem("sidebar-sections");
      if (storedSections) {
        try {
          setOpenSidebarSections((current) => ({
            ...current,
            ...(JSON.parse(storedSections) as Partial<typeof current>),
          }));
        } catch {
          localStorage.removeItem("sidebar-sections");
        }
      }
    });
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      const next = event.newValue === "dark" ? "dark" : "light";
      const root = document.documentElement;
      root.dataset.theme = next;
      root.classList.toggle("dark", next === "dark");
      root.style.colorScheme = next;
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
      if (previousIcon) {
        root.style.setProperty("--icon-color", previousIcon);
      } else {
        root.style.removeProperty("--icon-color");
      }
    };
  }, [branding.iconColor, branding.primaryColor]);

  const openAccountDrawer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setProfileClosing(false);
    const bounds = accountButtonRef.current?.getBoundingClientRect();
    if (bounds) {
      setAccountPosition({
        top: Math.round(bounds.bottom + 8),
        right: Math.max(12, Math.round(window.innerWidth - bounds.right)),
      });
    }
    setProfileOpen(true);
  };

  useEffect(() => {
    if (!profileOpen) return;
    const updatePosition = () => {
      const bounds = accountButtonRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setAccountPosition({
        top: Math.round(bounds.bottom + 8),
        right: Math.max(12, Math.round(window.innerWidth - bounds.right)),
      });
    };
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [profileOpen]);

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
  const updateSidebarWidth = (width: number) => {
    const next = Math.min(Math.max(Math.round(width), 200), 360);
    setSidebarWidth(next);
    localStorage.setItem("sidebar-width", String(next));
  };
  const startSidebarResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const move = (pointerEvent: PointerEvent) => {
      updateSidebarWidth(startWidth + pointerEvent.clientX - startX);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.dataset.theme = next;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    localStorage.setItem("theme", next);
    document.cookie = `theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setTheme(next);
  };
  const isActiveNavigation = (href: string) =>
    pathname === href ||
    (href !== "/portal" &&
      href !== "/admin" &&
      pathname.startsWith(`${href}/`));
  const activeNavigation = navigation.find((item) =>
    isActiveNavigation(item.href),
  );
  const headerTitle = activeNavigation?.label ?? title;
  const HeaderIcon = navigationIcons[activeNavigation?.icon ?? "overview"] ?? LayoutDashboard;
  const activePortalView =
    variant === "portal"
      ? navigation.find(
          (item) =>
            item.href.startsWith("/portal/") &&
            item.href !== "/portal/settings" &&
            isActiveNavigation(item.href),
        )
      : undefined;

  const viewId = params?.viewId;
  const isEditView =
    pathname.startsWith("/admin/views/") &&
    viewId &&
    !pathname.endsWith("/preview");
  const isNewView = pathname === "/admin/views/new";

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
      : isEditView
        ? [
            {
              href: `/admin/views/${viewId}?tab=general`,
              label: "General Settings",
            },
            {
              href: `/admin/views/${viewId}?tab=reports`,
              label: "Reports Dashboard",
            },
          ]
        : isNewView
          ? [
              {
                href: "/admin/views/new?tab=general",
                label: "General Settings",
              },
              {
                href: "/admin/views/new?tab=reports",
                label: "Reports Dashboard",
              },
            ]
          : activePortalView?.reportsEnabled
            ? [
                { href: activePortalView.href, label: "Records" },
                { href: `${activePortalView.href}/reports`, label: "Reports" },
              ]
            : [];
  const settingsHref =
    variant === "admin" ? "/admin/settings" : "/portal/settings";
  const sidebarSections =
    variant === "portal"
      ? [
          {
            key: "workspace" as const,
            label: "Workspace",
            items: navigation.filter((item) => item.href === "/portal"),
          },
          {
            key: "shared" as const,
            label: "Shared Views",
            items: navigation.filter(
              (item) =>
                item.href !== "/portal" && item.href !== "/portal/settings",
            ),
          },
          {
            key: "account" as const,
            label: "Account",
            items: navigation.filter((item) => item.href === "/portal/settings"),
          },
        ].filter((section) => section.items.length)
      : [
          {
            key: "workspace" as const,
            label: "Workspace",
            items: navigation,
          },
        ];
  const toggleSidebarSection = (key: keyof typeof openSidebarSections) => {
    setOpenSidebarSections((current) => {
      const next = { ...current, [key]: !current[key] };
      localStorage.setItem("sidebar-sections", JSON.stringify(next));
      return next;
    });
  };
  const tourTargetForItem = (href: string) => {
    if (href === "/admin/views") return "views";
    if (href === "/admin/invitations") return "invitations";
    if (href === "/admin/settings") return "settings";
    if (variant === "portal" && href === "/portal") return "client-home";
    if (variant === "portal" && href === "/portal/settings") {
      return "client-account";
    }
    return undefined;
  };

  return (
    <div
      className={`app-frame ${variant}-shell ${
        collapsed ? "sidebar-collapsed" : "sidebar-expanded"
      }`}
      style={
        {
          "--brand-primary": branding.primaryColor,
          "--icon-color": branding.iconColor,
          "--sidebar-width": collapsed ? "56px" : `${sidebarWidth}px`,
        } as React.CSSProperties
      }
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
              <span>{variant === "admin" ? "Admin portal" : "Client portal"}</span>
            </span>
          </Link>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={`sidebar-collapse-button desktop-only ${
              collapsed ? "is-collapsed client-sidebar-control" : ""
            }`}
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <>
                <span className="collapsed-brand-face" aria-hidden="true">
                  {branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={branding.logoUrl} />
                  ) : (
                    branding.name.slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="collapsed-open-face" aria-hidden="true">
                  <PanelLeftOpen size={17} />
                </span>
              </>
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
          <Button
            aria-label="Close navigation"
            className="icon-button mobile-only"
            onClick={() => setMobileOpen(false)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X size={19} />
          </Button>
        </div>
        <nav aria-label="Primary navigation" className="sidebar-nav">
          {sidebarSections.map((section) => {
            const sectionOpen = collapsed || openSidebarSections[section.key];
            const sectionId = `sidebar-section-${section.key}`;
            return (
              <section className="sidebar-nav-section" key={section.key}>
                <button
                  aria-controls={sectionId}
                  aria-expanded={sectionOpen}
                  className="sidebar-section-toggle"
                  data-tour-target={
                    variant === "portal" && section.key === "shared"
                      ? "client-shared-views"
                      : undefined
                  }
                  onClick={() => toggleSidebarSection(section.key)}
                  type="button"
                >
                  <span>{section.label}</span>
                  <ChevronDown aria-hidden="true" size={13} />
                </button>
                <div
                  className="sidebar-section-items"
                  hidden={!sectionOpen}
                  id={sectionId}
                >
                  {section.items.map((item) => {
                    const Icon = navigationIcons[item.icon] ?? (icons[item.icon as keyof typeof icons] as LucideIcon | undefined) ?? ClipboardList;
                    const active = isActiveNavigation(item.href);
                    return (
                      <Link
                        className={`sidebar-link ${active ? "active" : ""}`}
                        data-tour-target={tourTargetForItem(item.href)}
                        href={item.href}
                        key={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="sidebar-link-icon" style={item.iconColor ? ({ "--item-icon-color": item.iconColor } as CSSProperties) : undefined}>
                          <Icon size={18} strokeWidth={1.9} />
                        </span>
                        <span className="sidebar-link-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
        {!collapsed ? (
          <div
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemax={360}
            aria-valuemin={200}
            aria-valuenow={sidebarWidth}
            className="sidebar-resize-handle desktop-only"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") updateSidebarWidth(sidebarWidth - 8);
              if (event.key === "ArrowRight") updateSidebarWidth(sidebarWidth + 8);
            }}
            onPointerDown={startSidebarResize}
            role="separator"
            tabIndex={0}
          />
        ) : null}
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
            style={
              {
                "--account-menu-top": `${accountPosition.top}px`,
                "--account-menu-right": `${accountPosition.right}px`,
              } as CSSProperties
            }
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
              <Button
                aria-label="Close account menu"
                className="icon-button"
                onClick={closeAccountDrawer}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X size={16} />
              </Button>
            </div>
            <nav className="account-drawer-actions">
              <Link href={settingsHref} onClick={closeAccountDrawer}>
                <Settings size={16} />
                <span>Settings</span>
              </Link>
              <SignOutButton
                className="account-drawer-signout"
                label="Sign out"
              />
            </nav>
          </aside>
        </>
      ) : null}
      <main className="app-main">
        <header className="app-header">
          <div className="app-header-top">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                aria-label="Open navigation"
                className="icon-button mobile-only"
                onClick={() => setMobileOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Menu size={20} />
              </Button>
              <span className="header-section-icon" aria-hidden="true">
                <HeaderIcon size={17} />
              </span>
              <div className="min-w-0">
                <h1>{headerTitle}</h1>
              </div>
            </div>
            <div className="app-header-actions">
              <Button
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="icon-button"
                onClick={toggleTheme}
                size="icon"
                type="button"
                variant="ghost"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <button
                aria-expanded={profileOpen}
                aria-label="Open account menu"
                className="header-account-button"
                onClick={profileOpen ? closeAccountDrawer : openAccountDrawer}
                title={user.name}
                type="button"
                ref={accountButtonRef}
                data-tour-target="client-account"
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
            <nav
              aria-label={`${headerTitle} sections`}
              className="app-section-tabs"
              data-tour-target={
                variant === "portal" ? "client-view-tabs" : undefined
              }
            >
              {sectionTabs.map((tab) => {
                const hasQuery = tab.href.includes("?");
                const pathPart = hasQuery ? tab.href.split("?")[0] : tab.href;
                const queryPart = hasQuery ? tab.href.split("?")[1] : "";
                const tabQuery = new URLSearchParams(queryPart).get("tab");
                const active = tabQuery
                  ? pathname === pathPart &&
                    (searchParams.get("tab") || "general") === tabQuery
                  : pathname === tab.href ||
                    (activePortalView &&
                      tab.href === activePortalView.href &&
                      pathname.startsWith(`${tab.href}/`) &&
                      !pathname.startsWith(`${tab.href}/reports`));
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
              <div className="app-section-actions" id="portal-section-actions" />
            </nav>
          ) : null}
        </header>
        <div className="app-content">{children}</div>
      </main>
      {variant === "portal" ? (
        <ClientOnboardingTour userKey={user.email || user.name} />
      ) : null}
    </div>
  );
}
