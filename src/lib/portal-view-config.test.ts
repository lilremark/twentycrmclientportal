import { describe, expect, it } from "vitest";

import type { TwentyFieldMetadata } from "@/lib/db/schema";
import {
  defaultFilterOperator,
  fieldConfigsFromNames,
  fixedFilterOperatorsForType,
  filterConfigsFromNames,
  personScopeFields,
  validateFixedFilters,
} from "@/lib/portal-view-config";

const fields: TwentyFieldMetadata[] = [
  {
    id: "title",
    name: "title",
    label: "Title",
    type: "TEXT",
    isNullable: false,
  },
  {
    id: "products",
    name: "products",
    label: "Products",
    type: "MULTI_SELECT",
    isNullable: true,
  },
  {
    id: "status",
    name: "status",
    label: "Status",
    type: "SELECT",
    isNullable: true,
    options: [{ value: "OPEN", label: "Open" }],
  },
  {
    id: "person",
    name: "person",
    label: "Person",
    type: "RELATION",
    isNullable: false,
    relationTargetObjectNameSingular: "person",
  },
];

describe("portal view metadata configuration", () => {
  it("derives labels and operators from synchronized field metadata", () => {
    expect(fieldConfigsFromNames(["title"], fields)).toEqual([
      { name: "title", label: "Title" },
    ]);
    expect(filterConfigsFromNames(["status"], fields)).toEqual([
      {
        name: "status",
        label: "Status",
        operators: ["eq", "neq"],
      },
    ]);
  });

  it("puts the Person relation first in the scope dropdown", () => {
    expect(personScopeFields(fields)[0]?.name).toBe("person");
  });

  it("uses an equality filter for select dropdowns", () => {
    const config = filterConfigsFromNames(["status"], fields)[0];
    expect(defaultFilterOperator(fields[1], config)).toBe("eq");
  });

  it("allows saved select filters to include multiple options", () => {
    expect(fixedFilterOperatorsForType("SELECT")).toEqual(["in"]);
  });

  it("uses Twenty's containsAny operator for multi-select fields", () => {
    expect(filterConfigsFromNames(["products"], fields)[0]?.operators).toEqual([
      "containsAny",
    ]);
    expect(fixedFilterOperatorsForType("MULTI_SELECT")).toEqual([
      "containsAny",
    ]);
  });

  it("detects saved filters that drift from synchronized metadata", () => {
    expect(
      validateFixedFilters(
        [
          {
            name: "missingProduct",
            operator: "containsAny",
            value: "SUPPORT",
          },
        ],
        fields,
      ),
    ).toEqual([
      'Saved filter field "missingProduct" no longer exists.',
    ]);
  });
});
