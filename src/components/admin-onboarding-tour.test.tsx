// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminOnboardingTour } from "@/components/admin-onboarding-tour";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  window.sessionStorage.setItem("admin-tour-pending", "1");
});

afterEach(() => {
  cleanup();
  document.querySelectorAll("[data-tour-target]").forEach((target) => target.remove());
  window.sessionStorage.clear();
  replace.mockReset();
});

describe("AdminOnboardingTour", () => {
  it("walks through the admin landmarks and can be completed", () => {
    const dashboard = document.createElement("section");
    dashboard.dataset.tourTarget = "overview";
    dashboard.scrollIntoView = vi.fn();
    const views = document.createElement("a");
    views.dataset.tourTarget = "views";
    views.scrollIntoView = vi.fn();
    const invitations = document.createElement("a");
    invitations.dataset.tourTarget = "invitations";
    invitations.scrollIntoView = vi.fn();
    const settings = document.createElement("a");
    settings.dataset.tourTarget = "settings";
    settings.scrollIntoView = vi.fn();
    document.body.append(dashboard, views, invitations, settings);

    render(<AdminOnboardingTour />);
    expect(screen.getByRole("heading", { name: "Start from the overview" })).toBeVisible();
    expect(dashboard).toHaveClass("admin-tour-highlight");

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Shape the client experience" })).toBeVisible();
    expect(dashboard).not.toHaveClass("admin-tour-highlight");
    expect(views).toHaveClass("admin-tour-highlight");

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(invitations).toHaveClass("admin-tour-highlight");
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(settings).toHaveClass("admin-tour-highlight");
    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));
    expect(replace).toHaveBeenCalledWith("/admin", { scroll: false });
  });

  it("allows the tour to be skipped immediately", () => {
    render(<AdminOnboardingTour />);
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(replace).toHaveBeenCalledWith("/admin", { scroll: false });
  });
});
