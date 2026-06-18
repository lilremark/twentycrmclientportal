import { AuditHistory } from "@/components/audit-history";

export default async function SettingsAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;

  return (
    <div className="page-stack">
      <AuditHistory query={query} />
    </div>
  );
}
