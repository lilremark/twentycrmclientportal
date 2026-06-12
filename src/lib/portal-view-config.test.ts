import { describe, expect, it } from "vitest";

import type { TwentyFieldMetadata } from "@/lib/db/schema";
import {
  companyScopeFields,
  defaultFilterOperator,
  fieldConfigsFromNames,
  filterConfigsFromNames,
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
    id: "status",
    name: "status",
    label: "Status",
    type: "SELECT",
    isNullable: true,
    options: [{ value: "OPEN", label: "Open" }],
  },
  {
    id: "company",
    name: "company",
    label: "Company",
    type: "RELATION",
    isNullable: false,
    relationTargetObjectNameSingular: "company",
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

  it("puts the Company relation first in the scope dropdown", () => {
    expect(companyScopeFields(fields)[0]?.name).toBe("company");
  });

  it("uses an equality filter for select dropdowns", () => {
    const config = filterConfigsFromNames(["status"], fields)[0];
    expect(defaultFilterOperator(fields[1], config)).toBe("eq");
  });
});
