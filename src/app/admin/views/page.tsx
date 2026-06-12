import Link from "next/link";

import { createPortalViewAction } from "@/app/actions/admin";
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
      <form action={createPortalViewAction} className="card grid gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Configure a portal view</h2>
          <p className="mt-1 text-sm text-[#68758a]">
            Field lists are comma-separated Twenty API field names. The scope
            field must contain the related Company ID.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="field">
            <label htmlFor="label">Navigation label</label>
            <input className="input" id="label" name="label" required />
          </div>
          <div className="field">
            <label htmlFor="slug">URL slug</label>
            <input className="input" id="slug" name="slug" required />
          </div>
          <div className="field">
            <label htmlFor="objectNameSingular">Twenty object</label>
            <select
              className="input"
              id="objectNameSingular"
              name="objectNameSingular"
              required
            >
              <option value="">Choose an object</option>
              {objects.map((object) => (
                <option key={object.id} value={object.nameSingular}>
                  {object.labelSingular} ({object.nameSingular})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="objectNamePlural">Plural API name</label>
            <input
              className="input"
              id="objectNamePlural"
              name="objectNamePlural"
              placeholder="salesCalls"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="scopeFieldName">Company scope field</label>
            <input
              className="input"
              id="scopeFieldName"
              name="scopeFieldName"
              placeholder="companyId"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="navigationOrder">Navigation order</label>
            <input
              className="input"
              defaultValue="0"
              id="navigationOrder"
              name="navigationOrder"
              type="number"
            />
          </div>
          {[
            ["columns", "Table columns"],
            ["detailFields", "Detail fields"],
            ["filterFields", "Filter fields"],
            ["createFields", "Create fields"],
            ["editFields", "Edit fields"],
          ].map(([name, label]) => (
            <div className="field" key={name}>
              <label htmlFor={name}>{label}</label>
              <input
                className="input"
                id={name}
                name={name}
                placeholder="title, status, createdAt"
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="defaultSortField">Default sort field</label>
            <input
              className="input"
              id="defaultSortField"
              name="defaultSortField"
            />
          </div>
          <div className="field">
            <label htmlFor="defaultSortDirection">Sort direction</label>
            <select
              className="input"
              id="defaultSortDirection"
              name="defaultSortDirection"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <button className="button w-fit" type="submit">
          Create view
        </button>
      </form>
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
