import { describe, expect, it } from "vitest";

import {
  validatePortalViewConfiguration,
  validateRecordInput,
} from "@/lib/twenty/validation";
import type { TwentyFieldMetadata } from "@/lib/db/schema";

const fields: TwentyFieldMetadata[] = [
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
  {
    id: "4",
    name: "products",
    label: "Products",
    type: "MULTI_SELECT",
    isNullable: true,
    options: [
      { value: "CFDP_KIT", label: "CFDP Kit" },
      { value: "CFDP_TRAINING_KIT", label: "CFDP Training Kit" },
    ],
  },
  {
    id: "5",
    name: "company",
    label: "Company",
    type: "RELATION",
    isNullable: true,
    relationType: "MANY_TO_ONE",
    relationTargetObjectNameSingular: "company",
  },
  {
    id: "6",
    name: "noteTargets",
    label: "Notes",
    type: "RELATION",
    isNullable: true,
    relationType: "ONE_TO_MANY",
    relationTargetObjectNameSingular: "noteTarget",
  },
  {
    id: "7",
    name: "stage",
    label: "Stage",
    type: "SELECT",
    isNullable: true,
    options: [{ value: "NEW", label: "New" }],
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

  it("accepts checkbox values for multi-select fields", () => {
    const data = new FormData();
    data.append("products", "CFDP_KIT");
    data.append("products", "CFDP_TRAINING_KIT");
    expect(
      validateRecordInput({
        formData: data,
        configuredFields: [{ name: "products" }],
        metadataFields: fields,
        scopeFieldName: "",
      }),
    ).toEqual({
      products: [
        { __enum: "CFDP_KIT" },
        { __enum: "CFDP_TRAINING_KIT" },
      ],
    });
  });

  it("omits optional multi-select fields when no checkboxes are selected", () => {
    const data = new FormData();

    expect(
      validateRecordInput({
        formData: data,
        configuredFields: [{ name: "products" }],
        metadataFields: fields,
        scopeFieldName: "",
      }),
    ).toEqual({});
  });

  it("serializes select values as GraphQL enum literals", () => {
    const data = new FormData();
    data.set("stage", "NEW");

    expect(
      validateRecordInput({
        formData: data,
        configuredFields: [{ name: "stage" }],
        metadataFields: fields,
        scopeFieldName: "",
      }),
    ).toEqual({ stage: { __enum: "NEW" } });
  });

  it("maps many-to-one relation fields to their ID write field", () => {
    const data = new FormData();
    data.set("company", "company-record-id");

    expect(
      validateRecordInput({
        formData: data,
        configuredFields: [{ name: "company" }],
        metadataFields: fields,
        scopeFieldName: "",
      }),
    ).toEqual({ companyId: "company-record-id" });
  });

  it("skips one-to-many relation fields because Twenty cannot write them on the parent record", () => {
    const data = new FormData();
    data.set("noteTargets", "note-target-id");

    expect(
      validateRecordInput({
        formData: data,
        configuredFields: [{ name: "noteTargets" }],
        metadataFields: fields,
        scopeFieldName: "",
      }),
    ).toEqual({});
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
