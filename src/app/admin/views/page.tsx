import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import {
  deletePortalViewAction,
  setPortalViewStatusAction,
} from "@/app/actions/admin";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { db } from "@/lib/db";
import { portalViews } from "@/lib/db/schema";

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
      <section className="grid gap-3">
        {views.map((view) => (
          <article className="card p-5" key={view.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">{view.label}</h3>
                <p className="mt-1 text-sm text-[#68758a]">
                  {view.objectNameSingular} · /portal/{view.slug}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="badge">
                  {view.isEnabled ? "Enabled" : "Disabled"}
                </span>
                <Link
                  className="button secondary"
                  href={`/admin/views/${view.id}/preview`}
                >
                  <Eye size={16} />
                  Preview
                </Link>
                <Link
                  className="button secondary"
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
                  <button className="button secondary" type="submit">
                    {view.isEnabled ? "Suspend" : "Enable"}
                  </button>
                </form>
                <ConfirmDeleteForm
                  action={deletePortalViewAction.bind(null, view.id)}
                  description={`This permanently deletes the "${view.label}" portal view and its direct access grants.`}
                  title={`Delete ${view.label}?`}
                />
              </div>
            </div>
            {view.validationErrors.length ? (
              <ul className="error mt-4 list-disc pl-7 text-sm">
                {view.validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
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
