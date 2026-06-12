import { desc } from "drizzle-orm";

import { syncMetadataAction } from "@/app/actions/admin";
import { ConnectionTestButton } from "@/components/admin-actions";
import { db } from "@/lib/db";
import { metadataSnapshots } from "@/lib/db/schema";

export default async function AdminOverviewPage() {
  const [latest] = await db
    .select()
    .from(metadataSnapshots)
    .orderBy(desc(metadataSnapshots.syncedAt))
    .limit(1);
  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold">Twenty CRM connection</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68758a]">
          Credentials and the base URL are read from environment variables.
          Test access before synchronizing the workspace schema.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ConnectionTestButton />
          <form action={syncMetadataAction}>
            <button className="button" type="submit">
              Synchronize metadata
            </button>
          </form>
        </div>
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-bold">Metadata status</h2>
        {latest ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#68758a]">Last synchronized</dt>
              <dd className="mt-1 font-semibold">
                {latest.syncedAt.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#68758a]">Active objects</dt>
              <dd className="mt-1 font-semibold">{latest.objects.length}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[#68758a]">
            No metadata has been synchronized yet.
          </p>
        )}
      </section>
    </div>
  );
}
