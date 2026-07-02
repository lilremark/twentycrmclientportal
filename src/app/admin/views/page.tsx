import Link from "next/link";
import type { CSSProperties } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  Folder,
  Pencil,
  Plus,
  Table2,
  Target,
  Users,
  icons,
  type LucideIcon,
} from "lucide-react";

import {
  deletePortalViewAction,
  setPortalViewStatusAction,
} from "@/app/actions/admin";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { db } from "@/lib/db";
import { portalViews } from "@/lib/db/schema";

const portalViewIcons: Record<string, LucideIcon> = {
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  chart: BarChart3,
  file: FileText,
  folder: Folder,
  records: ClipboardList,
  table: Table2,
  target: Target,
  users: Users,
};

export default async function ViewsPage() {
  const views = await db.select().from(portalViews);
  return (
    <div className="page-stack">
      <div className="page-actions">
        <Link className="button primary" href="/admin/views/new">
          <Plus size={17} />
          Add portal view
        </Link>
      </div>
      <section className="admin-portal-view-grid">
        {views.map((view) => {
          const ViewIcon = portalViewIcons[view.navigationIcon] ?? (icons[view.navigationIcon as keyof typeof icons] as LucideIcon | undefined) ?? ClipboardList;
          return (
            <article className="admin-portal-view-card" key={view.id}>
              <div className="admin-portal-view-heading">
                <span
                  className="admin-portal-view-icon"
                  style={{ "--portal-view-color": view.navigationIconColor } as CSSProperties}
                >
                  <ViewIcon size={20} />
                </span>
                <div>
                  <h3>{view.label}</h3>
                  <span>{view.objectNamePlural}</span>
                </div>
                <span className={`admin-portal-view-status ${view.isEnabled ? "is-enabled" : ""}`}>
                  {view.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="admin-portal-view-meta">
                <span>
                  {view.scopeMode === "all"
                    ? "All records"
                    : view.scopeMode === "person"
                      ? "Person scoped"
                      : `${view.allowedRecordIds.length} records`}
                </span>
                <span>{view.columns.length} columns</span>
              </div>
              <div className="admin-portal-view-actions">
                <Link
                  className="button secondary admin-view-action"
                  href={`/admin/views/${view.id}/preview`}
                >
                  <Eye size={16} />
                  Preview
                </Link>
                <Link
                  className="button secondary admin-view-action"
                  href={`/admin/views/${view.id}`}
                >
                  <Pencil size={16} />
                  Edit
                </Link>
                <form
                  action={setPortalViewStatusAction.bind(
                    null,
                    view.id,
                    !view.isEnabled,
                  )}
                >
                  <button className="button secondary admin-view-action" type="submit">
                    {view.isEnabled ? "Suspend" : "Enable"}
                  </button>
                </form>
                <ConfirmDeleteForm
                  action={deletePortalViewAction.bind(null, view.id)}
                  description={`This permanently deletes the "${view.label}" portal view and its direct access grants.`}
                  title={`Delete ${view.label}?`}
                />
              </div>
              {view.validationErrors.length ? (
                <ul className="error admin-portal-view-errors">
                  {view.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
        {!views.length ? (
          <div className="card empty-state">
            <p>No portal views have been created yet.</p>
            <Link className="button primary mt-4" href="/admin/views/new">
              <Plus size={17} />
              Add portal view
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
