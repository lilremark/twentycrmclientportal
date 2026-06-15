import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const user = pgTable(
  "user",
  {
    id: text("id")
      .default(sql`gen_random_uuid()::text`)
      .primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id")
      .default(sql`gen_random_uuid()::text`)
      .primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id")
      .default(sql`gen_random_uuid()::text`)
      .primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("account_provider_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("account_user_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id")
      .default(sql`gen_random_uuid()::text`)
      .primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const membershipRole = pgEnum("membership_role", [
  "viewer",
  "contributor",
]);
export const invitationRole = pgEnum("invitation_role", [
  "admin",
  "viewer",
  "contributor",
]);
export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);
export const auditStatus = pgEnum("audit_status", [
  "success",
  "failure",
  "external",
]);

export const portalAdministrators = pgTable("portal_administrator", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const applicationSettings = pgTable("application_setting", {
  id: text("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  brandLogoUrl: text("brand_logo_url"),
  primaryColor: text("primary_color").notNull(),
  portalTitle: text("portal_title").notNull(),
  portalDescription: text("portal_description").notNull(),
  supportEmail: text("support_email"),
  ...timestamps,
});

export const clientAccounts = pgTable(
  "client_account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    twentyPersonId: text("twenty_person_id").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("client_account_person_unique").on(table.twentyPersonId),
    index("client_account_active_idx").on(table.isActive),
  ],
);

export const memberships = pgTable(
  "membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientAccountId: uuid("client_account_id")
      .notNull()
      .references(() => clientAccounts.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("membership_user_client_unique").on(
      table.userId,
      table.clientAccountId,
    ),
    index("membership_client_idx").on(table.clientAccountId),
  ],
);

export const invitations = pgTable(
  "invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: invitationRole("role").notNull(),
    clientAccountId: uuid("client_account_id").references(
      () => clientAccounts.id,
      { onDelete: "cascade" },
    ),
    portalViewId: uuid("portal_view_id"),
    tokenHash: text("token_hash").notNull(),
    status: invitationStatus("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invitation_token_unique").on(table.tokenHash),
    index("invitation_email_idx").on(table.email),
    index("invitation_status_idx").on(table.status),
  ],
);

export type PortalFieldConfig = {
  name: string;
  label?: string;
  required?: boolean;
};

export type PortalFilterConfig = {
  name: string;
  label?: string;
  operators: string[];
};

export type PortalFixedFilter = {
  name: string;
  label?: string;
  operator: string;
  value: string;
};

export const portalViews = pgTable(
  "portal_view",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    objectNameSingular: text("object_name_singular").notNull(),
    objectNamePlural: text("object_name_plural").notNull(),
    scopeFieldName: text("scope_field_name").notNull(),
    scopeMode: text("scope_mode").default("all").notNull(),
    allowedRecordIds: jsonb("allowed_record_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
    columns: jsonb("columns").$type<PortalFieldConfig[]>().notNull(),
    detailFields: jsonb("detail_fields").$type<PortalFieldConfig[]>().notNull(),
    filterFields: jsonb("filter_fields").$type<PortalFilterConfig[]>().notNull(),
    fixedFilters: jsonb("fixed_filters")
      .$type<PortalFixedFilter[]>()
      .default([])
      .notNull(),
    createFields: jsonb("create_fields").$type<PortalFieldConfig[]>().notNull(),
    editFields: jsonb("edit_fields").$type<PortalFieldConfig[]>().notNull(),
    defaultSortField: text("default_sort_field"),
    defaultSortDirection: text("default_sort_direction")
      .default("asc")
      .notNull(),
    navigationOrder: integer("navigation_order").default(0).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    validationErrors: jsonb("validation_errors")
      .$type<string[]>()
      .default([])
      .notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("portal_view_slug_unique").on(table.slug),
    index("portal_view_navigation_idx").on(
      table.isEnabled,
      table.navigationOrder,
    ),
  ],
);

export const portalAccess = pgTable(
  "portal_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    portalViewId: uuid("portal_view_id")
      .notNull()
      .references(() => portalViews.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("portal_access_user_view_unique").on(
      table.userId,
      table.portalViewId,
    ),
    index("portal_access_view_idx").on(table.portalViewId),
  ],
);

export type TwentyRelationDisplayField = {
  name: string;
  type: string;
  relationType?: "ONE_TO_MANY" | "MANY_TO_ONE";
  relationDisplayFields?: TwentyRelationDisplayField[];
};

export type TwentyFieldMetadata = {
  id: string;
  name: string;
  label: string;
  type: string;
  isNullable: boolean;
  options?: Array<{ value: string; label: string; color?: string }>;
  relationTargetObjectNameSingular?: string;
  relationType?: "ONE_TO_MANY" | "MANY_TO_ONE";
  relationDisplayFields?: TwentyRelationDisplayField[];
};

export type TwentyObjectMetadata = {
  id: string;
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  fields: TwentyFieldMetadata[];
};

export const metadataSnapshots = pgTable(
  "metadata_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objects: jsonb("objects").$type<TwentyObjectMetadata[]>().notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    syncedByUserId: text("synced_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("metadata_synced_idx").on(table.syncedAt)],
);

export const webhookReceipts = pgTable(
  "webhook_receipt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    event: text("event").notNull(),
    recordId: text("record_id"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("webhook_fingerprint_unique").on(table.fingerprint),
    index("webhook_received_idx").on(table.receivedAt),
  ],
);

export const auditEvents = pgTable(
  "audit_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    clientAccountId: uuid("client_account_id").references(
      () => clientAccounts.id,
      { onDelete: "set null" },
    ),
    action: text("action").notNull(),
    objectName: text("object_name"),
    recordId: text("record_id"),
    status: auditStatus("status").notNull(),
    requestId: text("request_id").notNull(),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_created_idx").on(table.createdAt),
    index("audit_actor_idx").on(table.actorUserId),
    index("audit_client_idx").on(table.clientAccountId),
    index("audit_object_record_idx").on(table.objectName, table.recordId),
  ],
);
