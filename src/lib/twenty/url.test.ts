import { describe, expect, it } from "vitest";

import { getTwentyEndpoint } from "@/lib/twenty/url";

describe("getTwentyEndpoint", () => {
  it("builds endpoints from a plain Twenty origin", () => {
    expect(
      getTwentyEndpoint("https://twenty.example.com", "/graphql").toString(),
    ).toBe("https://twenty.example.com/graphql");
  });

  it("does not append an endpoint to a configured API path", () => {
    expect(
      getTwentyEndpoint(
        "https://twenty.example.com/graphql",
        "/metadata",
      ).toString(),
    ).toBe("https://twenty.example.com/metadata");
  });
});
