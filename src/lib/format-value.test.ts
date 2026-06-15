import { describe, expect, it } from "vitest";

import { formatPortalValue } from "@/lib/format-value";

describe("formatPortalValue", () => {
  it("formats date-only values without shifting the calendar date", () => {
    expect(formatPortalValue("2026-06-15", "DATE")).toBe("Jun 15, 2026");
  });

  it("formats date-time values in a readable form", () => {
    expect(
      formatPortalValue("2026-06-15T14:30:00.000Z", "DATE_TIME"),
    ).toContain("Jun 15, 2026");
  });

  it("uses descriptive relation values instead of IDs", () => {
    expect(
      formatPortalValue(
        { id: "record-id", name: "Mantel Technologies" },
        "RELATION",
      ),
    ).toBe("Mantel Technologies");
  });

  it("formats full names nested inside relations", () => {
    expect(
      formatPortalValue(
        {
          id: "person-id",
          name: { firstName: "Ada", lastName: "Lovelace" },
        },
        "RELATION",
      ),
    ).toBe("Ada Lovelace");
  });

  it("does not expose an ID when no descriptive relation value is available", () => {
    expect(formatPortalValue({ id: "record-id" }, "RELATION")).toBe(
      "Related record",
    );
  });

  it("shows empty relation placeholders as empty values", () => {
    expect(
      formatPortalValue(
        { id: null, name: null, linkedRecordCachedName: null },
        "RELATION",
      ),
    ).toBe("—");
  });

  it("extracts titles from connection-backed junction relations", () => {
    expect(
      formatPortalValue(
        {
          edges: [
            {
              node: {
                id: "target-id",
                note: { id: "note-id", title: "Discovery call notes" },
              },
            },
          ],
        },
        "RELATION",
      ),
    ).toBe("Discovery call notes");
  });

  it("uses a note's rich-text body when its title is empty", () => {
    expect(
      formatPortalValue(
        {
          edges: [
            {
              node: {
                id: "target-id",
                note: {
                  id: "note-id",
                  title: "",
                  bodyV2: {
                    markdown: "Customer requested updated pricing.",
                    blocknote: "[]",
                  },
                },
              },
            },
          ],
        },
        "RELATION",
      ),
    ).toBe("Customer requested updated pricing.");
  });
});
