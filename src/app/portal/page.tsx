import Link from "next/link";
import { ArrowRight, Rows3 } from "lucide-react";

import { requirePortalContext } from "@/lib/access";
import { getApplicationSettings } from "@/lib/application-settings";

export default async function PortalHomePage() {
  const [context, settings] = await Promise.all([
    requirePortalContext(),
    getApplicationSettings(),
  ]);
  const views = context.views;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Welcome, {context.session.user.name}</p>
          <h2>{settings.portalTitle}</h2>
          <p>{settings.portalDescription}</p>
        </div>
      </div>
      <div className="portal-card-grid">
        {views.map((view) => (
          <Link
            className="card portal-summary-card"
            href={`/portal/${view.slug}`}
            key={view.id}
          >
            <div>
              <span className="activity-icon mb-3">
                <Rows3 size={17} />
              </span>
              <h3 className="font-bold">{view.label}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                View and filter {view.objectNamePlural}.
              </p>
            </div>
            <div className="portal-card-meta">
              Open portal <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
      {!views.length ? (
        <p className="card empty-state text-sm">
          No portal views have been configured yet.
        </p>
      ) : null}
    </div>
  );
}
