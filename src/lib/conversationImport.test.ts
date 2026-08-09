import { describe, expect, it } from "bun:test";
import { condenseImportWarning, importConversationData } from "./conversationImport";

const conversation = {
  uuid: "conversation-1",
  name: "Test",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  chat_messages: [],
};

describe("conversation imports", () => {
  it("normalizes a single conversation", () => {
    const result = importConversationData(conversation);
    expect(result.kind).toBe("conversation");
  });

  it("keeps valid conversations and reports invalid entries", () => {
    const result = importConversationData([conversation, { name: "Broken" }]);
    expect(result.kind).toBe("collection");
    if (result.kind !== "collection") return;
    expect(result.conversations).toHaveLength(1);
    expect(result.warning).toContain("1 of 2 conversations were valid");
    expect(condenseImportWarning(result.warning ?? "")).toContain("Broken");
  });

  it("returns a user-facing error when no conversation is valid", () => {
    const result = importConversationData([{ name: "Broken" }]);
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.message).toContain("No valid conversations");
  });
});
