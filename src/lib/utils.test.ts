import { expect, describe, it } from "bun:test";
import { formatValidationErrors, chatToText, chatToHtml } from "./utils";
import { ChatData } from "../schemas/chat";

describe.skip("formatValidationErrors", () => {
  it("should add line numbers to validation errors", () => {
    const json = `{
  "name": "Test Chat",
  "chat_messages": [
    {
      "uuid": "msg1",
      "sender": "human",
      "content": [
        {
          "type": "text",
          "text": "Hello"
        }
      ]
    },
    {
      "uuid": "msg2",
      "sender": "assistant",
      "content": [
        {
          "type": "wrong_type",
          "missing_text": "Hi"
        }
      ]
    }
  ]
}`;

    const errors = [
      {
        path: "chat_messages.1.content.0.type",
        message: 'Invalid literal value, expected "text"',
      },
      {
        path: "chat_messages.1.content.0.text",
        message: "Required",
      },
    ];

    const result = formatValidationErrors(json, errors);
    expect(result).toContain("(line 13)"); // line number for type
    expect(result).toContain("(line 14)"); // line number for text
  });
});

describe("chatToText", () => {
  it("should convert chat to plain text", () => {
    const chat: ChatData = {
      name: "Test Chat",
      uuid: "test-uuid",
      summary: "",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      settings: {
        preview_feature_uses_artifacts: false,
        preview_feature_uses_latex: false,
        enabled_artifacts_attachments: false,
      },
      is_starred: false,
      current_leaf_message_uuid: "msg2",
      chat_messages: [
        {
          uuid: "msg1",
          sender: "human",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          index: 0,
          text: "Hello\nHow are you?",
          truncated: false,
          content: [{ type: "text", text: "Hello\nHow are you?" }],
        },
        {
          uuid: "msg2",
          sender: "assistant",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          index: 1,
          text: "I'm *fine*, thank you!\n```python\nprint('hi')\n```",
          truncated: false,
          content: [
            {
              type: "text",
              text: "I'm *fine*, thank you!\n```python\nprint('hi')\n```",
            },
          ],
        },
      ],
    };

    const result = chatToText(chat);
    expect(result).toBe(
      "Human:\nHello\nHow are you?\n\nClaude:\nI'm fine, thank you!\nprint('hi')\n"
    );
  });
});

describe("chatToHtml", () => {
  it("should convert chat to HTML with formatting", () => {
    const chat: ChatData = {
      name: "Test Chat",
      uuid: "test-uuid",
      summary: "",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      settings: {
        preview_feature_uses_artifacts: false,
        preview_feature_uses_latex: false,
        enabled_artifacts_attachments: false,
      },
      is_starred: false,
      current_leaf_message_uuid: "msg2",
      chat_messages: [
        {
          uuid: "msg1",
          sender: "human",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          index: 0,
          text: "Hello\nHow are you?",
          truncated: false,
          content: [{ type: "text", text: "Hello\nHow are you?" }],
        },
        {
          uuid: "msg2",
          sender: "assistant",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          index: 1,
          text: "I'm *fine*, thank you!\n```python\nprint('hi')\n```",
          truncated: false,
          content: [
            {
              type: "text",
              text: "I'm *fine*, thank you!\n```python\nprint('hi')\n```",
            },
          ],
        },
      ],
    };

    const result = chatToHtml(chat);
    expect(result).toContain("<strong>Human:</strong>");
    expect(result).toContain("<em>fine</em>");
    expect(result).toContain('<pre class="language-python">');
    expect(result).toContain('<code class="language-python">');
  });
});

describe.skip("buildLineMap", () => {
  it("should correctly map JSON paths to line numbers", () => {
    const json = `{
  "chat_messages": [
    {
      "content": [
        {
          "type": "text",
          "text": "hello"
        }
      ]
    }
  ]
}`;

    const errors = [
      {
        path: "chat_messages.0.content.0.type",
        message: "test error",
      },
    ];

    const result = formatValidationErrors(json, errors);
    expect(result).toContain("(line 5)");
  });

  it("should handle nested arrays and objects", () => {
    const json = `{
  "chat_messages": [
    {
      "content": [
        {
          "type": "wrong",
          "missing": "text"
        },
        {
          "also": "wrong"
        }
      ]
    }
  ]
}`;

    const errors = [
      {
        path: "chat_messages.0.content.0.type",
        message: "Invalid type",
      },
      {
        path: "chat_messages.0.content.1.type",
        message: "Missing type",
      },
    ];

    const result = formatValidationErrors(json, errors);
    expect(result).toContain("(line 6)");
    expect(result).toContain("(line 9)");
  });
});
