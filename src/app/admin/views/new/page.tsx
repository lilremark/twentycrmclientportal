import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createPortalViewAction } from "@/app/actions/admin";
import { PortalViewForm } from "@/components/portal-view-form";
import { getLatestMetadata } from "@/lib/portal";

export default async function CreateViewPage() {
  const objects = await getLatestMetadata();

  return (
    <div className="page-stack">
      <div className="page-actions">
        <Link className="button secondary" href="/admin/views">
          <ArrowLeft size={17} />
          Back to views
        </Link>
      </div>
      <PortalViewForm
        action={createPortalViewAction}
        objects={objects}
        submitLabel="Create view"
      />
    </div>
  );
}
