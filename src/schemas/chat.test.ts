import { describe, test, expect } from "bun:test";
import { ChatDataSchema } from "./chat";
import fs from "node:fs";
import path from "node:path";

describe("ChatDataSchema", () => {
  test("should parse conversation with artifacts format", () => {
    const filePath = path.join(process.cwd(), "testdata", "conversation-with-artifacts.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    const result = ChatDataSchema.safeParse(data);

    if (!result.success) {
      console.error("Validation errors:", result.error.errors);
    }

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.uuid).toBe("00000000-0000-0000-0000-000000000001");
      expect(result.data.name).toBe("Test Conversation with Artifacts");
      expect(result.data.chat_messages).toBeArrayOfSize(2);

      // Check that tool_use artifacts are parsed correctly
      const assistantMessages = result.data.chat_messages.filter(m => m.sender === "assistant");
      const toolUseContent = assistantMessages.flatMap(m => m.content.filter(c => c.type === "tool_use"));

      expect(toolUseContent.length).toBeGreaterThan(0);

      const firstArtifact = toolUseContent[0];
      expect(firstArtifact.name).toBe("artifacts");
      expect(firstArtifact.input.id).toBe("test-function-001");
      expect(firstArtifact.input.type).toBe("application/vnd.ant.code");
      expect(firstArtifact.input.title).toBe("Simple Test Function");
    }
  });

  test("should parse conversations.json format", () => {
    // Use inline test data instead of external file
    const testConversation = {
      "uuid": "test-conv-001",
      "name": "Test Conversation",
      "created_at": "2024-11-23T01:53:08.894111Z",
      "updated_at": "2024-11-23T01:53:18.534555Z",
      "account": {
        "uuid": "test-account-001"
      },
      "chat_messages": [
        {
          "uuid": "msg-001",
          "text": "Test question",
          "content": [
            {
              "type": "text",
              "text": "Test question",
              "start_timestamp": null,
              "stop_timestamp": null,
              "citations": []
            }
          ],
          "sender": "human",
          "created_at": "2024-11-23T01:53:16.665830Z",
          "updated_at": "2024-11-23T01:53:16.665830Z",
          "attachments": [],
          "files": []
        },
        {
          "uuid": "msg-002",
          "text": "Test response",
          "content": [
            {
              "type": "text",
              "text": "Test response",
              "start_timestamp": null,
              "stop_timestamp": null,
              "citations": []
            }
          ],
          "sender": "assistant",
          "created_at": "2024-11-23T01:53:16.665830Z",
          "updated_at": "2024-11-23T01:53:16.665830Z",
          "attachments": [],
          "files": []
        }
      ]
    };

    const result = ChatDataSchema.safeParse(testConversation);

    if (!result.success) {
      console.error("Validation errors:", result.error.errors);
    }

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.uuid).toBeTruthy();
      expect(result.data.name).toBeTruthy();
      expect(result.data.chat_messages).toBeArray();

      // Check that messages have the expected structure
      result.data.chat_messages.forEach(message => {
        expect(message.uuid).toBeTruthy();
        expect(message.sender).toMatch(/^(human|assistant)$/);
        expect(message.content).toBeArray();
      });
    }
  });
});