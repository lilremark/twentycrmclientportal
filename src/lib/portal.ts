import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  metadataSnapshots,
  portalViews,
  type TwentyObjectMetadata,
} from "@/lib/db/schema";

export async function getPortalView(slug: string) {
  return db.query.portalViews.findFirst({
    where: eq(portalViews.slug, slug),
  });
}

export async function getEnabledPortalViews() {
  return db.query.portalViews.findMany({
    where: eq(portalViews.isEnabled, true),
    orderBy: (view, { asc }) => [asc(view.navigationOrder), asc(view.label)],
  });
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
