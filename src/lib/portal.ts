import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  metadataSnapshots,
  portalAccess,
  portalViews,
  type TwentyObjectMetadata,
} from "@/lib/db/schema";

export async function getPortalView(slug: string) {
  return db.query.portalViews.findFirst({
    where: eq(portalViews.slug, slug),
  });
}

export async function getEnabledPortalViews(input?: {
  userId?: string;
  includeAll?: boolean;
  hasClientMembership?: boolean;
}) {
  if (input?.includeAll || input?.hasClientMembership) {
    return db.query.portalViews.findMany({
      where: eq(portalViews.isEnabled, true),
      orderBy: (view, { asc: ascending }) => [
        ascending(view.navigationOrder),
        ascending(view.label),
      ],
    });
  }

  if (!input?.userId) return [];
  const grants = await db
    .select({ portalViewId: portalAccess.portalViewId })
    .from(portalAccess)
    .where(eq(portalAccess.userId, input.userId));
  const viewIds = grants.map((grant) => grant.portalViewId);
  if (!viewIds.length) return [];

  return db
    .select()
    .from(portalViews)
    .where(
      and(
        inArray(portalViews.id, viewIds),
        eq(portalViews.isEnabled, true),
      ),
    )
    .orderBy(asc(portalViews.navigationOrder), asc(portalViews.label));
}

export async function getLatestMetadata(): Promise<TwentyObjectMetadata[]> {
  const [snapshot] = await db
    .select()
    .from(metadataSnapshots)
    .orderBy(desc(metadataSnapshots.syncedAt))
    .limit(1);
  return snapshot?.objects ?? [];
}

export function getObjectMetadata(
  objects: TwentyObjectMetadata[],
  objectNameSingular: string,
) {
  return objects.find(
    (object) => object.nameSingular === objectNameSingular,
  );
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if ("amountMicros" in object) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: String(object.currencyCode ?? "USD"),
      }).format(Number(object.amountMicros) / 1_000_000);
    }
    if ("firstName" in object || "lastName" in object) {
      return [object.firstName, object.lastName].filter(Boolean).join(" ");
    }
    return JSON.stringify(value);
  }
  return String(value);
}
