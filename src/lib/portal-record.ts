import "server-only";

import type {
  PortalFieldConfig,
  PortalFixedFilter,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { getTwentyRecord } from "@/lib/twenty/client";
import {
  buildPortalScopeFilter,
  buildScopedFilter,
} from "@/lib/twenty/filters";

export function mergePortalFields(
  ...groups: PortalFieldConfig[][]
): PortalFieldConfig[] {
  const fields = new Map<string, PortalFieldConfig>();
  for (const group of groups) {
    for (const field of group) {
      const current = fields.get(field.name);
      fields.set(field.name, {
        ...current,
        ...field,
        required: current?.required || field.required,
      });
    }
  }
  return [...fields.values()];
}

export async function getScopedPortalRecord(input: {
  objectNameSingular: string;
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  recordId: string;
  scopeMode: string;
  scopeFieldName: string;
  allowedRecordIds: string[];
  twentyPersonId: string | null;
  fixedFilters: PortalFixedFilter[];
}) {
  return getTwentyRecord({
    objectNameSingular: input.objectNameSingular,
    fields: input.fields,
    metadataFields: input.metadataFields,
    filter: {
      and: [
        { id: { eq: input.recordId } },
        buildScopedFilter({
          scopeFilter: buildPortalScopeFilter({
            scopeMode: input.scopeMode,
            scopeFieldName: input.scopeFieldName,
            allowedRecordIds: input.allowedRecordIds,
            twentyPersonId: input.twentyPersonId,
            metadataFields: input.metadataFields,
          }),
          fixedFilters: input.fixedFilters,
          metadataFields: input.metadataFields,
          configuredFilters: [],
          requestedFilters: [],
        }),
      ],
    },
  });
}
