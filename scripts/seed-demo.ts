import "dotenv/config";

import postgres from "postgres";

import { demoTwentyMetadata } from "../src/lib/demo/twenty";
import { hashPortalPassword } from "../src/lib/password";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const ids = {
  client: "11111111-1111-4111-8111-111111111111",
  clientTwo: "11111111-1111-4111-8111-222222222222",
  projects: "22222222-2222-4222-8222-222222222222",
  invoices: "33333333-3333-4333-8333-333333333333",
  membership: "44444444-4444-4444-8444-444444444444",
  projectAccess: "55555555-5555-4555-8555-555555555555",
  invoiceAccess: "66666666-6666-4666-8666-666666666666",
  savedView: "77777777-7777-4777-8777-777777777777",
  metadata: "88888888-8888-4888-8888-888888888888",
  pendingInvitation: "99999999-9999-4999-8999-999999999999",
  expiredInvitation: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const clientUserId = "demo-client-user";
const clientEmail = "client@example.test";
const clientPassword = "TestClient!2026";

const projectColumns = [
  { name: "name", label: "Project" },
  { name: "status" },
  { name: "priority" },
  { name: "owner" },
  { name: "progress" },
  { name: "dueDate" },
];
const projectDetails = [
  ...projectColumns,
  { name: "budget" },
  { name: "description" },
];
const invoiceColumns = [
  { name: "invoiceNumber", label: "Invoice" },
  { name: "project" },
  { name: "status" },
  { name: "amount" },
  { name: "dueDate" },
];

async function main() {
  if (process.env.DEMO_MODE !== "true") {
    console.info("Demo seed skipped. Set DEMO_MODE=true to enable it.");
    return;
  }

  const sql = postgres(databaseUrl!, { max: 1, prepare: false });
  const now = new Date();
  const passwordHash = await hashPortalPassword(clientPassword);

  try {
    await sql.begin(async (tx) => {
      const administrators = await tx<Array<{ userId: string }>>`
        select "user_id" as "userId" from "portal_administrator" order by "created_at" limit 1
      `;
      const administratorId = administrators[0]?.userId;
      if (!administratorId) throw new Error("Bootstrap an administrator before seeding demo data.");

      await tx`
        insert into "user" ("id", "name", "email", "email_verified", "is_active", "created_at", "updated_at")
        values (${clientUserId}, 'Avery Morgan', ${clientEmail}, true, true, ${now}, ${now})
        on conflict ("email") do update set
          "name" = excluded."name", "email_verified" = true, "is_active" = true, "updated_at" = excluded."updated_at"
      `;
      const users = await tx<Array<{ id: string }>>`select "id" from "user" where "email" = ${clientEmail}`;
      const actualClientUserId = users[0].id;

      await tx`
        insert into "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
        values ('demo-client-credential', ${actualClientUserId}, 'credential', ${actualClientUserId}, ${passwordHash}, ${now}, ${now})
        on conflict ("provider_id", "account_id") do update set
          "user_id" = excluded."user_id", "password" = excluded."password", "updated_at" = excluded."updated_at"
      `;

      await tx`
        insert into "client_account" ("id", "name", "twenty_person_id", "is_active", "created_at", "updated_at")
        values
          (${ids.client}, 'Northstar Studio', 'demo-person-1', true, ${now}, ${now}),
          (${ids.clientTwo}, 'Juniper Labs', 'demo-person-2', true, ${now}, ${now})
        on conflict ("twenty_person_id") do update set
          "name" = excluded."name", "is_active" = true, "updated_at" = excluded."updated_at"
      `;
      await tx`
        insert into "membership" ("id", "user_id", "client_account_id", "role", "created_at")
        values (${ids.membership}, ${actualClientUserId}, ${ids.client}, 'contributor', ${now})
        on conflict ("user_id", "client_account_id") do update set "role" = excluded."role"
      `;

      await tx`
        insert into "metadata_snapshot" ("id", "objects", "synced_at", "synced_by_user_id")
        values (${ids.metadata}, ${tx.json(demoTwentyMetadata)}, ${now}, ${administratorId})
        on conflict ("id") do update set "objects" = excluded."objects", "synced_at" = excluded."synced_at", "synced_by_user_id" = excluded."synced_by_user_id"
      `;

      await tx`
        insert into "portal_view" (
          "id", "slug", "label", "object_name_singular", "object_name_plural", "scope_field_name", "scope_mode",
          "allowed_record_ids", "columns", "detail_fields", "filter_fields", "fixed_filters", "record_title_field",
          "create_fields", "edit_fields", "default_sort_field", "default_sort_direction", "format_select_values",
          "dashboard_widgets", "navigation_order", "is_enabled", "validation_errors", "created_at", "updated_at"
        ) values (
          ${ids.projects}, 'projects', 'Projects', 'project', 'projects', 'clientId', 'person', ${tx.json([])},
          ${tx.json(projectColumns)}, ${tx.json(projectDetails)}, ${tx.json([
            { name: "status", operators: ["eq", "in"] },
            { name: "priority", operators: ["eq", "in"] },
            { name: "owner", operators: ["contains", "startsWith"] },
          ])}, ${tx.json([])}, 'name', ${tx.json([
            { name: "name", required: true }, { name: "status", required: true }, { name: "priority" },
            { name: "owner" }, { name: "budget" }, { name: "progress" }, { name: "dueDate" }, { name: "description" },
          ])}, ${tx.json(projectDetails)}, 'dueDate', 'asc', true, ${tx.json([
            { id: "projects-total", type: "number", label: "Active projects", aggregate: "count", layout: { x: 0, y: 0, w: 3, h: 1 } },
            { id: "projects-budget", type: "number", label: "Total budget", aggregate: "sum", field: "budget", layout: { x: 3, y: 0, w: 3, h: 1 } },
            { id: "projects-status", type: "donut", label: "Projects by status", aggregate: "count", groupBy: "status", layout: { x: 0, y: 1, w: 6, h: 2 } },
          ])}, 10, true, ${tx.json([])}, ${now}, ${now}
        )
        on conflict ("slug") do update set
          "label" = excluded."label", "columns" = excluded."columns", "detail_fields" = excluded."detail_fields",
          "filter_fields" = excluded."filter_fields", "create_fields" = excluded."create_fields", "edit_fields" = excluded."edit_fields",
          "dashboard_widgets" = excluded."dashboard_widgets", "is_enabled" = true, "validation_errors" = excluded."validation_errors", "updated_at" = excluded."updated_at"
      `;

      await tx`
        insert into "portal_view" (
          "id", "slug", "label", "object_name_singular", "object_name_plural", "scope_field_name", "scope_mode",
          "allowed_record_ids", "columns", "detail_fields", "filter_fields", "fixed_filters", "record_title_field",
          "create_fields", "edit_fields", "default_sort_field", "default_sort_direction", "format_select_values",
          "dashboard_widgets", "navigation_order", "is_enabled", "validation_errors", "created_at", "updated_at"
        ) values (
          ${ids.invoices}, 'invoices', 'Invoices', 'invoice', 'invoices', 'clientId', 'person', ${tx.json([])},
          ${tx.json(invoiceColumns)}, ${tx.json([...invoiceColumns, { name: "issuedDate" }, { name: "notes" }])},
          ${tx.json([{ name: "status", operators: ["eq", "in"] }, { name: "project", operators: ["contains"] }])}, ${tx.json([])},
          'invoiceNumber', ${tx.json([])}, ${tx.json([{ name: "notes" }])}, 'dueDate', 'desc', true,
          ${tx.json([
            { id: "invoice-total", type: "number", label: "Total invoiced", aggregate: "sum", field: "amount", layout: { x: 0, y: 0, w: 3, h: 1 } },
            { id: "invoice-status", type: "bar", label: "Invoices by status", aggregate: "count", groupBy: "status", layout: { x: 0, y: 1, w: 6, h: 2 } },
          ])}, 20, true, ${tx.json([])}, ${now}, ${now}
        )
        on conflict ("slug") do update set
          "label" = excluded."label", "columns" = excluded."columns", "detail_fields" = excluded."detail_fields",
          "filter_fields" = excluded."filter_fields", "edit_fields" = excluded."edit_fields", "dashboard_widgets" = excluded."dashboard_widgets",
          "is_enabled" = true, "validation_errors" = excluded."validation_errors", "updated_at" = excluded."updated_at"
      `;

      const views = await tx<Array<{ id: string; slug: string }>>`select "id", "slug" from "portal_view" where "slug" in ('projects', 'invoices')`;
      const projectId = views.find((view) => view.slug === "projects")!.id;
      const invoiceId = views.find((view) => view.slug === "invoices")!.id;
      await tx`
        insert into "portal_access" ("id", "user_id", "portal_view_id", "role", "created_at") values
          (${ids.projectAccess}, ${actualClientUserId}, ${projectId}, 'contributor', ${now}),
          (${ids.invoiceAccess}, ${actualClientUserId}, ${invoiceId}, 'contributor', ${now})
        on conflict ("user_id", "portal_view_id") do update set "role" = excluded."role"
      `;
      await tx`
        insert into "portal_saved_view" ("id", "user_id", "portal_view_id", "name", "filters", "sort_field", "sort_direction", "created_at", "updated_at")
        values (${ids.savedView}, ${actualClientUserId}, ${projectId}, 'Projects needing attention', ${tx.json([{ field: "status", operator: "eq", value: "AT_RISK" }])}, 'dueDate', 'asc', ${now}, ${now})
        on conflict ("user_id", "portal_view_id", "name") do update set "filters" = excluded."filters", "updated_at" = excluded."updated_at"
      `;

      await tx`
        insert into "invitation" ("id", "email", "name", "role", "client_account_id", "portal_view_id", "token_hash", "status", "expires_at", "invited_by_user_id", "created_at", "updated_at") values
          (${ids.pendingInvitation}, 'sam@example.test', 'Sam Rivera', 'viewer', ${ids.client}, ${projectId}, 'demo-pending-token', 'pending', ${new Date("2026-12-31T23:59:59Z")}, ${administratorId}, ${now}, ${now}),
          (${ids.expiredInvitation}, 'riley@example.test', 'Riley Brooks', 'contributor', ${ids.clientTwo}, ${invoiceId}, 'demo-expired-token', 'expired', ${new Date("2026-01-01T00:00:00Z")}, ${administratorId}, ${now}, ${now})
        on conflict ("token_hash") do update set "status" = excluded."status", "updated_at" = excluded."updated_at"
      `;

      for (const [index, event] of [
        ["portal.record.updated", "project", "project-atlas", "success"],
        ["portal.record.exported", "invoice", null, "success"],
        ["admin.invitation.created", "invitation", ids.pendingInvitation, "success"],
        ["twenty.webhook.received", "project", "project-northstar", "external"],
      ].entries()) {
        await tx`
          insert into "audit_event" ("id", "actor_user_id", "client_account_id", "action", "object_name", "record_id", "status", "request_id", "metadata", "created_at")
          values (${`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${index}`}, ${index === 2 ? administratorId : actualClientUserId}, ${ids.client}, ${event[0]}, ${event[1]}, ${event[2]}, ${event[3]}, ${`demo-request-${index}`}, ${tx.json({ source: "demo-seed" })}, ${new Date(now.getTime() - index * 3_600_000)})
          on conflict ("id") do update set "created_at" = excluded."created_at", "metadata" = excluded."metadata"
        `;
      }
    });

    console.info(`Demo data ready. Client login: ${clientEmail} / ${clientPassword}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Demo seed failed.", error);
  process.exitCode = 1;
});
