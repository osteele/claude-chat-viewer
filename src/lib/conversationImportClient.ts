import { type ConversationImportResult, importConversationData } from "./conversationImport";

export const IMPORT_WORKER_THRESHOLD = 1_000_000;

function parseOnMainThread(text: string): ConversationImportResult {
  try {
    return importConversationData(JSON.parse(text));
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON",
    };
  }
}

export function importConversationText(text: string): Promise<ConversationImportResult> {
  if (text.length < IMPORT_WORKER_THRESHOLD || typeof Worker === "undefined") {
    return Promise.resolve(parseOnMainThread(text));
  }

  return new Promise((resolve) => {
    const worker = new Worker(new URL("../workers/conversationImport.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<ConversationImportResult>) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      resolve({ kind: "error", message: `Unable to process the export: ${event.message}` });
    };
    worker.postMessage(text);
  });
}
