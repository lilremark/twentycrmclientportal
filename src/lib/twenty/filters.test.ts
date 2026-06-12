import { describe, expect, it } from "vitest";

import {
  buildPortalScopeFilter,
  buildScopedFilter,
} from "@/lib/twenty/filters";

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

  it("uses nested IDs when a Company scope is a relation field", () => {
    expect(
      buildPortalScopeFilter({
        scopeMode: "company",
        scopeFieldName: "company",
        allowedRecordIds: [],
        twentyCompanyId: "company-a",
        metadataFields: [
          {
            id: "company",
            name: "company",
            label: "Company",
            type: "RELATION",
            isNullable: false,
          },
        ],
      }),
    ).toEqual({ company: { id: { eq: "company-a" } } });
  });

  it("limits explicit-record portals by record ID", () => {
    expect(
      buildPortalScopeFilter({
        scopeMode: "records",
        scopeFieldName: "",
        allowedRecordIds: ["record-a", "record-b"],
        twentyCompanyId: null,
        metadataFields: [],
      }),
    ).toEqual({ id: { in: ["record-a", "record-b"] } });
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
