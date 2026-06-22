import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("initial database migration", () => {
  it("gives every Better Auth ID column a database default", async () => {
    const migration = await readFile(
      resolve("drizzle/0000_calm_shockwave.sql"),
      "utf8",
    );

    for (const table of ["user", "account", "session", "verification"]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);

      const tableDefinition = migration
        .split(`CREATE TABLE "${table}" (`)[1]
        ?.split("\n);")[0];

      expect(tableDefinition).toContain(
        `"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL`,
      );
    }
  });

  it("adds direct portal access and explicit record scoping", async () => {
    const migration = await readFile(
      resolve("drizzle/0002_portal_access.sql"),
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE "portal_access"');
    expect(migration).toContain(
      'ADD COLUMN "allowed_record_ids" jsonb',
    );
    expect(migration).toContain(
      'DROP INDEX IF EXISTS "portal_view_object_unique"',
    );
  });

  it("adds configurable invitation email templates", async () => {
    const migration = await readFile(
      resolve("drizzle/0010_lyrical_dormammu.sql"),
      "utf8",
    );

    expect(migration).toContain('"invitation_email_subject" text');
    expect(migration).toContain('"invitation_email_html" text');
    expect(migration).not.toContain('CREATE TABLE "application_setting"');
  });

  it("adds Google and custom OAuth configuration", async () => {
    const migration = await readFile(
      resolve("drizzle/0011_nebulous_killmonger.sql"),
      "utf8",
    );

    expect(migration).toContain('"google_oauth_enabled" boolean');
    expect(migration).toContain('"google_oauth_client_secret" text');
    expect(migration).toContain('"custom_oauth_enabled" boolean');
    expect(migration).toContain('"custom_oauth_discovery_url" text');
    expect(migration).toContain('"custom_oauth_pkce" boolean');
  });

  it("adds configurable Select value formatting", async () => {
    const migration = await readFile(
      resolve("drizzle/0012_unusual_network.sql"),
      "utf8",
    );

    expect(migration).toContain(
      '"format_select_values" boolean DEFAULT true NOT NULL',
    );
  });
});
