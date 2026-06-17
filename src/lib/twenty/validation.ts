import { z } from "zod";

import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";
import { gqlEnum } from "@/lib/twenty/graphql";

export const supportedTwentyFieldTypes = new Set([
  "TEXT",
  "NUMBER",
  "NUMERIC",
  "BOOLEAN",
  "DATE",
  "DATE_TIME",
  "SELECT",
  "MULTI_SELECT",
  "CURRENCY",
  "RELATION",
  "UUID",
  "FILE",
  "FILES",
]);

const writableTwentyFieldTypes = new Set([
  "TEXT",
  "NUMBER",
  "NUMERIC",
  "BOOLEAN",
  "DATE",
  "DATE_TIME",
  "SELECT",
  "MULTI_SELECT",
  "CURRENCY",
  "RELATION",
  "UUID",
]);

export function isWritablePortalField(field: TwentyFieldMetadata) {
  if (!writableTwentyFieldTypes.has(field.type)) return false;
  return field.type !== "RELATION" || field.relationType === "MANY_TO_ONE";
}

function writeFieldName(field: TwentyFieldMetadata) {
  return field.type === "RELATION" ? `${field.name}Id` : field.name;
}

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null) return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
}

function fieldSchema(field: TwentyFieldMetadata) {
  switch (field.type) {
    case "NUMBER":
    case "NUMERIC":
      return z.coerce.number();
    case "BOOLEAN":
      return z
        .union([z.boolean(), z.enum(["true", "false"])])
        .transform((value) => value === true || value === "true");
    case "SELECT":
      return z.string().trim().transform(gqlEnum);
    case "MULTI_SELECT":
      return z.union([z.array(z.string()), z.string()]).transform((value) =>
        Array.isArray(value)
          ? value.map(gqlEnum)
          : value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .map(gqlEnum),
      );
    case "CURRENCY":
      return z.coerce.number().transform((amount) => ({
        amountMicros: Math.round(amount * 1_000_000),
        currencyCode: "USD",
      }));
    case "DATE":
    case "DATE_TIME":
      return z.iso.datetime({ local: true }).or(z.iso.date());
    default:
      return z.string().trim();
  }
}

export function validateRecordInput(input: {
  formData: FormData;
  configuredFields: PortalFieldConfig[];
  metadataFields: TwentyFieldMetadata[];
  scopeFieldName: string;
}) {
  const metadataByName = new Map(
    input.metadataFields.map((field) => [field.name, field]),
  );
  const shape: Record<string, z.ZodType> = {};

  for (const config of input.configuredFields) {
    const metadata = metadataByName.get(config.name);
    if (!metadata || !isWritablePortalField(metadata)) continue;
    const outputName = writeFieldName(metadata);
    if (
      config.name === input.scopeFieldName ||
      outputName === input.scopeFieldName ||
      outputName === `${input.scopeFieldName}Id`
    ) {
      continue;
    }

    const schema = fieldSchema(metadata);
    shape[outputName] = config.required
      ? schema
      : z.preprocess(
          emptyToUndefined,
          schema.optional(),
        );
  }

  const raw = Object.fromEntries(
    input.configuredFields.flatMap((config) => {
      const metadata = metadataByName.get(config.name);
      if (!metadata || !isWritablePortalField(metadata)) return [];
      const outputName = writeFieldName(metadata);
      if (!(outputName in shape)) return [];
      return [
        [
          outputName,
          metadata.type === "MULTI_SELECT"
            ? input.formData.getAll(config.name)
            : input.formData.get(config.name),
        ],
      ];
    }),
  );
  return z.object(shape).parse(raw);
}

export function validatePortalViewConfiguration(input: {
  objectNameSingular: string;
  scopeFieldName: string;
  scopeMode?: string;
  fieldNames: string[];
  objects: Array<{
    nameSingular: string;
    fields: TwentyFieldMetadata[];
  }>;
}) {
  const errors: string[] = [];
  const object = input.objects.find(
    (item) => item.nameSingular === input.objectNameSingular,
  );
  if (!object) return ["The configured Twenty object no longer exists."];

  const fields = new Set(object.fields.map((field) => field.name));
  if (
    input.scopeMode === "person" &&
    !fields.has(input.scopeFieldName)
  ) {
    errors.push("The Person scope field no longer exists.");
  }
  for (const fieldName of input.fieldNames) {
    if (!fields.has(fieldName)) {
      errors.push(`Field "${fieldName}" no longer exists.`);
    }
  }
  return errors;
}
