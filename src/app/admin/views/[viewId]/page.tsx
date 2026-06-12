import { notFound } from "next/navigation";

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
    <PortalViewForm
      action={updatePortalViewAction.bind(null, view.id)}
      initial={view}
      objects={objects}
      submitLabel="Save view"
    />
  );
}
