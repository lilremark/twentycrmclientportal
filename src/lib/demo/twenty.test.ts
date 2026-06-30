import { describe, expect, it } from "vitest";

import { listDemoRecords } from "@/lib/demo/twenty";
import { gqlEnum } from "@/lib/twenty/graphql";

describe("listDemoRecords", () => {
  it("honors wrapped ascending and descending sort directions", () => {
    const filter = { clientId: { eq: "demo-person-1" } };
    const ascending = listDemoRecords({
      objectNamePlural: "projects",
      filter,
      orderBy: { dueDate: gqlEnum("AscNullsLast") },
    });
    const descending = listDemoRecords({
      objectNamePlural: "projects",
      filter,
      orderBy: { dueDate: gqlEnum("DescNullsLast") },
    });

    expect(ascending.edges[0]?.node.dueDate).toBe("2026-06-12");
    expect(descending.edges[0]?.node.dueDate).toBe(
      ascending.edges.at(-1)?.node.dueDate,
    );
  });
});
