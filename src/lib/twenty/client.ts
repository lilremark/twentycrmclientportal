import "server-only";

import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
  TwentyObjectMetadata,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import {
  buildListQuery,
  buildMutation,
  buildSelection,
  buildSingleQuery,
} from "@/lib/twenty/graphql";
import {
  getTwentyEndpoint,
  type TwentyEndpoint,
} from "@/lib/twenty/url";

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
  const env = getEnv();
  const endpointUrl = getTwentyEndpoint(env.TWENTY_BASE_URL, endpoint);
  let response: Response;

  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.TWENTY_API_KEY}`,
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
  const data = await requestTwenty<{ __typename: string }>(
    "/graphql",
    "query PortalConnectionTest { __typename }",
  );
  return data.__typename === "Query";
}

export async function fetchTwentyMetadata(): Promise<TwentyObjectMetadata[]> {
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
              relation { targetObjectMetadata { nameSingular } }
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
          relationTargetObjectNameSingular:
            field.relation?.targetObjectMetadata?.nameSingular,
        })),
    }));
}

function fieldTypes(
  metadataFields: TwentyFieldMetadata[],
  fields: PortalFieldConfig[],
) {
  const requested = new Set(fields.map((field) => field.name));
  return Object.fromEntries(
    metadataFields
      .filter((field) => requested.has(field.name))
      .map((field) => [field.name, field.type]),
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
  const selection = buildSelection(
    input.fields.map((field) => field.name),
    fieldTypes(input.metadataFields, input.fields),
  );
  const data = await requestTwenty<
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
  >(
    "/graphql",
    buildListQuery({
      objectNamePlural: input.objectNamePlural,
      selection,
      filter: input.filter,
      orderBy: input.orderBy,
      after: input.cursor,
      first: 50,
    }),
  );
  return data[input.objectNamePlural];
}

export async function getTwentyRecord(input: {
  objectNameSingular: string;
  fields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  filter: Record<string, unknown>;
}) {
  const selection = buildSelection(
    input.fields.map((field) => field.name),
    fieldTypes(input.metadataFields, input.fields),
  );
  const data = await requestTwenty<Record<string, Record<string, unknown> | null>>(
    "/graphql",
    buildSingleQuery({
      objectNameSingular: input.objectNameSingular,
      selection,
      filter: input.filter,
    }),
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
  const selection = buildSelection(
    input.fields.map((field) => field.name),
    fieldTypes(input.metadataFields, input.fields),
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
  return response[mutationRoot];
}
