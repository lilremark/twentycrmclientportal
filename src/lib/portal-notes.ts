export type PortalNote = {
  id: string;
  targetId?: string;
  title: string;
  body: string;
};

function richTextMarkdown(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const richText = value as Record<string, unknown>;
  return String(richText.markdown ?? richText.blocknote ?? "");
}

export function extractPortalNotes(record: Record<string, unknown> | null) {
  const value = record?.noteTargets;
  if (!value || typeof value !== "object") return [];

  const edges = Array.isArray((value as Record<string, unknown>).edges)
    ? ((value as Record<string, unknown>).edges as unknown[])
    : [];

  return edges
    .map((edge): PortalNote | null => {
      const target =
        edge && typeof edge === "object"
          ? ((edge as Record<string, unknown>).node as
              | Record<string, unknown>
              | undefined)
          : undefined;
      const note =
        target?.note && typeof target.note === "object"
          ? (target.note as Record<string, unknown>)
          : undefined;
      const id = note?.id ? String(note.id) : "";
      if (!id) return null;
      return {
        id,
        targetId: target?.id ? String(target.id) : undefined,
        title: String(note?.title ?? "Untitled note"),
        body: richTextMarkdown(note?.bodyV2),
      };
    })
    .filter((note): note is PortalNote => Boolean(note));
}

export function noteBelongsToRecord(
  record: Record<string, unknown> | null,
  noteId: string,
) {
  return extractPortalNotes(record).some((note) => note.id === noteId);
}
