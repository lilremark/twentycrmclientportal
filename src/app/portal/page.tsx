import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { PortalHomeDashboard } from "@/components/portal-home-dashboard";
import { requirePortalContext } from "@/lib/access";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { displayValue, getLatestMetadata, getObjectMetadata } from "@/lib/portal";
import { listTwentyRecords } from "@/lib/twenty/client";
import { buildPortalScopeFilter, buildScopedFilter } from "@/lib/twenty/filters";
import { gqlEnum } from "@/lib/twenty/graphql";

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "record.created": "Record created",
    "record.updated": "Record updated",
    "note.created": "Note added",
    "note.updated": "Note updated",
    "webhook.record_changed": "Record changed in Twenty",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}

function relativeActivityTime(date: Date) {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default async function PortalHomePage() {
  const [context, metadata] = await Promise.all([
    requirePortalContext(),
    getLatestMetadata().catch(() => null),
  ]);
  const views = context.views;
  const objectNames = [...new Set(views.map((view) => view.objectNameSingular))];
  const activities = objectNames.length
    ? await db
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          objectName: auditEvents.objectName,
          recordId: auditEvents.recordId,
          status: auditEvents.status,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(
          and(
            inArray(auditEvents.objectName, objectNames),
            context.isAdmin
              ? undefined
              : context.clientAccountId
                ? eq(auditEvents.clientAccountId, context.clientAccountId)
                : isNull(auditEvents.clientAccountId),
          ),
        )
        .orderBy(desc(auditEvents.createdAt))
        .limit(60)
    : [];
  const viewByObject = new Map(views.map((view) => [view.objectNameSingular, view]));
  const activityByObject = new Map<string, typeof activities>();
  for (const activity of activities) {
    if (!activity.objectName) continue;
    activityByObject.set(activity.objectName, [
      ...(activityByObject.get(activity.objectName) ?? []),
      activity,
    ]);
  }
  const recordPreviews = new Map<
    string,
    Array<{ id: string; label: string; time: string; relativeTime: string }>
  >();
  if (metadata) {
    const previewResults = await Promise.all(
      views.map(async (view) => {
        const object = getObjectMetadata(metadata, view.objectNameSingular);
        if (!object) {
          return [
            view.id,
            [] as Array<{ id: string; label: string; time: string; relativeTime: string }>,
          ] as const;
        }
        const titleFieldName =
          view.recordTitleField ??
          object.fields.find((field) => field.name === "name")?.name ??
          view.columns[0]?.name;
        if (!titleFieldName) {
          return [
            view.id,
            [] as Array<{ id: string; label: string; time: string; relativeTime: string }>,
          ] as const;
        }
        const titleField = object.fields.find((field) => field.name === titleFieldName);
        const updatedAtField = object.fields.find((field) => field.name === "updatedAt");
        const fields = [
          { name: titleFieldName },
          ...(updatedAtField ? [{ name: updatedAtField.name }] : []),
        ];
        try {
          const result = await listTwentyRecords({
            objectNamePlural: view.objectNamePlural,
            fields,
            metadataFields: object.fields,
            filter: buildScopedFilter({
              scopeFilter: buildPortalScopeFilter({
                scopeMode: view.scopeMode,
                scopeFieldName: view.scopeFieldName,
                allowedRecordIds: view.allowedRecordIds,
                twentyPersonId: context.twentyPersonId,
                metadataFields: object.fields,
              }),
              fixedFilters: view.fixedFilters,
              metadataFields: object.fields,
              configuredFilters: [],
              requestedFilters: [],
            }),
            orderBy: updatedAtField
              ? { updatedAt: gqlEnum("DescNullsLast") }
              : undefined,
          });
          return [
            view.id,
            result.edges.slice(0, 3).map(({ node }) => {
              const updatedAt =
                typeof node.updatedAt === "string" ? new Date(node.updatedAt) : null;
              const label = displayValue(node[titleFieldName], titleField?.type, {
                selectOptions: titleField?.options,
                formatSelectValues: view.formatSelectValues,
              });
              return {
                id: String(node.id),
                label: label && label !== "—" ? label.slice(0, 64) : `Record ${String(node.id).slice(0, 8)}`,
                time: updatedAt && !Number.isNaN(updatedAt.getTime())
                  ? updatedAt.toISOString()
                  : "",
                relativeTime: updatedAt && !Number.isNaN(updatedAt.getTime())
                  ? relativeActivityTime(updatedAt)
                  : "Shared",
              };
            }),
          ] as const;
        } catch {
          return [
            view.id,
            [] as Array<{ id: string; label: string; time: string; relativeTime: string }>,
          ] as const;
        }
      }),
    );
    for (const [viewId, previews] of previewResults) recordPreviews.set(viewId, previews);
  }

  return (
    <PortalHomeDashboard
      portals={views.map((view) => {
        const viewActivities = activityByObject.get(view.objectNameSingular) ?? [];
        const recentRecords = (recordPreviews.get(view.id) ?? []).map((record) => ({
          ...record,
          action: "Recently updated",
        }));
        return {
          id: view.id,
          slug: view.slug,
          label: view.label,
          objectLabel: view.objectNamePlural,
          widgetCount: view.dashboardWidgets.length,
          activityCount: viewActivities.length,
          recentRecords,
        };
      })}
      activities={activities.slice(0, 12).map((activity) => {
        const view = activity.objectName ? viewByObject.get(activity.objectName) : undefined;
        return {
          id: activity.id,
          label: activityLabel(activity.action),
          portalLabel: view?.label ?? activity.objectName ?? "Portal",
          portalSlug: view?.slug ?? null,
          recordId: activity.recordId,
          status: activity.status,
          time: activity.createdAt.toISOString(),
          titleTime: activity.createdAt.toLocaleString(),
          relativeTime: relativeActivityTime(activity.createdAt),
        };
      })}
    />
  );
}
