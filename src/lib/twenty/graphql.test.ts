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

  it("selects relation IDs instead of requesting a relation as a scalar", () => {
    expect(
      buildSelection(["company"], { company: "RELATION" }),
    ).toContain("company{id}");
  });
});
