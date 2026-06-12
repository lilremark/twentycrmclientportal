import "dotenv/config";

import { randomUUID } from "node:crypto";

import postgres from "postgres";

import {
  hashPortalPassword,
  verifyPortalPassword,
} from "../src/lib/password";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.SYSTEM_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SYSTEM_ADMIN_PASSWORD;
const name = process.env.SYSTEM_ADMIN_NAME?.trim() || "System Administrator";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if ((email && !password) || (!email && password)) {
  throw new Error(
    "SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD must be set together.",
  );
}

function validatePassword(value: string) {
  if (
    value.length < 12 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value)
  ) {
    throw new Error(
      "SYSTEM_ADMIN_PASSWORD must be at least 12 characters and contain uppercase, lowercase, and numeric characters.",
    );
  }
}

async function main() {
  if (!email || !password) {
    console.info("System administrator bootstrap skipped.");
    return;
  }

  validatePassword(password);
  const sql = postgres(databaseUrl!, { max: 1, prepare: false });

  try {
    const passwordHash = await hashPortalPassword(password);
    await sql.begin(async (transaction) => {
      const existingUsers = await transaction<
        Array<{ id: string }>
      >`select "id" from "user" where lower("email") = ${email} limit 1`;
      const userId = existingUsers[0]?.id ?? randomUUID();
      const now = new Date();

      if (existingUsers.length) {
        await transaction`
          update "user"
          set "name" = ${name},
              "email" = ${email},
              "email_verified" = true,
              "updated_at" = ${now}
          where "id" = ${userId}
        `;
      } else {
        await transaction`
          insert into "user" (
            "id", "name", "email", "email_verified", "created_at", "updated_at"
          ) values (
            ${userId}, ${name}, ${email}, true, ${now}, ${now}
          )
        `;
      }

      const credentialAccounts = await transaction<
        Array<{ id: string }>
      >`
        select "id"
        from "account"
        where "user_id" = ${userId} and "provider_id" = 'credential'
        limit 1
      `;

      if (credentialAccounts.length) {
        await transaction`
          update "account"
          set "account_id" = ${userId},
              "password" = ${passwordHash},
              "updated_at" = ${now}
          where "id" = ${credentialAccounts[0].id}
        `;
      } else {
        await transaction`
          insert into "account" (
            "id", "account_id", "provider_id", "user_id", "password",
            "created_at", "updated_at"
          ) values (
            ${randomUUID()}, ${userId}, 'credential', ${userId},
            ${passwordHash}, ${now}, ${now}
          )
        `;
      }

      await transaction`
        insert into "portal_administrator" ("user_id")
        values (${userId})
        on conflict ("user_id") do nothing
      `;
      await transaction`delete from "session" where "user_id" = ${userId}`;
    });

    const storedCredentials = await sql<Array<{ password: string | null }>>`
      select "password"
      from "account"
      where "user_id" = (
        select "id" from "user" where lower("email") = ${email} limit 1
      ) and "provider_id" = 'credential'
      limit 1
    `;
    const storedPassword = storedCredentials[0]?.password;
    if (
      !storedPassword ||
      !(await verifyPortalPassword({
        hash: storedPassword,
        password,
      }))
    ) {
      throw new Error(
        "The system administrator password failed post-write verification.",
      );
    }

    console.info(`System administrator ready: ${email}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("System administrator bootstrap failed.", error);
  process.exitCode = 1;
});
