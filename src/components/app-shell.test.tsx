// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

const props = {
  branding: {
    logoUrl: null,
    name: "Apex CRM",
    primaryColor: "#2563eb",
    iconColor: "#2563eb",
  },
  navigation: [{ href: "/admin", icon: "overview", label: "Overview" }],
  title: "Portal administration",
  user: { email: "admin@example.com", image: null, name: "Admin User" },
};

const storage = new Map<string, string>();
const localStorageMock = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.dataset.theme = "light";
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppShell", () => {
  it("persists collapse and dark-mode preferences", () => {
    const { container } = render(
      <AppShell {...props}>
        <p>Workspace</p>
      </AppShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    );
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("true");
    expect(container.firstChild).toHaveClass("sidebar-collapsed");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("persists keyboard sidebar resizing", () => {
    render(
      <AppShell {...props}>
        <p>Workspace</p>
      </AppShell>,
    );

    fireEvent.keyDown(screen.getByRole("separator", { name: "Resize sidebar" }), {
      key: "ArrowRight",
    });
    expect(window.localStorage.getItem("sidebar-width")).toBe("240");
  });

  it("opens the account controls and mobile navigation", () => {
    const { container } = render(
      <AppShell {...props}>
        <p>Workspace</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByRole("complementary", { name: "Account menu" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(container.querySelector(".app-sidebar")).toHaveClass("mobile-open");
  });
});
