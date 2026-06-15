import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye } from "lucide-react";

import { updatePortalViewAction } from "@/app/actions/admin";
import { PortalViewForm } from "@/components/portal-view-form";
import { db } from "@/lib/db";
import { portalViews } from "@/lib/db/schema";
import { getLatestMetadata } from "@/lib/portal";
import { eq } from "drizzle-orm";

export default async function EditViewPage({
  params,
}: {
  params: Promise<{ viewId: string }>;
}) {
  const { viewId } = await params;
  const [view, objects] = await Promise.all([
    db.query.portalViews.findFirst({
      where: eq(portalViews.id, viewId),
    }),
    getLatestMetadata(),
  ]);
  if (!view) notFound();

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Portal configuration</p>
          <h2>{view.label}</h2>
          <p>Update the external experience, then open a live scoped preview.</p>
        </div>
        <Link
          className="button secondary"
          href={`/admin/views/${view.id}/preview`}
        >
          <Eye size={17} />
          Preview portal
        </Link>
      </div>
      <PortalViewForm
        action={updatePortalViewAction.bind(null, view.id)}
        initial={view}
        objects={objects}
        submitLabel="Save view"
      />
    </div>
  );
}
