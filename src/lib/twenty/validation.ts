import { z } from "zod";

import type {
  PortalFieldConfig,
  TwentyFieldMetadata,
} from "@/lib/db/schema";

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
]);

function fieldSchema(field: TwentyFieldMetadata) {
  switch (field.type) {
    case "NUMBER":
    case "NUMERIC":
      return z.coerce.number();
    case "BOOLEAN":
      return z
        .union([z.boolean(), z.enum(["true", "false"])])
        .transform((value) => value === true || value === "true");
    case "MULTI_SELECT":
      return z.union([z.array(z.string()), z.string()]).transform((value) =>
        Array.isArray(value)
          ? value
          : value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
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
    if (config.name === input.scopeFieldName) continue;
    const metadata = metadataByName.get(config.name);
    if (!metadata || !supportedTwentyFieldTypes.has(metadata.type)) continue;

    const schema = fieldSchema(metadata);
    shape[config.name] = config.required
      ? schema
      : z.preprocess(
          (value) => (value === "" || value === null ? undefined : value),
          schema.optional(),
        );
  }

  const raw = Object.fromEntries(
    Object.keys(shape).map((key) => [
      key,
      metadataByName.get(key)?.type === "MULTI_SELECT"
        ? input.formData.getAll(key)
        : input.formData.get(key),
    ]),
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
