function formatDate(value: unknown, includeTime: boolean) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function relationItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [value];
  const object = value as Record<string, unknown>;
  if (Array.isArray(object.edges)) {
    return object.edges.map((edge) =>
      edge && typeof edge === "object"
        ? (edge as Record<string, unknown>).node
        : edge,
    );
  }
  return [value];
}

function descriptiveObjectValue(value: unknown): string {
  if (!value || typeof value !== "object") return String(value ?? "");
  const object = value as Record<string, unknown>;
  if ("firstName" in object || "lastName" in object) {
    return [object.firstName, object.lastName].filter(Boolean).join(" ");
  }

  const preferred = [
    "name",
    "title",
    "bodyV2",
    "markdown",
    "blocknote",
    "label",
    "subject",
    "fullPath",
    "fullpath",
    "fileName",
    "filename",
    "orderNumber",
    "linkedRecordCachedName",
    "n02CustomerOrderNumber",
    "n03PickOrderNumber",
    "email",
  ];
  for (const key of preferred) {
    const item = object[key];
    if (item !== null && item !== undefined && item !== "") {
      return typeof item === "object"
        ? descriptiveObjectValue(item)
        : String(item);
    }
  }

  const fallback = Object.entries(object).find(
    ([key, item]) =>
      key !== "id" &&
      item !== null &&
      item !== undefined &&
      item !== "" &&
      typeof item !== "object",
  );
  if (fallback) return String(fallback[1]);

  const nested = Object.entries(object)
    .filter(([key, item]) => key !== "id" && item && typeof item === "object")
    .flatMap(([, item]) => relationItems(item))
    .map(descriptiveObjectValue)
    .filter(Boolean);
  if (nested.length) return nested.join(", ");

  const hasRelationId =
    object.id !== null && object.id !== undefined && object.id !== "";
  return hasRelationId ? "Related record" : "";
}

export function formatPortalValue(value: unknown, type?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "DATE") return formatDate(value, false) ?? String(value);
  if (type === "DATE_TIME") return formatDate(value, true) ?? String(value);
  if (type === "RELATION") {
    return relationItems(value)
      .map(descriptiveObjectValue)
      .filter(Boolean)
      .join(", ") || "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if ("amountMicros" in object) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: String(object.currencyCode ?? "USD"),
      }).format(Number(object.amountMicros) / 1_000_000);
    }
    return descriptiveObjectValue(value);
  }
  return String(value);
}
