import { describe, expect, it } from "vitest";

import { extractPortalFiles } from "@/lib/file-values";

describe("extractPortalFiles", () => {
  it("preserves the parent attachment ID for delete actions", () => {
    const files = extractPortalFiles({
      edges: [
        {
          node: {
            id: "attachment-1",
            name: "Contract",
            file: [
              {
                fullPath: "/files/contract.pdf",
                label: "contract.pdf",
                mimeType: "application/pdf",
              },
            ],
          },
        },
      ],
    });

    expect(files).toEqual([
      expect.objectContaining({
        attachmentId: "attachment-1",
        isPdf: true,
        label: "contract.pdf",
      }),
    ]);
  });

  it("does not expose a delete ID for a standalone file field", () => {
    const [file] = extractPortalFiles({
      id: "file-storage-id",
      fullPath: "/files/image.png",
      mimeType: "image/png",
    });

    expect(file?.attachmentId).toBeUndefined();
  });
});
