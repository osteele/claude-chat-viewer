import { Calendar, ChevronLeft, PanelLeft, PanelLeftClose, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { findSearchMatches, type SearchMatch } from "../lib/searchUtils";
import type { ChatData } from "../schemas/chat";

interface MasterDetailViewProps {
  conversations: ChatData[];
  selectedConversation: ChatData | null;
  onSelectConversation: (conversation: ChatData) => void;
  onBack: () => void;
  children: React.ReactNode;
}

export const MasterDetailView: React.FC<MasterDetailViewProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onBack,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"title" | "full">("full");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    // Check initial size
    handleResize();

    // Listen for resize events
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Filter conversations and get search matches
  const { filteredConversations, searchMatches } = (() => {
    // Sort conversations by updated_at in descending order (newest first)
    const sortedConversations = [...conversations].sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    if (!searchQuery.trim()) {
      return { filteredConversations: sortedConversations, searchMatches: new Map() };
    }

    const matchesMap = new Map<string, SearchMatch[]>();

    const filtered = sortedConversations.filter((conversation) => {
      try {
        let searchPattern: RegExp | string;

        if (useRegex) {
          searchPattern = new RegExp(searchQuery, caseSensitive ? "" : "i");
        } else {
          searchPattern = caseSensitive ? searchQuery : searchQuery.toLowerCase();
        }

        if (searchMode === "title") {
          const title = conversation.name || "Untitled Conversation";
          const summary = conversation.summary || "";
          const searchText = `${title} ${summary}`;

          if (useRegex) {
            return (searchPattern as RegExp).test(searchText);
          }
          const normalizedText = caseSensitive ? searchText : searchText.toLowerCase();
          return normalizedText.includes(searchPattern as string);
        }
        const title = conversation.name || "Untitled Conversation";
        const summary = conversation.summary || "";

        const messagesText = conversation.chat_messages
          .map((msg) => {
            return msg.content
              .map((item) => {
                if (item.type === "text") {
                  return item.text;
                }
                return "";
              })
              .join(" ");
          })
          .join(" ");

        const fullText = `${title} ${summary} ${messagesText}`;

        if (useRegex) {
          const hasMatch = (searchPattern as RegExp).test(fullText);
          if (hasMatch && searchMode === "full") {
            const matches = findSearchMatches(conversation, searchQuery, useRegex, caseSensitive);
            if (matches.length > 0) {
              matchesMap.set(conversation.uuid, matches);
            }
          }
          return hasMatch;
        }
        const normalizedText = caseSensitive ? fullText : fullText.toLowerCase();
        const hasMatch = normalizedText.includes(searchPattern as string);
        if (hasMatch && searchMode === "full") {
          const matches = findSearchMatches(conversation, searchQuery, useRegex, caseSensitive);
          if (matches.length > 0) {
            matchesMap.set(conversation.uuid, matches);
          }
        }
        return hasMatch;
      } catch (error) {
        if (useRegex) {
          console.error("Invalid regex pattern:", error);
          return false;
        }
        return false;
      }
    });

    return { filteredConversations: filtered, searchMatches: matchesMap };
  })();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-0" : "w-full md:w-96"} ${
          sidebarCollapsed ? "" : "absolute md:relative z-20"
        } transition-all duration-300 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden flex flex-col h-full`}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <Button onClick={onBack} variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Input
            </Button>
            <Button
              onClick={() => setSidebarCollapsed(true)}
              variant="ghost"
              size="sm"
              className="md:hidden"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-sm text-gray-900">
              Conversations ({filteredConversations.length} of {conversations.length})
            </h2>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={useRegex ? "Enter regex..." : "Search..."}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Search Options */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="searchMode"
                    value="title"
                    checked={searchMode === "title"}
                    onChange={(e) => setSearchMode(e.target.value as "title" | "full")}
                    className="w-3 h-3"
                  />
                  <span>Title</span>
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
                  <span>Full Text</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRegex}
                    onChange={(e) => setUseRegex(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300"
                  />
                  <span>Regex</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300"
                  />
                  <span>Case</span>
                </label>
              </div>
            </div>

            {/* Regex error */}
            {useRegex &&
              searchQuery &&
              (() => {
                try {
                  new RegExp(searchQuery);
                  return null;
                } catch (e) {
                  return (
                    <div className="text-xs text-red-600">
                      Invalid regex: {e instanceof Error ? e.message : "Unknown error"}
                    </div>
                  );
                }
              })()}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-gray-500">
              <p className="text-sm">No conversations match</p>
              <p className="text-xs mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.uuid}
                  type="button"
                  className={`text-left w-full px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedConversation?.uuid === conversation.uuid
                      ? "bg-blue-50 border-l-2 border-blue-500"
                      : ""
                  }`}
                  onClick={() => {
                    onSelectConversation(conversation);
                    // Auto-collapse on mobile after selection
                    if (window.innerWidth < 768) {
                      setSidebarCollapsed(true);
                    }
                  }}
                >
                  <h3 className="font-medium text-sm text-gray-900 truncate">
                    {conversation.name || "Untitled Conversation"}
                  </h3>
                  {conversation.summary && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {conversation.summary}
                    </p>
                  )}

                  {/* Show search matches when searching */}
                  {searchQuery && searchMode === "full" && searchMatches.get(conversation.uuid) && (
                    <div className="mt-2 space-y-1">
                      {searchMatches
                        .get(conversation.uuid)
                        ?.slice(0, 1)
                        .map((match: SearchMatch, idx: number) => (
                          <div
                            key={`${conversation.uuid}-match-${idx}`}
                            className="text-xs bg-yellow-50 border border-yellow-100 rounded p-1.5"
                          >
                            <span className="text-gray-500">
                              {match.messageSender === "human" ? "H: " : "C: "}
                            </span>
                            <span className="text-gray-600">{match.before}</span>
                            <span className="bg-yellow-200 font-medium">{match.match}</span>
                            <span className="text-gray-600">{match.after}</span>
                          </div>
                        ))}
                      {searchMatches.get(conversation.uuid)?.length > 1 && (
                        <div className="text-xs text-gray-400 italic pl-1">
                          +{searchMatches.get(conversation.uuid)?.length - 1} more
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(conversation.created_at)}</span>
                    </div>
                    <span>•</span>
                    <span>{conversation.chat_messages.length} messages</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapse/Expand Button for mobile/tablet */}
      {sidebarCollapsed && (
        <Button
          onClick={() => setSidebarCollapsed(false)}
          variant="ghost"
          size="sm"
          className="fixed left-2 top-2 z-10 md:hidden bg-white shadow-md"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Detail View */}
      <div className="flex-1 overflow-y-auto">
        {selectedConversation ? (
          children
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation</p>
              <p className="text-sm">Choose from the list on the left to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
