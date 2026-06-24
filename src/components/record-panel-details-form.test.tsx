// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecordPanelDetailsForm } from "@/components/record-panel-details-form";
import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";

const metadataFields: TwentyFieldMetadata[] = [
  {
    id: "name",
    name: "name",
    label: "Name",
    type: "TEXT",
    isNullable: false,
  },
  {
    id: "status",
    name: "status",
    label: "Status",
    type: "SELECT",
    isNullable: true,
    options: [
      { value: "OPEN", label: "Open" },
      { value: "CLOSED", label: "Closed" },
    ],
  },
];

const fields: PortalFieldConfig[] = [
  { name: "name", label: "Name" },
  { name: "status", label: "Status" },
];

afterEach(cleanup);

describe("RecordPanelDetailsForm", () => {
  it("renders only configured edit fields as inline controls", () => {
    render(
      <RecordPanelDetailsForm
        action={vi.fn()}
        canEdit
        editableFields={[{ name: "status", label: "Status" }]}
        fields={fields}
        formatSelectValues
        metadataFields={metadataFields}
        values={{ name: "Acme", status: "OPEN" }}
      />,
    );

    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeVisible();
    expect(screen.getByLabelText("Status")).toHaveValue("OPEN");
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
  });

  it("keeps edit fields read-only when the viewer cannot edit", () => {
    render(
      <RecordPanelDetailsForm
        action={vi.fn()}
        canEdit={false}
        editableFields={[{ name: "status", label: "Status" }]}
        fields={fields}
        formatSelectValues
        metadataFields={metadataFields}
        values={{ name: "Acme", status: "OPEN" }}
      />,
    );

    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.getByText("Open")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
  });
});
