import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ChatData } from "../schemas/chat";
import { ConversationBrowser } from "./ConversationBrowser";

// Mock data
const mockConversations: ChatData[] = [
  {
    uuid: "conv-1",
    name: "First Conversation",
    created_at: "2024-12-01T12:00:00Z",
    updated_at: "2024-12-01T12:30:00Z",
    account: { uuid: "account-1" },
    chat_messages: [
      {
        uuid: "msg-1",
        index: 0,
        sender: "human",
        content: [{ type: "text", text: "Hello" }],
        text: "Hello",
        created_at: "2024-12-01T12:00:00Z",
        updated_at: "2024-12-01T12:00:00Z",
        truncated: false,
      },
    ],
  },
  {
    uuid: "conv-2",
    name: "Second Conversation",
    created_at: "2024-12-02T10:00:00Z",
    updated_at: "2024-12-02T11:00:00Z",
    account: { uuid: "account-1" },
    chat_messages: [
      {
        uuid: "msg-2",
        index: 0,
        sender: "assistant",
        content: [{ type: "text", text: "Hi there!" }],
        text: "Hi there!",
        created_at: "2024-12-02T10:00:00Z",
        updated_at: "2024-12-02T10:00:00Z",
        truncated: false,
      },
      {
        uuid: "msg-3",
        index: 1,
        sender: "human",
        content: [{ type: "text", text: "How are you?" }],
        text: "How are you?",
        created_at: "2024-12-02T10:30:00Z",
        updated_at: "2024-12-02T10:30:00Z",
        truncated: false,
      },
    ],
  },
];

describe("ConversationBrowser", () => {
  it("renders, filters, and selects conversations", () => {
    const onSelectConversation = mock(() => undefined);
    render(
      <ConversationBrowser
        conversations={mockConversations}
        onSelectConversation={onSelectConversation}
        onBack={() => undefined}
      />,
    );

    expect(screen.getByText("First Conversation")).toBeTruthy();
    expect(screen.getByText("Second Conversation")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search conversations..."), {
      target: { value: "Second" },
    });

    expect(screen.queryByText("First Conversation")).toBeNull();
    expect(screen.getByText("Second", { selector: "mark" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Second Conversation/ }));
    expect(onSelectConversation).toHaveBeenCalledTimes(1);
    expect(onSelectConversation).toHaveBeenCalledWith(mockConversations[1]);
  });

  it("should validate conversation data structure", () => {
    expect(mockConversations).toHaveLength(2);
    expect(mockConversations[0].name).toBe("First Conversation");
    expect(mockConversations[1].name).toBe("Second Conversation");
    expect(mockConversations[0].chat_messages).toHaveLength(1);
    expect(mockConversations[1].chat_messages).toHaveLength(2);
  });

  it("should have proper conversation structure for conversion", () => {
    const conversation = mockConversations[0];

    // Should have all required fields for conversion to ChatData
    expect(conversation.uuid).toBeDefined();
    expect(conversation.name).toBeDefined();
    expect(conversation.created_at).toBeDefined();
    expect(conversation.updated_at).toBeDefined();
    expect(conversation.chat_messages).toBeDefined();
    expect(Array.isArray(conversation.chat_messages)).toBe(true);
  });
});
