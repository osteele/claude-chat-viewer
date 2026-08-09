import { describe, expect, it } from "bun:test";
import type { ChatData } from "../schemas/chat";
import {
  createConversationSearchIndex,
  findSearchMatches,
  searchConversations,
  splitSearchText,
} from "./searchUtils";

const conversation: ChatData = {
  uuid: "conversation-1",
  name: "Release Notes",
  summary: "A project update",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
  chat_messages: [
    {
      uuid: "message-1",
      sender: "human",
      text: "Where is the report?",
      content: [{ type: "text", text: "Where is the quarterly report?" }],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      index: 0,
      truncated: false,
    },
  ],
};

describe("conversation search", () => {
  it("searches precomputed full-text documents", () => {
    const index = createConversationSearchIndex([conversation]);
    const result = searchConversations([conversation], index, {
      query: "quarterly",
      mode: "full",
      useRegex: false,
      caseSensitive: false,
    });

    expect(result.error).toBeNull();
    expect(result.conversations).toEqual([conversation]);
    expect(result.matches.get(conversation.uuid)?.[0].match).toBe("quarterly");
  });

  it("reports invalid regular expressions without throwing", () => {
    const result = searchConversations(
      [conversation],
      createConversationSearchIndex([conversation]),
      {
        query: "[",
        mode: "full",
        useRegex: true,
        caseSensitive: false,
      },
    );

    expect(result.conversations).toEqual([]);
    expect(result.error).not.toBeNull();
  });

  it("limits contextual matches", () => {
    expect(findSearchMatches(conversation, "report", false, false, 1)).toHaveLength(1);
  });

  it("segments title and summary matches for highlighting", () => {
    expect(splitSearchText("A project update", "PROJECT")).toEqual([
      { text: "A ", isMatch: false },
      { text: "project", isMatch: true },
      { text: " update", isMatch: false },
    ]);
  });
});
