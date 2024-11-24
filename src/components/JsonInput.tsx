import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Instructions from "../content/instructions.mdx";
import { ChatData, ChatDataSchema } from "../schemas/chat";
import { fromError } from "zod-validation-error";

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
                const validationError = fromError(result.error);
                console.error(
                  `Conversation #${index + 1} is invalid: ${validationError}`
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
      const validationError = fromError(result.error);

      console.error(validationError);
      setError(
        `The following validation errors were found:\n${validationError.toString()}`
      );
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
    <div className="space-y-4">
      <div className="text-sm text-gray-600 prose leading-loose">
        <Instructions />
      </div>

      <textarea
        className="w-full h-96 p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste JSON here..."
      />

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
          <div className="space-y-2">
            {options.map((option) => (
              <Button
                key={option.uuid}
                onClick={() => selectConversation(option)}
                variant="outline"
                className="w-full justify-start text-left"
              >
                {option.name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <Button onClick={handleSubmit} className="w-full">
          Load Conversation
        </Button>
      )}
    </div>
  );
};
