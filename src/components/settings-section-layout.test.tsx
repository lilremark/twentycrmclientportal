// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsSectionLayout } from "@/components/settings-section-layout";

afterEach(cleanup);

describe("SettingsSectionLayout", () => {
  it("shows one persistent settings section at a time", () => {
    render(
      <SettingsSectionLayout
        access={<p>Access content</p>}
        brand={<input aria-label="Brand name" defaultValue="Apex" />}
        deployment={<p>Deployment content</p>}
        email={<p>Email content</p>}
        profile={<p>Profile content</p>}
        twenty={<p>Twenty content</p>}
      />,
    );

    const brandInput = screen.getByLabelText("Brand name");
    fireEvent.change(brandInput, { target: { value: "Updated Apex" } });
    fireEvent.click(screen.getByRole("button", { name: /Email/ }));

    expect(screen.getByText("Email content")).toBeVisible();
    expect(brandInput.closest("section")).toHaveAttribute("hidden");

    fireEvent.click(screen.getByRole("button", { name: /Brand and portal/ }));
    expect(brandInput).toHaveValue("Updated Apex");
  });
});
