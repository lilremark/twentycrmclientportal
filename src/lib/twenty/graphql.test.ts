import { describe, expect, it } from "vitest";

import {
  buildListQuery,
  buildMutation,
  buildSelection,
  gqlEnum,
  toGraphQLLiteral,
} from "@/lib/twenty/graphql";

describe("GraphQL construction", () => {
  it("serializes data while preserving explicit enum values", () => {
    expect(
      toGraphQLLiteral({
        name: "O'Reilly",
        order: gqlEnum("DescNullsLast"),
        active: true,
      }),
    ).toBe('{name:"O\'Reilly",order:DescNullsLast,active:true}');
  });

  it("builds a scoped paginated list query", () => {
    const query = buildListQuery({
      objectNamePlural: "salesCalls",
      selection: "id title",
      filter: {
        and: [
          { companyId: { eq: "company-1" } },
          { title: { contains: "discovery" } },
        ],
      },
      orderBy: { calledAt: gqlEnum("DescNullsLast") },
      first: 100,
      after: "cursor",
    });
    expect(query).toContain("salesCalls(");
    expect(query).toContain('companyId:{eq:"company-1"}');
    expect(query).toContain("first:50");
    expect(query).toContain("calledAt:DescNullsLast");
  });

  it("rejects identifiers that could inject GraphQL", () => {
    expect(() =>
      buildMutation({
        operation: "create",
        objectNameSingular: "company){deleteCompany",
        data: {},
        selection: "id",
      }),
    ).toThrow("Invalid GraphQL identifier");
  });

  it("selects readable relation fields with the relation ID", () => {
    expect(
      buildSelection(["company"], {
        company: {
          type: "RELATION",
          relationType: "MANY_TO_ONE",
          relationDisplayFields: [{ name: "name", type: "TEXT" }],
        },
      }),
    ).toContain("company{id name}");
  });

  it("selects nested full names for person relations", () => {
    expect(
      buildSelection(["contact"], {
        contact: {
          type: "RELATION",
          relationType: "MANY_TO_ONE",
          relationDisplayFields: [{ name: "name", type: "FULL_NAME" }],
        },
      }),
    ).toContain("contact{id name{firstName lastName}}");
  });

  it("traverses connection and junction relations", () => {
    expect(
      buildSelection(["noteTargets"], {
        noteTargets: {
          type: "RELATION",
          relationType: "ONE_TO_MANY",
          relationDisplayFields: [
            {
              name: "note",
              type: "RELATION",
              relationType: "MANY_TO_ONE",
              relationDisplayFields: [{ name: "title", type: "TEXT" }],
            },
          ],
        },
      }),
    ).toContain(
      "noteTargets{edges{node{id note{id title}}}}",
    );
  });

  it("selects rich-text note bodies as a fallback", () => {
    expect(
      buildSelection(["noteTargets"], {
        noteTargets: {
          type: "RELATION",
          relationType: "ONE_TO_MANY",
          relationDisplayFields: [
            {
              name: "note",
              type: "RELATION",
              relationType: "MANY_TO_ONE",
              relationDisplayFields: [
                { name: "title", type: "TEXT" },
                { name: "bodyV2", type: "RICH_TEXT" },
              ],
            },
          ],
        },
      }),
    ).toContain(
      "noteTargets{edges{node{id note{id title bodyV2{markdown blocknote}}}}}",
    );
  });
});
