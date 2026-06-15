import type {
  TwentyFieldMetadata,
  TwentyObjectMetadata,
  TwentyRelationDisplayField,
} from "@/lib/db/schema";

const preferredDisplayNames = [
  "name",
  "title",
  "bodyV2",
  "label",
  "subject",
  "orderNumber",
  "linkedRecordCachedName",
  "n02CustomerOrderNumber",
  "n03PickOrderNumber",
  "email",
];

function directDisplayFields(
  fields: TwentyFieldMetadata[],
): TwentyRelationDisplayField[] {
  const supported = fields.filter((field) =>
    ["TEXT", "FULL_NAME", "RICH_TEXT"].includes(field.type),
  );
  const preferred = preferredDisplayNames
    .map((name) => supported.find((field) => field.name === name))
    .filter((field): field is TwentyFieldMetadata => Boolean(field));
  const fullName = supported.find((field) => field.type === "FULL_NAME");
  const fallback = supported.find((field) => field.type === "TEXT");

  return [...new Map(
    [...preferred, ...(fullName ? [fullName] : []), ...(fallback ? [fallback] : [])]
      .map((field) => [field.name, { name: field.name, type: field.type }]),
  ).values()].slice(0, 2);
}

export function enrichRelationMetadata(objects: TwentyObjectMetadata[]) {
  const objectsByName = new Map(
    objects.map((object) => [object.nameSingular, object]),
  );

  function relationDisplayFields(
    target: TwentyObjectMetadata,
    depth = 0,
    visited = new Set<string>(),
  ): TwentyRelationDisplayField[] {
    const direct = directDisplayFields(target.fields);
    if (direct.length || depth >= 2 || visited.has(target.nameSingular)) {
      return direct;
    }

    const nextVisited = new Set(visited).add(target.nameSingular);
    for (const relation of target.fields) {
      if (
        relation.type !== "RELATION" ||
        !relation.relationTargetObjectNameSingular
      ) {
        continue;
      }
      const nestedTarget = objectsByName.get(
        relation.relationTargetObjectNameSingular,
      );
      if (!nestedTarget || nextVisited.has(nestedTarget.nameSingular)) {
        continue;
      }
      const nestedFields = relationDisplayFields(
        nestedTarget,
        depth + 1,
        nextVisited,
      );
      if (nestedFields.length) {
        return [
          {
            name: relation.name,
            type: relation.type,
            relationType: relation.relationType,
            relationDisplayFields: nestedFields,
          },
        ];
      }
    }

    return [];
  }

  return objects.map((object) => ({
    ...object,
    fields: object.fields.map((field) => {
      if (field.type !== "RELATION") return field;
      const target = field.relationTargetObjectNameSingular
        ? objectsByName.get(field.relationTargetObjectNameSingular)
        : undefined;
      return {
        ...field,
        relationDisplayFields: target
          ? relationDisplayFields(target)
          : [],
      };
    }),
  }));
}
