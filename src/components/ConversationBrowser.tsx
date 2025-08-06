import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, Clock, Search, X } from "lucide-react";
import { ChatData } from "../schemas/chat";
import { useState, useMemo } from "react";

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
  const [searchMode, setSearchMode] = useState<"title" | "full">("title");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  
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

  // Filter conversations based on search criteria
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      try {
        let searchPattern: RegExp | string;
        
        if (useRegex) {
          // Use regex search
          searchPattern = new RegExp(searchQuery, caseSensitive ? "" : "i");
        } else {
          // Use plain text search
          searchPattern = caseSensitive ? searchQuery : searchQuery.toLowerCase();
        }

        if (searchMode === "title") {
          // Search only in title and summary
          const title = conversation.name || "Untitled Conversation";
          const summary = conversation.summary || "";
          const searchText = `${title} ${summary}`;
          
          if (useRegex) {
            return (searchPattern as RegExp).test(searchText);
          } else {
            const normalizedText = caseSensitive ? searchText : searchText.toLowerCase();
            return normalizedText.includes(searchPattern as string);
          }
        } else {
          // Search in full conversation text
          const title = conversation.name || "Untitled Conversation";
          const summary = conversation.summary || "";
          
          // Build full text from all messages
          const messagesText = conversation.chat_messages
            .map(msg => {
              // Extract text from content items
              return msg.content
                .map(item => {
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
            return (searchPattern as RegExp).test(fullText);
          } else {
            const normalizedText = caseSensitive ? fullText : fullText.toLowerCase();
            return normalizedText.includes(searchPattern as string);
          }
        }
      } catch (error) {
        // Handle invalid regex
        if (useRegex) {
          console.error("Invalid regex pattern:", error);
          return false;
        }
        return false;
      }
    });
  }, [conversations, searchQuery, searchMode, useRegex, caseSensitive]);

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
        <p className="text-gray-600 mt-1">
          Choose a conversation to view from your exported file
        </p>
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
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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

        {/* Show regex error if pattern is invalid */}
        {useRegex && searchQuery && (() => {
          try {
            new RegExp(searchQuery);
            return null;
          } catch (e) {
            return (
              <div className="text-sm text-red-600">
                Invalid regex pattern: {e instanceof Error ? e.message : "Unknown error"}
              </div>
            );
          }
        })()}
      </div>

      <div className="grid gap-4">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No conversations match your search criteria</p>
            <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
          <div
            key={conversation.uuid}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-colors cursor-pointer"
            onClick={() => handleSelectConversation(conversation)}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {conversation.name || "Untitled Conversation"}
                </h3>
                {conversation.summary && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {conversation.summary}
                  </p>
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
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
};