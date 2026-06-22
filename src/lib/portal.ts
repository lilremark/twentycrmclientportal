import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  metadataSnapshots,
  portalAccess,
  portalViews,
  type TwentyObjectMetadata,
} from "@/lib/db/schema";
import { formatPortalValue } from "@/lib/format-value";
import { enrichRelationMetadata } from "@/lib/twenty/metadata";

export async function getPortalView(slug: string) {
  return db.query.portalViews.findFirst({
    where: eq(portalViews.slug, slug),
  });
}

export async function getEnabledPortalViews(input?: {
  userId?: string;
  includeAll?: boolean;
}) {
  if (input?.includeAll) {
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
  return enrichRelationMetadata(snapshot?.objects ?? []);
}

export function getObjectMetadata(
  objects: TwentyObjectMetadata[],
  objectNameSingular: string,
) {
  return objects.find(
    (object) => object.nameSingular === objectNameSingular,
  );
}

export function displayValue(
  value: unknown,
  type?: string,
  options?: Parameters<typeof formatPortalValue>[2],
) {
  return formatPortalValue(value, type, options);
}
