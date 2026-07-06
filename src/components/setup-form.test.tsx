// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setupAction } from "@/app/actions/auth";
import { SetupForm } from "@/components/setup-form";

vi.mock("@/app/actions/auth", () => ({
  setupAction: vi.fn(async () => ({ error: undefined })),
  testSetupSmtpAction: vi.fn(async () => ({
    status: "success",
    message: "SMTP connection verified.",
  })),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.mocked(setupAction).mockReset();
  vi.mocked(setupAction).mockResolvedValue({ error: undefined });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function completeAdministratorStep() {
  fireEvent.change(screen.getByLabelText("Administrator name"), {
    target: { value: "Demo Administrator" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "admin@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "TestPassword1" },
  });
}

function finishStepTransition() {
  act(() => vi.advanceTimersByTime(420));
}

function continueToNextStep() {
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
  finishStepTransition();
}

describe("SetupForm", () => {
  it("preserves a five-stage rail and uses directional step motion", () => {
    render(<SetupForm />);

    expect(
      screen.getByRole("heading", {
        name: "A few focused steps from a portal that feels like yours.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("navigation", { name: "Setup progress" }),
    ).not.toBeInTheDocument();

    completeAdministratorStep();
    continueToNextStep();
    expect(
      screen.getByRole("navigation", { name: "Setup progress" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", {
        name: /Administrator|Twenty CRM|Email|Branding|Launch/,
      }),
    ).toHaveLength(5);
    expect(screen.getByRole("button", { name: /Launch/ })).toBeDisabled();
    expect(screen.getByRole("group", { name: "Connect Twenty CRM" })).toBeVisible();
    expect(document.querySelector(".setup-stage")).toHaveClass("is-forward");

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    finishStepTransition();
    expect(
      screen.getByRole("group", { name: "Create the portal administrator" }),
    ).toBeVisible();
    expect(document.querySelector(".setup-stage")).toHaveClass("is-backward");
  });

  it("shows the workspace progress stage before the final server submission", () => {
    render(<SetupForm />);
    completeAdministratorStep();

    continueToNextStep();
    continueToNextStep();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(
      screen.getByRole("group", { name: "Apply your branding" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /Launch workspace/ })).toBeDisabled();

    finishStepTransition();
    fireEvent.click(screen.getByRole("button", { name: /Launch workspace/ }));

    expect(
      screen.getByRole("heading", { name: "Building your client portal" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Workspace setup progress" }),
    ).toBeVisible();
    expect(screen.getByText("Securing the administrator account")).toBeVisible();
    expect(screen.getByLabelText("Administrator name")).toHaveValue(
      "Demo Administrator",
    );
    expect(setupAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Launch/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("finishes at 100 percent before offering the tour choice", async () => {
    vi.mocked(setupAction).mockResolvedValueOnce({ setupComplete: true });
    render(<SetupForm />);
    completeAdministratorStep();

    continueToNextStep();
    continueToNextStep();
    continueToNextStep();
    fireEvent.click(screen.getByRole("button", { name: /Launch workspace/ }));

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
    });
    expect(
      screen.getByRole("progressbar", { name: "Workspace setup progress" }),
    ).toHaveAttribute("aria-valuenow", "100");

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: "Your portal is ready for sign-in." }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Sign in and take the tour/ }),
    ).toHaveAttribute("href", "/login?setup=complete&tour=1");
  });
});
