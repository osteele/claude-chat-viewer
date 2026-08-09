import type { ZodError, ZodIssue } from "zod";
import { type ChatData, ChatDataSchema } from "../schemas/chat";

export type ConversationImportResult =
  | { kind: "conversation"; conversation: ChatData }
  | { kind: "collection"; conversations: ChatData[]; warning?: string }
  | { kind: "error"; message: string };

interface InvalidConversation {
  index: number;
  name: string;
  error: ZodError;
}

type UnionIssueLike = ZodIssue & {
  unionErrors?: Array<{ issues?: ZodIssue[]; errors?: ZodIssue[] }>;
  errors?: ZodIssue[][];
};

function flattenIssue(issue: ZodIssue): ZodIssue[] {
  if (issue.code !== "invalid_union") return [issue];

  const unionIssue = issue as UnionIssueLike;
  const nested = unionIssue.unionErrors?.flatMap((error) => error.issues ?? error.errors ?? []);
  if (nested?.length) return nested.flatMap(flattenIssue);
  if (unionIssue.errors?.length)
    return unionIssue.errors.flatMap((issues) => issues.flatMap(flattenIssue));
  return [issue];
}

export function formatZodIssues(issues: readonly ZodIssue[], limit = 10): string[] {
  const messages = new Map<string, Set<string>>();

  issues.flatMap(flattenIssue).forEach((issue) => {
    const path = issue.path.join(".");
    const message = issue.message === "Invalid input" ? "Invalid data format" : issue.message;
    const key = path || "Conversation";
    const current = messages.get(key) ?? new Set<string>();
    current.add(message);
    messages.set(key, current);
  });

  const lines = Array.from(messages.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, values]) => `  - ${path}: ${Array.from(values).join(", ")}`);

  if (lines.length <= limit) return lines;
  return [...lines.slice(0, limit), `  - ... and ${lines.length - limit} more error paths`];
}

function conversationName(value: unknown, index: number): string {
  if (value && typeof value === "object" && "name" in value && typeof value.name === "string") {
    return value.name;
  }
  return `Conversation ${index + 1}`;
}

function issueSection(invalid: InvalidConversation[], maxConversations = 3): string[] {
  const lines: string[] = [];
  invalid.slice(0, maxConversations).forEach(({ name, error }) => {
    lines.push(`\n• ${name}:`);
    lines.push(...formatZodIssues(error.issues, 4));
  });
  if (invalid.length > maxConversations) {
    lines.push(`\n... and ${invalid.length - maxConversations} more conversations with errors`);
  }
  return lines;
}

function bugReportHelp(): string[] {
  return [
    "\n🐛 Unexpected error?",
    "If this file was downloaded directly from Claude's export feature:",
    "1. Check existing issues: https://github.com/osteele/claude-chat-viewer/issues",
    "2. Report new issue: https://github.com/osteele/claude-chat-viewer/issues/new",
  ];
}

function partialWarning(total: number, valid: ChatData[], invalid: InvalidConversation[]): string {
  return [
    `❌ Partially loaded: ${valid.length} of ${total} conversations were valid.`,
    `${invalid.length} conversation(s) had validation errors and were skipped:`,
    ...issueSection(invalid),
    ...bugReportHelp(),
  ].join("\n");
}

function invalidCollectionError(total: number, invalid: InvalidConversation[]): string {
  return [
    `❌ No valid conversations found (0 of ${total} conversations could be loaded).`,
    ...issueSection(invalid),
    "\n💡 This might be a corrupted, incomplete, or incompatible Claude export.",
    ...bugReportHelp(),
  ].join("\n");
}

export function importConversationData(data: unknown): ConversationImportResult {
  if (!Array.isArray(data)) {
    const result = ChatDataSchema.safeParse(data);
    if (result.success) return { kind: "conversation", conversation: result.data };
    return {
      kind: "error",
      message: [
        "❌ This file cannot be loaded due to validation errors:",
        ...formatZodIssues(result.error.issues),
        ...bugReportHelp(),
      ].join("\n"),
    };
  }

  if (data.length === 0) return { kind: "error", message: "JSON array is empty." };

  const valid: ChatData[] = [];
  const invalid: InvalidConversation[] = [];
  data.forEach((conversation, index) => {
    const result = ChatDataSchema.safeParse(conversation);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        name: conversationName(conversation, index),
        error: result.error,
      });
    }
  });

  if (valid.length === 0) {
    return { kind: "error", message: invalidCollectionError(data.length, invalid) };
  }
  if (valid.length === 1 && invalid.length === 0) {
    return { kind: "conversation", conversation: valid[0] };
  }
  return {
    kind: "collection",
    conversations: valid,
    warning: invalid.length ? partialWarning(data.length, valid, invalid) : undefined,
  };
}

export function condenseImportWarning(warning: string): string {
  const lines = warning.split("\n");
  const summary = lines.find((line) => line.startsWith("❌"));
  const count = lines.find((line) => line.includes("conversation(s) had validation errors"));
  const firstConversation = lines.findIndex((line) => line.startsWith("• "));
  const bugReport = lines.findIndex((line) => line.includes("🐛 Unexpected error?"));
  const result = [summary, count].filter((line): line is string => Boolean(line));

  if (firstConversation >= 0) {
    result.push("", ...lines.slice(firstConversation, firstConversation + 4).filter(Boolean));
  }
  if (lines.filter((line) => line.startsWith("• ")).length > 1) {
    result.push("", "[More errors hidden — copy the error for full details]");
  }
  if (bugReport >= 0) result.push("", ...lines.slice(bugReport, bugReport + 4).filter(Boolean));
  return result.join("\n");
}
