import { Calendar, ChevronLeft, Clock, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConversationSearch } from "../hooks/useConversationSearch";
import type { SearchMatch } from "../lib/searchUtils";
import type { ChatData } from "../schemas/chat";
import type { SortField, SortOrder } from "../utils/sorting";
import { SearchHighlight } from "./SearchHighlight";

interface ConversationBrowserProps {
  conversations: ChatData[];
  onSelectConversation: (conversation: ChatData) => void;
  onBack: () => void;
}

export const ConversationBrowser: React.FC<ConversationBrowserProps> = ({
  conversations,
  onSelectConversation,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"title" | "full">("full");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleSelectConversation = (conversation: ChatData) => {
    onSelectConversation(conversation);
  };

  const { filteredConversations, searchMatches, searchError, isSearchPending } =
    useConversationSearch(conversations, {
      searchQuery,
      searchMode,
      useRegex,
      caseSensitive,
      sortField,
      sortOrder,
    });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Button onClick={onBack} variant="outline" className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Input
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          Select Conversation ({filteredConversations.length} of {conversations.length} shown)
        </h1>
        <p className="text-gray-600 mt-1">Choose a conversation to view from your exported file</p>
      </div>

      {/* Search/Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={useRegex ? "Enter regex pattern..." : "Search conversations..."}
            aria-invalid={searchError ? true : undefined}
            aria-busy={isSearchPending}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchError && <p className="text-sm text-red-600">Invalid regex: {searchError}</p>}

        <div className="flex flex-wrap gap-4 items-center">
          {/* Search Mode */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Search in:</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="searchMode"
                  value="title"
                  checked={searchMode === "title"}
                  onChange={(e) => setSearchMode(e.target.value as "title" | "full")}
                  className="w-3 h-3"
                />
                <span className="text-sm">Title & Summary</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="searchMode"
                  value="full"
                  checked={searchMode === "full"}
                  onChange={(e) => setSearchMode(e.target.value as "title" | "full")}
                  className="w-3 h-3"
                />
                <span className="text-sm">Full Text</span>
              </label>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Regex</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Case Sensitive</span>
            </label>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="sortField"
              value="created_at"
              checked={sortField === "created_at"}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-3 h-3"
            />
            <span className="text-sm">Created Date</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="sortField"
              value="updated_at"
              checked={sortField === "updated_at"}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-3 h-3"
            />
            <span className="text-sm">Modified Date</span>
          </label>
        </div>
        <span className="text-gray-300">|</span>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="sortOrder"
              value="desc"
              checked={sortOrder === "desc"}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="w-3 h-3"
            />
            <span className="text-sm">Newest First</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="sortOrder"
              value="asc"
              checked={sortOrder === "asc"}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="w-3 h-3"
            />
            <span className="text-sm">Oldest First</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No conversations match your search criteria</p>
            <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <button
              key={conversation.uuid}
              type="button"
              style={{ contentVisibility: "auto", containIntrinsicSize: "auto 140px" }}
              className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-colors cursor-pointer"
              onClick={() => handleSelectConversation(conversation)}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    <SearchHighlight
                      text={conversation.name || "Untitled Conversation"}
                      query={searchQuery}
                      useRegex={useRegex}
                      caseSensitive={caseSensitive}
                    />
                  </h3>
                  {conversation.summary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      <SearchHighlight
                        text={conversation.summary}
                        query={searchQuery}
                        useRegex={useRegex}
                        caseSensitive={caseSensitive}
                      />
                    </p>
                  )}

                  {/* Show search matches when searching */}
                  {searchQuery && searchMode === "full" && searchMatches.get(conversation.uuid) && (
                    <div className="mt-2 space-y-1">
                      {searchMatches
                        .get(conversation.uuid)
                        ?.slice(0, 2)
                        .map((match: SearchMatch, idx: number) => (
                          <div
                            key={`${conversation.uuid}-match-${idx}`}
                            className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2"
                          >
                            <div className="text-gray-500 mb-1">
                              {match.messageSender === "human" ? "Human" : "Claude"}:
                            </div>
                            <div className="text-gray-700">
                              <span>{match.before}</span>
                              <span className="bg-yellow-200 font-medium">{match.match}</span>
                              <span>{match.after}</span>
                            </div>
                          </div>
                        ))}
                      {(searchMatches.get(conversation.uuid)?.length ?? 0) > 2 && (
                        <div className="text-xs text-gray-500 italic">
                          ...and {(searchMatches.get(conversation.uuid)?.length ?? 0) - 2} more
                          matches
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {formatDate(conversation.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Modified: {formatDate(conversation.updated_at)}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {conversation.chat_messages.length} message
                    {conversation.chat_messages.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <span>View</span>
                </Button>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
