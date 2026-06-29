// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PortalExportButton } from "@/components/portal-export-button";

afterEach(cleanup);

describe("PortalExportButton", () => {
  it("builds a filtered XLSX export URL from selected columns", () => {
    render(
      <PortalExportButton
        columns={[
          { name: "name", label: "Name" },
          { name: "status", label: "Status" },
        ]}
        currentQueryString="f_status=OPEN&op_status=eq&sort=name&direction=desc&record=abc"
        objectLabel="Accounts"
        viewSlug="accounts"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("dialog", { name: "Export Accounts" })).toBeVisible();
    fireEvent.click(screen.getByLabelText("Status"));
    fireEvent.click(screen.getByLabelText(/XLSX/i));

    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute(
      "href",
      "/api/portal/accounts/export?f_status=OPEN&op_status=eq&sort=name&direction=desc&scope=filtered&format=xlsx&column=name",
    );
  });
});
