/// <reference lib="webworker" />

import { type ConversationImportResult, importConversationData } from "../lib/conversationImport";

self.onmessage = (event: MessageEvent<string>) => {
  let result: ConversationImportResult;
  try {
    result = importConversationData(JSON.parse(event.data));
  } catch (error) {
    result = {
      kind: "error",
      message: error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON",
    };
  }
  self.postMessage(result);
};
