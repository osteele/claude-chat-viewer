import { ChatData } from "../schemas/chat";

export interface SearchMatch {
  text: string;
  before: string;
  match: string;
  after: string;
  messageIndex: number;
  messageSender: "human" | "assistant";
}

const CONTEXT_LENGTH = 50; // Characters to show before/after match

export function findSearchMatches(
  conversation: ChatData,
  searchQuery: string,
  useRegex: boolean = false,
  caseSensitive: boolean = false,
  maxMatches: number = 3
): SearchMatch[] {
  if (!searchQuery.trim()) {
    return [];
  }

  const matches: SearchMatch[] = [];

  try {
    let searchPattern: RegExp;
    
    if (useRegex) {
      searchPattern = new RegExp(searchQuery, caseSensitive ? "g" : "gi");
    } else {
      // Escape special regex characters for literal search
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchPattern = new RegExp(escapedQuery, caseSensitive ? "g" : "gi");
    }

    conversation.chat_messages.forEach((message, messageIndex) => {
      if (matches.length >= maxMatches) return;

      message.content.forEach((item) => {
        if (matches.length >= maxMatches) return;
        
        if (item.type === "text") {
          const text = item.text;
          const searchMatches = Array.from(text.matchAll(searchPattern));
          
          for (const match of searchMatches) {
            if (matches.length >= maxMatches) break;
            
            const matchIndex = match.index || 0;
            const matchText = match[0];
            
            // Extract context before and after the match
            const beforeStart = Math.max(0, matchIndex - CONTEXT_LENGTH);
            const beforeText = text.substring(beforeStart, matchIndex);
            const beforeContext = beforeStart > 0 ? "..." + beforeText : beforeText;
            
            const afterEnd = Math.min(text.length, matchIndex + matchText.length + CONTEXT_LENGTH);
            const afterText = text.substring(matchIndex + matchText.length, afterEnd);
            const afterContext = afterEnd < text.length ? afterText + "..." : afterText;
            
            matches.push({
              text: text,
              before: beforeContext,
              match: matchText,
              after: afterContext,
              messageIndex,
              messageSender: message.sender,
            });
          }
        }
      });
    });
  } catch (error) {
    console.error("Search error:", error);
  }

  return matches;
}

