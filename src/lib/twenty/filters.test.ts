import { describe, expect, it } from "vitest";

import {
  buildPortalScopeFilter,
  buildScopedFilter,
} from "@/lib/twenty/filters";

describe("buildScopedFilter", () => {
  it("always injects the server-owned Person scope", () => {
    expect(
      buildScopedFilter({
        scopeFieldName: "personId",
        twentyPersonId: "person-a",
        configuredFilters: [],
        requestedFilters: [
          { field: "personId", operator: "eq", value: "person-b" },
        ],
      }),
    ).toEqual({ personId: { eq: "person-a" } });
  });

  it("uses nested IDs when a Person scope is a relation field", () => {
    expect(
      buildPortalScopeFilter({
        scopeMode: "person",
        scopeFieldName: "person",
        allowedRecordIds: [],
        twentyPersonId: "person-a",
        metadataFields: [
          {
            id: "person",
            name: "person",
            label: "Person",
            type: "RELATION",
            isNullable: false,
          },
        ],
      }),
    ).toEqual({ person: { id: { eq: "person-a" } } });
  });

  it("does not scope all-record portals", () => {
    expect(
      buildPortalScopeFilter({
        scopeMode: "all",
        scopeFieldName: "",
        allowedRecordIds: [],
        twentyPersonId: null,
        metadataFields: [],
      }),
    ).toEqual({});
  });

  it("applies saved filters directly to all-record portals", () => {
    expect(
      buildScopedFilter({
        scopeFilter: {},
        fixedFilters: [
          {
            name: "product",
            operator: "in",
            value: "CFDP",
          },
        ],
        metadataFields: [
          {
            id: "product",
            name: "product",
            label: "Product",
            type: "SELECT",
            isNullable: false,
          },
        ],
        configuredFilters: [],
        requestedFilters: [],
      }),
    ).toEqual({ product: { in: ["CFDP"] } });
  });

  it("limits explicit-record portals by record ID", () => {
    expect(
      buildPortalScopeFilter({
        scopeMode: "records",
        scopeFieldName: "",
        allowedRecordIds: ["record-a", "record-b"],
        twentyPersonId: null,
        metadataFields: [],
      }),
    ).toEqual({ id: { in: ["record-a", "record-b"] } });
  });

  it("only accepts configured fields and operators", () => {
    expect(
      buildScopedFilter({
        scopeFieldName: "personId",
        twentyPersonId: "person-a",
        configuredFilters: [{ name: "status", operators: ["eq", "in"] }],
        requestedFilters: [
          { field: "status", operator: "in", value: "OPEN, WON" },
          { field: "privateNotes", operator: "contains", value: "secret" },
        ],
      }),
    ).toEqual({
      and: [
        { personId: { eq: "person-a" } },
        { status: { in: ["OPEN", "WON"] } },
      ],
    });
  });

  it("always applies saved multi-select filters with Twenty's containsAny operator", () => {
    expect(
      buildScopedFilter({
        scopeFilter: { personId: { eq: "person-a" } },
        fixedFilters: [
          {
            name: "product",
            label: "Product",
            operator: "containsAny",
            value: "CONSULTING, SUPPORT",
          },
        ],
        metadataFields: [
          {
            id: "product",
            name: "product",
            label: "Product",
            type: "MULTI_SELECT",
            isNullable: true,
          },
        ],
        configuredFilters: [],
        requestedFilters: [],
      }),
    ).toEqual({
      and: [
        { personId: { eq: "person-a" } },
        {
          product: {
            containsAny: ["CONSULTING", "SUPPORT"],
          },
        },
      ],
    });
  });

  it("nests saved relation filters under the related record ID", () => {
    expect(
      buildScopedFilter({
        scopeFilter: { id: { in: ["record-a"] } },
        fixedFilters: [
          {
            name: "product",
            label: "Product",
            operator: "eq",
            value: "product-a",
          },
        ],
        metadataFields: [
          {
            id: "product",
            name: "product",
            label: "Product",
            type: "RELATION",
            isNullable: true,
          },
        ],
        configuredFilters: [],
        requestedFilters: [],
      }),
    ).toEqual({
      and: [
        { id: { in: ["record-a"] } },
        { product: { id: { eq: "product-a" } } },
      ],
    });
  });
});
