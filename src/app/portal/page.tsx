import Link from "next/link";

import { requirePortalContext } from "@/lib/access";
import { getEnabledPortalViews } from "@/lib/portal";

export default async function PortalHomePage() {
  const [context, views] = await Promise.all([
    requirePortalContext(),
    getEnabledPortalViews(),
  ]);
  return (
    <div>
      <h2 className="text-2xl font-bold">Welcome, {context.session.user.name}</h2>
      <p className="mt-2 text-[#68758a]">
        Select a workspace area to view records scoped to {context.clientName}.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {views.map((view) => (
          <Link
            className="card p-5 transition-transform hover:-translate-y-0.5"
            href={`/portal/${view.slug}`}
            key={view.id}
          >
            <h3 className="font-bold">{view.label}</h3>
            <p className="mt-2 text-sm text-[#68758a]">
              View and filter {view.objectNamePlural}.
            </p>
          </Link>
        ))}
      </div>
      {!views.length ? (
        <p className="card mt-7 p-6 text-sm text-[#68758a]">
          No portal views have been configured yet.
        </p>
      ) : null}
    </div>
  );
}
