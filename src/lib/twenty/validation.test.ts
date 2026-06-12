import { describe, expect, it } from "vitest";

import {
  validatePortalViewConfiguration,
  validateRecordInput,
} from "@/lib/twenty/validation";

const fields = [
  {
    id: "1",
    name: "title",
    label: "Title",
    type: "TEXT",
    isNullable: false,
  },
  {
    id: "2",
    name: "score",
    label: "Score",
    type: "NUMBER",
    isNullable: true,
  },
  {
    id: "3",
    name: "companyId",
    label: "Company",
    type: "UUID",
    isNullable: false,
  },
];

describe("record validation", () => {
  it("ignores the server-owned scope field and coerces numbers", () => {
    const data = new FormData();
    data.set("title", "Discovery call");
    data.set("score", "42");
    data.set("companyId", "attacker-company");
    expect(
      validateRecordInput({
        formData: data,
        configuredFields: [
          { name: "title", required: true },
          { name: "score" },
          { name: "companyId" },
        ],
        metadataFields: fields,
        scopeFieldName: "companyId",
      }),
    ).toEqual({ title: "Discovery call", score: 42 });
  });

  it("detects object and field schema drift", () => {
    expect(
      validatePortalViewConfiguration({
        objectNameSingular: "salesCall",
        scopeFieldName: "companyId",
        fieldNames: ["title", "removedField"],
        objects: [{ nameSingular: "salesCall", fields }],
      }),
    ).toEqual(['Field "removedField" no longer exists.']);
  });
});
