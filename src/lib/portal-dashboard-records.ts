import "server-only";

import { dashboardRequiredFields } from "@/lib/portal-dashboard";
import { listTwentyRecords } from "@/lib/twenty/client";

export async function listDashboardRecords(input: {
  objectNamePlural: string;
  fields: ReturnType<typeof dashboardRequiredFields>;
  metadataFields: Parameters<typeof dashboardRequiredFields>[1];
  filter: Record<string, unknown>;
}) {
  const records: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const result = await listTwentyRecords({
      objectNamePlural: input.objectNamePlural,
      fields: input.fields,
      metadataFields: input.metadataFields,
      filter: input.filter,
      cursor,
    });
    records.push(...result.edges.map(({ node }) => node));
    if (!result.pageInfo.hasNextPage || !result.pageInfo.endCursor) break;
    cursor = result.pageInfo.endCursor;
  }

  return records;
}
