import "server-only";

import { randomUUID } from "node:crypto";

import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
  TwentyObjectMetadata,
} from "@/lib/db/schema";
import { getTwentyIntegrationSettings } from "@/lib/integration-settings";
import {
  buildListQuery,
  buildMutation,
  buildSelection,
  buildSingleQuery,
} from "@/lib/twenty/graphql";
import {
  getTwentyEndpoint,
  getTwentyRestRecordEndpoint,
  type TwentyEndpoint,
} from "@/lib/twenty/url";
import {
  clearTwentyReadCache,
  getCachedTwentyRead,
  RECORD_CACHE_TTL_MS,
  twentyReadCacheKey,
} from "@/lib/twenty/cache";
import {
  deleteDemoRecord,
  demoTwentyMetadata,
  getDemoRecord,
  listDemoRecords,
  writeDemoRecord,
} from "@/lib/demo/twenty";

const demoMode = process.env.DEMO_MODE === "true";

type GraphQLError = { message: string; extensions?: { code?: string } };

export class TwentyApiError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
  }
}

async function requestTwenty<T>(endpoint: TwentyEndpoint, query: string) {
  const settings = await getTwentyIntegrationSettings();
  const endpointUrl = getTwentyEndpoint(
    settings.baseUrl,
    endpoint,
    settings.autoFormatUrl,
  );
  let response: Response;

  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${settings.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new TwentyApiError(
      "Twenty CRM is temporarily unavailable. Try again shortly.",
      true,
    );
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    throw new TwentyApiError(
      `Twenty CRM redirected ${endpointUrl.toString()}${
        location ? ` to ${location}` : ""
      }. Set TWENTY_BASE_URL to the final public origin, including the correct http or https protocol.`,
      false,
      response.status,
    );
  }

  if (!response.ok) {
    throw new TwentyApiError(
      response.status === 429
        ? "Twenty CRM rate limit reached. Try again shortly."
        : "Twenty CRM rejected the request.",
      response.status >= 500 || response.status === 429,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: GraphQLError[];
  };
  if (payload.errors?.length || !payload.data) {
    throw new TwentyApiError(
      payload.errors?.[0]?.message ?? "Twenty CRM returned an invalid response.",
      false,
    );
  }
  return payload.data;
}

export async function testTwentyConnection() {
  if (demoMode) return true;
  const data = await requestTwenty<{ __typename: string }>(
    "/graphql",
    "query PortalConnectionTest { __typename }",
  );
  return data.__typename === "Query";
}

export async function fetchTwentyMetadata(): Promise<TwentyObjectMetadata[]> {
  if (demoMode) return demoTwentyMetadata;
  const data = await requestTwenty<{
    objects: {
      edges: Array<{
        node: {
          id: string;
          nameSingular: string;
          namePlural: string;
          labelSingular: string;
          labelPlural: string;
          isActive: boolean;
          fieldsList: Array<{
            id: string;
            name: string;
            label: string;
            type: string;
            isActive: boolean;
            isNullable: boolean;
            options?: Array<{ value: string; label: string; color?: string }>;
            relation?: {
              type: "ONE_TO_MANY" | "MANY_TO_ONE";
              targetObjectMetadata?: { nameSingular: string };
            };
          }>;
        };
      }>;
    };
  }>(
    "/metadata",
    `query PortalMetadata {
      objects(paging:{first:1000}) {
        edges {
          node {
            id nameSingular namePlural labelSingular labelPlural isActive
            fieldsList {
              id name label type isActive isNullable options
              relation { type targetObjectMetadata { nameSingular } }
            }
          }
        }
      }
    }`,
  );

  return data.objects.edges
    .map(({ node }) => node)
    .filter((object) => object.isActive)
    .map((object) => ({
      id: object.id,
      nameSingular: object.nameSingular,
      namePlural: object.namePlural,
      labelSingular: object.labelSingular,
      labelPlural: object.labelPlural,
      fields: object.fieldsList
        .filter((field) => field.isActive)
        .map((field) => ({
          id: field.id,
          name: field.name,
          label: field.label,
          type: field.type,
          isNullable: field.isNullable,
          options: field.options,
          relationType: field.relation?.type,
          relationTargetObjectNameSingular:
            field.relation?.targetObjectMetadata?.nameSingular,
        })),
    }));
}

function fieldSelections(
  metadataFields: TwentyFieldMetadata[],
  fields: PortalFieldConfig[],
) {
  const requested = new Set(fields.map((field) => field.name));
  return Object.fromEntries(
    metadataFields
      .filter((field) => requested.has(field.name))
      .map((field) => [
        field.name,
        {
          type: field.type,
          relationType: field.relationType,
          relationDisplayFields: field.relationDisplayFields,
        },
      ]),
  );
}

export async function listTwentyRecords(input: {
  objectNamePlural: string;
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  filter: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  cursor?: string;
}) {
  if (demoMode) return listDemoRecords(input);
  const selection = buildSelection(
    input.fields.map((field) => field.name),
    fieldSelections(input.metadataFields, input.fields),
  );
  const query = buildListQuery({
    objectNamePlural: input.objectNamePlural,
    selection,
    filter: input.filter,
    orderBy: input.orderBy,
    after: input.cursor,
    first: 50,
  });
  const data = await getCachedTwentyRead(
    twentyReadCacheKey("/graphql", query),
    () =>
      requestTwenty<
    Record<
      string,
      {
        edges: Array<{ node: Record<string, unknown> }>;
        pageInfo: {
          hasNextPage: boolean;
          hasPreviousPage: boolean;
          startCursor?: string;
          endCursor?: string;
        };
      }
    >
      >("/graphql", query),
  );
  return data[input.objectNamePlural];
}

export async function getTwentyRecord(input: {
  objectNameSingular: string;
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  filter: Record<string, unknown>;
}) {
  if (demoMode) return getDemoRecord(input);
  const selection = buildSelection(
    input.fields.map((field) => field.name),
    fieldSelections(input.metadataFields, input.fields),
  );
  const query = buildSingleQuery({
    objectNameSingular: input.objectNameSingular,
    selection,
    filter: input.filter,
  });
  const data = await getCachedTwentyRead(
    twentyReadCacheKey("/graphql", query),
    () =>
      requestTwenty<Record<string, Record<string, unknown> | null>>(
        "/graphql",
        query,
      ),
    RECORD_CACHE_TTL_MS,
  );
  return data[input.objectNameSingular];
}

export async function writeTwentyRecord(input: {
  operation: "create" | "update";
  objectNameSingular: string;
  data: Record<string, unknown>;
  id?: string;
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
}) {
  if (demoMode) return writeDemoRecord(input);
  const selection = buildSelection(
    input.fields.map((field) => field.name),
    fieldSelections(input.metadataFields, input.fields),
  );
  const mutationRoot = `${input.operation}${
    input.objectNameSingular.charAt(0).toUpperCase() +
    input.objectNameSingular.slice(1)
  }`;
  const response = await requestTwenty<
    Record<string, Record<string, unknown>>
  >(
    "/graphql",
    buildMutation({
      operation: input.operation,
      objectNameSingular: input.objectNameSingular,
      data: input.data,
      id: input.id,
      selection,
    }),
  );
  clearTwentyReadCache();
  return response[mutationRoot];
}

export async function uploadTwentyFilesFieldFile(input: {
  file: File;
  fieldMetadataId: string;
}) {
  if (demoMode) return `demo-file-${randomUUID()}`;
  const settings = await getTwentyIntegrationSettings();
  const endpointUrl = getTwentyEndpoint(
    settings.baseUrl,
    "/metadata",
    settings.autoFormatUrl,
  );
  const query = `mutation UploadPortalAttachment($file: Upload!, $fieldMetadataId: String!) {
    uploadFilesFieldFile(file: $file, fieldMetadataId: $fieldMetadataId) {
      id
    }
  }`;
  const body = new FormData();
  body.set(
    "operations",
    JSON.stringify({
      query,
      variables: { file: null, fieldMetadataId: input.fieldMetadataId },
    }),
  );
  body.set("map", JSON.stringify({ "0": ["variables.file"] }));
  body.set("0", input.file, input.file.name);

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${settings.apiKey}` },
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new TwentyApiError(
      "Twenty CRM is temporarily unavailable. Try the upload again.",
      true,
    );
  }

  if (!response.ok) {
    throw new TwentyApiError(
      response.status === 429
        ? "Twenty CRM rate limit reached. Try again shortly."
        : "Twenty CRM rejected the file upload.",
      response.status >= 500 || response.status === 429,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    data?: { uploadFilesFieldFile?: { id?: string } };
    errors?: GraphQLError[];
  };
  const fileId = payload.data?.uploadFilesFieldFile?.id;
  if (payload.errors?.length || !fileId) {
    throw new TwentyApiError(
      payload.errors?.[0]?.message ?? "Twenty CRM did not return a file ID.",
      false,
    );
  }
  return fileId;
}

export async function deleteTwentyRecord(input: {
  objectNamePlural: string;
  recordId: string;
}) {
  if (demoMode) {
    deleteDemoRecord(input);
    return;
  }
  const settings = await getTwentyIntegrationSettings();
  const endpointUrl = getTwentyRestRecordEndpoint(
    settings.baseUrl,
    input.objectNamePlural,
    input.recordId,
    settings.autoFormatUrl,
  );

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "DELETE",
      headers: { authorization: `Bearer ${settings.apiKey}` },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new TwentyApiError(
      "Twenty CRM is temporarily unavailable. Try again shortly.",
      true,
    );
  }

  if (!response.ok) {
    throw new TwentyApiError(
      response.status === 429
        ? "Twenty CRM rate limit reached. Try again shortly."
        : "Twenty CRM rejected the delete request.",
      response.status >= 500 || response.status === 429,
      response.status,
    );
  }
  clearTwentyReadCache();
}
