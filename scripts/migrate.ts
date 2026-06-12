import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
const database = drizzle(client);

const authIdTables = ["user", "account", "session", "verification"] as const;

async function repairAuthIdDefaults() {
  for (const table of authIdTables) {
    await client.unsafe(
      `alter table "${table}" alter column "id" set default gen_random_uuid()::text`,
    );
  }

  const defaults = await client<
    Array<{ table_name: string; column_default: string | null }>
  >`
    select table_name, column_default
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'id'
      and table_name in ('user', 'account', 'session', 'verification')
  `;

  const missingDefaults = authIdTables.filter(
    (table) =>
      !defaults.some(
        (column) => column.table_name === table && column.column_default,
      ),
  );
  if (missingDefaults.length) {
    throw new Error(
      `Missing database ID defaults for: ${missingDefaults.join(", ")}`,
    );
  }

  console.info(
    `Auth ID defaults verified: ${authIdTables.join(", ")}`,
  );
}

async function main() {
  try {
    await migrate(database, { migrationsFolder: "./drizzle" });
    await repairAuthIdDefaults();
    console.info("Database migrations completed.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
});
