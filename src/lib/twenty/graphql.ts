const GRAPHQL_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;

export type GraphQLEnum = { __enum: string };

export function gqlEnum(value: string): GraphQLEnum {
  return { __enum: assertGraphQLName(value) };
}

export function assertGraphQLName(value: string) {
  if (!GRAPHQL_NAME.test(value)) {
    throw new Error(`Invalid GraphQL identifier: ${value}`);
  }
  return value;
}

export function upperFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toGraphQLLiteral(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(toGraphQLLiteral).join(",")}]`;
  }
  if (typeof value === "object") {
    if ("__enum" in (value as Record<string, unknown>)) {
      return assertGraphQLName(
        String((value as Record<string, unknown>).__enum),
      );
    }
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `${assertGraphQLName(key)}:${toGraphQLLiteral(item)}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported GraphQL value: ${typeof value}`);
}

export function buildSelection(
  fieldNames: string[],
  fieldTypes: Record<string, string> = {},
) {
  const fields = [...new Set(["id", ...fieldNames])];
  return fields
    .map((field) => {
      assertGraphQLName(field);
      switch (fieldTypes[field]) {
        case "CURRENCY":
          return `${field}{amountMicros currencyCode}`;
        case "FULL_NAME":
          return `${field}{firstName lastName}`;
        case "RELATION":
          return `${field}{id}`;
        default:
          return field;
      }
    })
    .join("\n");
}

export function buildListQuery(input: {
  objectNamePlural: string;
  selection: string;
  filter: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  first?: number;
  after?: string;
}) {
  const root = assertGraphQLName(input.objectNamePlural);
  const args: string[] = [
    `filter:${toGraphQLLiteral(input.filter)}`,
    `first:${Math.min(input.first ?? 50, 50)}`,
  ];
  if (input.orderBy) args.push(`orderBy:${toGraphQLLiteral(input.orderBy)}`);
  if (input.after) args.push(`after:${toGraphQLLiteral(input.after)}`);

  return `query PortalList {
    ${root}(${args.join(",")}) {
      edges { node { ${input.selection} } }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
  }`;
}

export function buildSingleQuery(input: {
  objectNameSingular: string;
  selection: string;
  filter: Record<string, unknown>;
}) {
  const root = assertGraphQLName(input.objectNameSingular);
  return `query PortalRecord {
    ${root}(filter:${toGraphQLLiteral(input.filter)}) {
      ${input.selection}
    }
  }`;
}

export function buildMutation(input: {
  operation: "create" | "update";
  objectNameSingular: string;
  data: Record<string, unknown>;
  id?: string;
  selection: string;
}) {
  const mutationName = `${input.operation}${upperFirst(
    assertGraphQLName(input.objectNameSingular),
  )}`;
  const args =
    input.operation === "create"
      ? `data:${toGraphQLLiteral(input.data)}`
      : `id:${toGraphQLLiteral(input.id)},data:${toGraphQLLiteral(input.data)}`;

  return `mutation PortalWrite {
    ${mutationName}(${args}) {
      ${input.selection}
    }
  }`;
}
