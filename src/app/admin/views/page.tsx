import Link from "next/link";

import { createPortalViewAction } from "@/app/actions/admin";
import { PortalViewForm } from "@/components/portal-view-form";
import { db } from "@/lib/db";
import { portalViews } from "@/lib/db/schema";
import { getLatestMetadata } from "@/lib/portal";

export default async function ViewsPage() {
  const [views, objects] = await Promise.all([
    db.select().from(portalViews),
    getLatestMetadata(),
  ]);
  return (
    <div className="grid gap-6">
      <PortalViewForm
        action={createPortalViewAction}
        objects={objects}
        submitLabel="Create view"
      />
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
              <div className="flex items-center gap-3">
                <span className="badge">
                  {view.isEnabled ? "Enabled" : "Disabled"}
                </span>
                <Link
                  className="button secondary"
                  href={`/admin/views/${view.id}`}
                >
                  Edit
                </Link>
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
      </section>
    </div>
  );
}
