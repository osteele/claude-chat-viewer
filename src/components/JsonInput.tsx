import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Instructions from "../content/instructions.mdx";
import { ChatData, ChatDataSchema } from "../schemas/chat";
import { formatValidationErrors } from "../lib/utils";

const STORAGE_KEY = "chat-viewer-json";

type ConversationOption = {
  name: string;
  uuid: string;
  data: ChatData;
};

interface JsonInputProps {
  onValidJson: (data: ChatData) => void;
}

export const JsonInput: React.FC<JsonInputProps> = ({ onValidJson }) => {
  const [jsonText, setJsonText] = useState(
    sessionStorage.getItem(STORAGE_KEY) || ""
  );
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, jsonText);
  }, [jsonText]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(
          `Invalid JSON: ${err.message}. Please check your JSON syntax.`
        );
      }
      throw new Error("Failed to parse JSON");
    }

    // Handle array of conversations
    if (Array.isArray(parsedData)) {
      switch (parsedData.length) {
        case 0:
          setError("JSON array is empty.");
          return;
        case 1:
          // Singleton array
          parsedData = parsedData[0];
          break;
        default:
          // Validate each conversation in the array
          const validConversations = parsedData
            .map((conversation) => ChatDataSchema.safeParse(conversation))
            .filter((result) => result.success)
            .map((result) => result.data);

          if (validConversations.length !== parsedData.length) {
            console.info(
              `${validConversations.length} out of ${parsedData.length} conversations are valid`
            );
            for (const conversation of parsedData) {
              const result = ChatDataSchema.safeParse(conversation);
              if (!result.success) {
                const index = parsedData.indexOf(conversation);
                const errors = result.error.errors.map((err) => ({
                  path: err.path.join("."),
                  message: err.message,
                }));
                console.error(
                  `Conversation #${
                    index + 1
                  } is invalid:\n${formatValidationErrors(
                    JSON.stringify(conversation, null, 2),
                    errors
                  )}`
                );
              }
            }
            setError("The JSON is not an array of valid conversations.");
            return;
          }

          // Show options if multiple valid conversations
          setOptions(
            validConversations.map((conversation) => ({
              name: conversation.name || "Untitled Conversation",
              uuid: conversation.uuid,
              data: conversation,
            }))
          );
          setError(null);
          return;
      }
    }

    // Single conversation object
    const result = ChatDataSchema.safeParse(parsedData);
    if (result.success) {
      localStorage.setItem(STORAGE_KEY, jsonText);
      onValidJson(result.data);
      setError(null);
      setOptions([]);
    } else {
      const errors = result.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      setError(formatValidationErrors(jsonText, errors));
    }
  };

  const selectConversation = (option: ConversationOption) => {
    onValidJson(option.data);
    setOptions([]);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, jsonText);
  }, [jsonText]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Instructions Panel */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 h-fit">
          <div className="text-sm text-gray-700 prose prose-sm leading-relaxed">
            <Instructions />
          </div>
        </div>
      </div>

      {/* Input Panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">JSON Input</h3>
            <p className="text-xs text-gray-500 mt-1">
              Paste your Claude chat export here
            </p>
          </div>
          <textarea
            className="w-full h-96 p-4 font-mono text-sm border-0 focus:ring-2 focus:ring-blue-500 resize-none"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste JSON here..."
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap font-mono text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {options.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm font-medium">
              Multiple conversations found. Please select one:
            </div>
            <div className="grid gap-2">
              {options.map((option) => (
                <Button
                  key={option.uuid}
                  onClick={() => selectConversation(option)}
                  variant="outline"
                  className="justify-start text-left h-auto p-4"
                >
                  <div className="truncate">{option.name}</div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Button onClick={handleSubmit} className="w-full h-12 text-base">
            Load Conversation
          </Button>
        )}
      </div>
    </div>
  );
};
