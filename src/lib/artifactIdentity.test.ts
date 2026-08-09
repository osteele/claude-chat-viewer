import { describe, expect, test } from "bun:test";
import { createToolArtifactKey } from "./artifactIdentity";

describe("createToolArtifactKey", () => {
  test("prefers the current artifact id", () => {
    expect(createToolArtifactKey("message-1", "artifact-1", "legacy-1", 3)).toBe(
      "message-1-tool-artifact-1",
    );
  });

  test("supports legacy identifiers", () => {
    expect(createToolArtifactKey("message-1", undefined, "legacy-1", 3)).toBe(
      "message-1-tool-legacy-1",
    );
  });

  test("uses a deterministic position fallback", () => {
    const first = createToolArtifactKey("message-1", undefined, undefined, 3);
    const second = createToolArtifactKey("message-1", undefined, undefined, 3);

    expect(first).toBe("message-1-tool-item-3");
    expect(second).toBe(first);
  });
});
