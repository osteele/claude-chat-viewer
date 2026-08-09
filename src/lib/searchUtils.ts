import type { ChatData } from "../schemas/chat";

export type SearchMode = "title" | "full";

export interface SearchMatch {
  text: string;
  before: string;
  match: string;
  after: string;
  messageIndex: number;
  messageSender: "human" | "assistant";
}

export interface ConversationSearchDocument {
  title: string;
  full: string;
}

export interface ConversationSearchOptions {
  query: string;
  mode: SearchMode;
  useRegex: boolean;
  caseSensitive: boolean;
}

export interface ConversationSearchResult {
  conversations: ChatData[];
  matches: Map<string, SearchMatch[]>;
  error: string | null;
}

export interface SearchTextSegment {
  text: string;
  isMatch: boolean;
}

const CONTEXT_LENGTH = 50;

function messageText(conversation: ChatData): string {
  return conversation.chat_messages
    .flatMap((message) => message.content.map((item) => (item.type === "text" ? item.text : "")))
    .join(" ");
}

export function createConversationSearchIndex(
  conversations: ChatData[],
): Map<string, ConversationSearchDocument> {
  return new Map(
    conversations.map((conversation) => {
      const title = `${conversation.name || "Untitled Conversation"} ${conversation.summary || ""}`;
      return [conversation.uuid, { title, full: `${title} ${messageText(conversation)}` }];
    }),
  );
}

function createPattern(query: string, useRegex: boolean, caseSensitive: boolean): RegExp {
  const source = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(source, caseSensitive ? "g" : "gi");
}

export function splitSearchText(
  text: string,
  query: string,
  useRegex = false,
  caseSensitive = false,
): SearchTextSegment[] {
  if (!query.trim()) return [{ text, isMatch: false }];

  let pattern: RegExp;
  try {
    pattern = createPattern(query, useRegex, caseSensitive);
  } catch {
    return [{ text, isMatch: false }];
  }

  const segments: SearchTextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const matchText = match[0];
    const matchIndex = match.index ?? 0;
    if (!matchText) continue;
    if (matchIndex > cursor) {
      segments.push({ text: text.slice(cursor, matchIndex), isMatch: false });
    }
    segments.push({ text: matchText, isMatch: true });
    cursor = matchIndex + matchText.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), isMatch: false });

  return segments.length ? segments : [{ text, isMatch: false }];
}

export function findSearchMatches(
  conversation: ChatData,
  searchQuery: string,
  useRegex = false,
  caseSensitive = false,
  maxMatches = 3,
): SearchMatch[] {
  if (!searchQuery.trim()) return [];

  const pattern = createPattern(searchQuery, useRegex, caseSensitive);
  const matches: SearchMatch[] = [];

  conversation.chat_messages.forEach((message, messageIndex) => {
    if (matches.length >= maxMatches) return;

    message.content.forEach((item) => {
      if (matches.length >= maxMatches || item.type !== "text") return;

      for (const match of item.text.matchAll(pattern)) {
        if (matches.length >= maxMatches) break;
        const matchIndex = match.index ?? 0;
        const matchText = match[0];
        const beforeStart = Math.max(0, matchIndex - CONTEXT_LENGTH);
        const afterEnd = Math.min(item.text.length, matchIndex + matchText.length + CONTEXT_LENGTH);
        const before = item.text.slice(beforeStart, matchIndex);
        const after = item.text.slice(matchIndex + matchText.length, afterEnd);

        matches.push({
          text: item.text,
          before: beforeStart > 0 ? `...${before}` : before,
          match: matchText,
          after: afterEnd < item.text.length ? `${after}...` : after,
          messageIndex,
          messageSender: message.sender,
        });
      }
    });
  });

  return matches;
}

export function searchConversations(
  conversations: ChatData[],
  index: Map<string, ConversationSearchDocument>,
  options: ConversationSearchOptions,
): ConversationSearchResult {
  const query = options.query.trim();
  if (!query) return { conversations, matches: new Map(), error: null };

  let pattern: RegExp;
  try {
    pattern = createPattern(query, options.useRegex, options.caseSensitive);
  } catch (error) {
    return {
      conversations: [],
      matches: new Map(),
      error: error instanceof Error ? error.message : "Invalid regular expression",
    };
  }

  const matches = new Map<string, SearchMatch[]>();
  const filtered = conversations.filter((conversation) => {
    const document = index.get(conversation.uuid);
    if (!document) return false;
    pattern.lastIndex = 0;
    const matched = pattern.test(document[options.mode]);
    if (matched && options.mode === "full") {
      matches.set(
        conversation.uuid,
        findSearchMatches(conversation, query, options.useRegex, options.caseSensitive),
      );
    }
    return matched;
  });

  return { conversations: filtered, matches, error: null };
}
