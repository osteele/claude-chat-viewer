import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, Clock } from "lucide-react";
import { ChatData } from "../schemas/chat";

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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Button onClick={onBack} variant="outline" className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Input
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          Select Conversation ({conversations.length} found)
        </h1>
        <p className="text-gray-600 mt-1">
          Choose a conversation to view from your exported file
        </p>
      </div>

      <div className="grid gap-4">
        {conversations.map((conversation) => (
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
        ))}
      </div>
    </div>
  );
};