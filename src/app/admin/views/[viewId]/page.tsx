import { notFound } from "next/navigation";

import { updatePortalViewAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { portalViews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function names(items: Array<{ name: string }>) {
  return items.map((item) => item.name).join(", ");
}

export default async function EditViewPage({
  params,
}: {
  params: Promise<{ viewId: string }>;
}) {
  const { viewId } = await params;
  const view = await db.query.portalViews.findFirst({
    where: eq(portalViews.id, viewId),
  });
  if (!view) notFound();

  return (
    <form
      action={updatePortalViewAction.bind(null, view.id)}
      className="card grid gap-4 p-5"
    >
      <div>
        <h2 className="text-lg font-bold">Edit {view.label}</h2>
        <p className="mt-1 text-sm text-[#68758a]">
          Saving revalidates every field against the latest Twenty metadata.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["label", "Navigation label", view.label],
          ["slug", "URL slug", view.slug],
          [
            "objectNameSingular",
            "Singular API name",
            view.objectNameSingular,
          ],
          ["objectNamePlural", "Plural API name", view.objectNamePlural],
          ["scopeFieldName", "Company scope field", view.scopeFieldName],
          ["columns", "Table columns", names(view.columns)],
          ["detailFields", "Detail fields", names(view.detailFields)],
          ["filterFields", "Filter fields", names(view.filterFields)],
          ["createFields", "Create fields", names(view.createFields)],
          ["editFields", "Edit fields", names(view.editFields)],
          [
            "defaultSortField",
            "Default sort field",
            view.defaultSortField ?? "",
          ],
        ].map(([name, label, value]) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              className="input"
              defaultValue={value}
              id={name}
              name={name}
              required={[
                "label",
                "slug",
                "objectNameSingular",
                "objectNamePlural",
                "scopeFieldName",
              ].includes(name)}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="navigationOrder">Navigation order</label>
          <input
            className="input"
            defaultValue={view.navigationOrder}
            id="navigationOrder"
            name="navigationOrder"
            type="number"
          />
        </div>
        <div className="field">
          <label htmlFor="defaultSortDirection">Sort direction</label>
          <select
            className="input"
            defaultValue={view.defaultSortDirection}
            id="defaultSortDirection"
            name="defaultSortDirection"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
      <button className="button w-fit" type="submit">
        Save view
      </button>
    </form>
  );
}
