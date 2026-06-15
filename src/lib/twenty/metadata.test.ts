import { describe, expect, it } from "vitest";

import type { TwentyObjectMetadata } from "@/lib/db/schema";
import { enrichRelationMetadata } from "@/lib/twenty/metadata";

describe("enrichRelationMetadata", () => {
  it("maps a relation to readable fields on its target object", () => {
    const objects: TwentyObjectMetadata[] = [
      {
        id: "company",
        nameSingular: "company",
        namePlural: "companies",
        labelSingular: "Company",
        labelPlural: "Companies",
        fields: [
          {
            id: "company-name",
            name: "name",
            label: "Name",
            type: "TEXT",
            isNullable: false,
          },
        ],
      },
      {
        id: "sale",
        nameSingular: "sale",
        namePlural: "sales",
        labelSingular: "Sale",
        labelPlural: "Sales",
        fields: [
          {
            id: "sale-company",
            name: "company",
            label: "Company",
            type: "RELATION",
            isNullable: true,
            relationType: "MANY_TO_ONE",
            relationTargetObjectNameSingular: "company",
          },
        ],
      },
    ];

    const enriched = enrichRelationMetadata(objects);
    expect(enriched[1].fields[0].relationDisplayFields).toEqual([
      { name: "name", type: "TEXT" },
    ]);
  });

  it("finds a readable field through a junction relation", () => {
    const objects: TwentyObjectMetadata[] = [
      {
        id: "note",
        nameSingular: "note",
        namePlural: "notes",
        labelSingular: "Note",
        labelPlural: "Notes",
        fields: [
          {
            id: "note-title",
            name: "title",
            label: "Title",
            type: "TEXT",
            isNullable: false,
          },
          {
            id: "note-body",
            name: "bodyV2",
            label: "Body",
            type: "RICH_TEXT",
            isNullable: true,
          },
        ],
      },
      {
        id: "note-target",
        nameSingular: "noteTarget",
        namePlural: "noteTargets",
        labelSingular: "Note Target",
        labelPlural: "Note Targets",
        fields: [
          {
            id: "target-note",
            name: "note",
            label: "Note",
            type: "RELATION",
            isNullable: false,
            relationType: "MANY_TO_ONE",
            relationTargetObjectNameSingular: "note",
          },
        ],
      },
      {
        id: "opportunity",
        nameSingular: "opportunity",
        namePlural: "opportunities",
        labelSingular: "Opportunity",
        labelPlural: "Opportunities",
        fields: [
          {
            id: "opportunity-note-targets",
            name: "noteTargets",
            label: "Notes",
            type: "RELATION",
            isNullable: true,
            relationType: "ONE_TO_MANY",
            relationTargetObjectNameSingular: "noteTarget",
          },
        ],
      },
    ];

    const enriched = enrichRelationMetadata(objects);
    expect(enriched[2].fields[0].relationDisplayFields).toEqual([
      {
        name: "note",
        type: "RELATION",
        relationType: "MANY_TO_ONE",
        relationDisplayFields: [
          { name: "title", type: "TEXT" },
          { name: "bodyV2", type: "RICH_TEXT" },
        ],
      },
    ]);
  });
});
