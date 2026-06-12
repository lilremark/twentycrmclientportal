import { describe, expect, it } from "vitest";

import { buildScopedFilter } from "@/lib/twenty/filters";

describe("buildScopedFilter", () => {
  it("always injects the server-owned Company scope", () => {
    expect(
      buildScopedFilter({
        scopeFieldName: "companyId",
        twentyCompanyId: "company-a",
        configuredFilters: [],
        requestedFilters: [
          { field: "companyId", operator: "eq", value: "company-b" },
        ],
      }),
    ).toEqual({ companyId: { eq: "company-a" } });
  });

  it("only accepts configured fields and operators", () => {
    expect(
      buildScopedFilter({
        scopeFieldName: "companyId",
        twentyCompanyId: "company-a",
        configuredFilters: [{ name: "status", operators: ["eq", "in"] }],
        requestedFilters: [
          { field: "status", operator: "in", value: "OPEN, WON" },
          { field: "privateNotes", operator: "contains", value: "secret" },
        ],
      }),
    ).toEqual({
      and: [
        { companyId: { eq: "company-a" } },
        { status: { in: ["OPEN", "WON"] } },
      ],
    });
  });
});
