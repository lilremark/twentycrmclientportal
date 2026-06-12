"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

export function AppShell({
  title,
  subtitle,
  navigation,
  branding,
  children,
}: {
  title: string;
  subtitle: string;
  navigation: Array<{ href: string; label: string }>;
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
          <Link className="brand-link" href="/">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="brand-logo" src={branding.logoUrl} />
            ) : (
              <span className="brand-mark">
                {branding.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="brand-copy">
              <strong>{branding.name}</strong>
              <span>{subtitle}</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="icon-button mobile-only"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <X size={19} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
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
                {item.label.slice(0, 1).toUpperCase()}
              </span>
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <button
          className="sidebar-collapse"
          onClick={toggleCollapsed}
          type="button"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
        </button>
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
              <h1 className="truncate text-xl font-bold">{title}</h1>
              <p className="truncate text-xs text-[var(--muted)] lg:hidden">
                {subtitle}
              </p>
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
