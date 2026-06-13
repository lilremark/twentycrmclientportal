import Link from "next/link";

import { requirePortalContext } from "@/lib/access";
import { getApplicationSettings } from "@/lib/application-settings";

export default async function PortalHomePage() {
  const [context, settings] = await Promise.all([
    requirePortalContext(),
    getApplicationSettings(),
  ]);
  const views = context.views;
  return (
    <div>
      <p className="eyebrow">Welcome, {context.session.user.name}</p>
      <h2 className="mt-1 text-2xl font-bold">{settings.portalTitle}</h2>
      <p className="mt-2 text-[#68758a]">
        {settings.portalDescription}
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
