import { describe, expect, it } from "vitest";

import { extractPortalNotes, noteBelongsToRecord } from "@/lib/portal-notes";

describe("portal notes", () => {
  it("extracts nested notes from note targets", () => {
    const record = {
      noteTargets: {
        edges: [
          {
            node: {
              id: "target-1",
              note: {
                id: "note-1",
                title: "Call notes",
                bodyV2: { markdown: "Discussed next steps." },
              },
            },
          },
        ],
      },
    };

    expect(extractPortalNotes(record)).toEqual([
      {
        id: "note-1",
        targetId: "target-1",
        title: "Call notes",
        body: "Discussed next steps.",
      },
    ]);
    expect(noteBelongsToRecord(record, "note-1")).toBe(true);
    expect(noteBelongsToRecord(record, "other-note")).toBe(false);
  });
});
