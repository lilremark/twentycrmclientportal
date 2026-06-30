// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalFilterForm } from "@/components/portal-filter-form";
import type {
  PortalFilterConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/portal/accounts",
  useRouter: () => ({
    push,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/app-select", () => ({
  AppSelect: ({ children, ...props }: React.ComponentProps<"select">) => (
    <select {...props}>{children}</select>
  ),
}));

const fields: TwentyFieldMetadata[] = [
  {
    id: "status",
    name: "status",
    label: "Status",
    type: "SELECT",
    isNullable: true,
    options: [{ value: "OPEN", label: "Open" }],
  },
];

const filters: PortalFilterConfig[] = [
  {
    name: "status",
    label: "Status",
    operators: ["eq", "neq"],
  },
];

beforeEach(() => {
  push.mockReset();
});

afterEach(cleanup);

describe("PortalFilterForm", () => {
  it("updates the sort field while preserving the active filters", () => {
    render(
      <PortalFilterForm
        clearHref="/portal/accounts"
        fields={fields}
        filters={filters}
        query={{
          f_status: "OPEN",
          op_status: "eq",
          sort: "name",
          direction: "desc",
        }}
        sortDirection="desc"
        sortField="name"
        sortFields={[
          { name: "name", label: "Name" },
          { name: "createdAt", label: "Created at" },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "createdAt" },
    });

    expect(push).toHaveBeenCalledWith(
      "/portal/accounts?f_status=OPEN&op_status=eq&sort=createdAt",
      { scroll: false },
    );
  });

  it("loads a saved view without retaining unrelated query state", () => {
    render(
      <PortalFilterForm
        activeSavedViewId="saved-1"
        clearHref="/portal/accounts"
        fields={fields}
        filters={filters}
        query={{
          saved: "saved-1",
          f_status: "OPEN",
          op_status: "eq",
        }}
        savedViews={[
          { id: "saved-1", name: "Open accounts" },
          { id: "saved-2", name: "Recently created" },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Saved view"), {
      target: { value: "saved-2" },
    });

    expect(push).toHaveBeenCalledWith(
      "/portal/accounts?saved=saved-2",
      { scroll: false },
    );
  });

  it("opens the inline form for naming the current view", () => {
    render(
      <PortalFilterForm
        clearHref="/portal/accounts"
        fields={fields}
        filters={filters}
        query={{}}
        saveViewAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save current view" }));

    expect(screen.getByLabelText("Saved view name")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save view" })).toBeVisible();
  });
});
