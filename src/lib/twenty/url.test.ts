import { describe, expect, it } from "vitest";

import {
  getTwentyEndpoint,
  getTwentyRestRecordEndpoint,
  normalizeTwentyBaseUrl,
} from "@/lib/twenty/url";

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

  it("preserves a custom path when automatic formatting is disabled", () => {
    expect(
      getTwentyEndpoint(
        "https://crm.example.com/twenty",
        "/graphql",
        false,
      ).toString(),
    ).toBe("https://crm.example.com/twenty/graphql");
  });

  it("replaces a configured terminal endpoint in manual mode", () => {
    expect(
      getTwentyEndpoint(
        "https://crm.example.com/custom/graphql",
        "/metadata",
        false,
      ).toString(),
    ).toBe("https://crm.example.com/custom/metadata");
  });
});

describe("normalizeTwentyBaseUrl", () => {
  it("maps Twenty cloud workspace URLs to the cloud API origin", () => {
    expect(normalizeTwentyBaseUrl("https://app.twenty.com/w/portal")).toBe(
      "https://api.twenty.com",
    );
  });

  it("keeps a self-hosted Twenty origin", () => {
    expect(
      normalizeTwentyBaseUrl("https://crm.example.com/graphql"),
    ).toBe("https://crm.example.com");
  });

  it("adds https when an administrator enters a hostname", () => {
    expect(normalizeTwentyBaseUrl("crm.example.com")).toBe(
      "https://crm.example.com",
    );
  });
});

describe("getTwentyRestRecordEndpoint", () => {
  it("builds a generated REST record endpoint", () => {
    expect(
      getTwentyRestRecordEndpoint(
        "https://api.twenty.com",
        "attachments",
        "attachment-id",
      ).toString(),
    ).toBe("https://api.twenty.com/rest/attachments/attachment-id");
  });
});
