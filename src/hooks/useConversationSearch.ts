import { useDeferredValue, useMemo } from "react";
import {
  createConversationSearchIndex,
  type SearchMode,
  searchConversations,
} from "../lib/searchUtils";
import type { ChatData } from "../schemas/chat";
import { type SortField, type SortOrder, sortConversations } from "../utils/sorting";

interface ConversationSearchState {
  searchQuery: string;
  searchMode: SearchMode;
  useRegex: boolean;
  caseSensitive: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
}

export function useConversationSearch(conversations: ChatData[], state: ConversationSearchState) {
  const deferredQuery = useDeferredValue(state.searchQuery);
  const { searchMode, useRegex, caseSensitive, sortField, sortOrder } = state;
  const index = useMemo(() => createConversationSearchIndex(conversations), [conversations]);

  return useMemo(() => {
    const sorted = sortConversations(conversations, sortField, sortOrder);
    const result = searchConversations(sorted, index, {
      query: deferredQuery,
      mode: searchMode,
      useRegex,
      caseSensitive,
    });
    return {
      filteredConversations: result.conversations,
      searchMatches: result.matches,
      searchError: result.error,
      isSearchPending: deferredQuery !== state.searchQuery,
    };
  }, [
    caseSensitive,
    conversations,
    deferredQuery,
    index,
    searchMode,
    sortField,
    sortOrder,
    state.searchQuery,
    useRegex,
  ]);
}
