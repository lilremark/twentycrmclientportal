// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientOnboardingTour } from "@/components/client-onboarding-tour";

const replace = vi.fn();
let currentPath = "/portal";
let currentSearch = "";
let storedValues: Record<string, string> = {};

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

beforeEach(() => {
  currentPath = "/portal";
  currentSearch = "";
  storedValues = {};
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: vi.fn(() => {
        storedValues = {};
      }),
      getItem: vi.fn((key: string) => storedValues[key] ?? null),
      removeItem: vi.fn((key: string) => {
        delete storedValues[key];
      }),
      setItem: vi.fn((key: string, value: string) => {
        storedValues[key] = value;
      }),
    },
  });
});

afterEach(() => {
  cleanup();
  document.querySelectorAll("[data-tour-target]").forEach((target) => target.remove());
  window.localStorage.clear();
  replace.mockReset();
});

describe("ClientOnboardingTour", () => {
  it("shows first-time client users a skippable portal tour", () => {
    const home = document.createElement("a");
    home.dataset.tourTarget = "client-home";
    home.scrollIntoView = vi.fn();
    const sharedViews = document.createElement("button");
    sharedViews.dataset.tourTarget = "client-shared-views";
    sharedViews.scrollIntoView = vi.fn();
    const account = document.createElement("button");
    account.dataset.tourTarget = "client-account";
    account.scrollIntoView = vi.fn();
    document.body.append(home, sharedViews, account);

    render(<ClientOnboardingTour userKey="client@example.test" />);

    expect(screen.getByRole("heading", { name: "Start at your portal home" }))
      .toBeVisible();
    expect(home).toHaveClass("admin-tour-highlight");

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Open shared views" }))
      .toBeVisible();
    expect(sharedViews).toHaveClass("admin-tour-highlight");

    fireEvent.click(screen.getByRole("button", { name: "Close tour" }));
    expect(window.localStorage.getItem("client-tour-complete:client@example.test"))
      .toBe("1");
  });

  it("can be rerun from the tour query parameter", () => {
    currentSearch = "tour=1";
    window.localStorage.setItem("client-tour-complete:client@example.test", "1");
    const home = document.createElement("a");
    home.dataset.tourTarget = "client-home";
    document.body.append(home);

    render(<ClientOnboardingTour userKey="client@example.test" />);
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(replace).toHaveBeenCalledWith("/portal", { scroll: false });
  });

  it("does not trap mouse wheel scrolling behind the client tour", () => {
    const home = document.createElement("a");
    home.dataset.tourTarget = "client-home";
    const shell = document.createElement("div");
    shell.className = "portal-shell";
    const main = document.createElement("main");
    main.className = "app-main";
    Object.defineProperty(main, "scrollTop", {
      configurable: true,
      value: 0,
      writable: true,
    });
    shell.append(main);
    document.body.append(home, shell);

    render(<ClientOnboardingTour userKey="client@example.test" />);

    fireEvent.wheel(screen.getByRole("button", { name: "Skip client portal tour" }), {
      deltaY: 320,
    });

    expect(main.scrollTop).toBe(320);
  });
});
