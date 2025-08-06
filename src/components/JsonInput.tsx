import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Instructions from "../content/instructions.mdx";
import { ChatData, ChatDataSchema } from "../schemas/chat";
import { formatValidationErrors } from "../lib/utils";
import JSZip from "jszip";

const STORAGE_KEY = "chat-viewer-json";
const MAX_CACHE_SIZE = 100000; // Don't cache files larger than ~100KB

type ConversationOption = {
  name: string;
  uuid: string;
  data: ChatData;
};

interface JsonInputProps {
  onValidJson: (data: ChatData) => void;
  onConversationList: (conversations: ChatData[]) => void;
}

export const JsonInput: React.FC<JsonInputProps> = ({
  onValidJson,
  onConversationList,
}) => {
  const [jsonText, setJsonText] = useState(
    sessionStorage.getItem(STORAGE_KEY) || "",
  );
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, jsonText);
  }, [jsonText]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const processJsonData = (data: any, skipCaching = false) => {
    // Handle array of conversations
    if (Array.isArray(data)) {
      if (data.length === 0) {
        setError("JSON array is empty.");
        return;
      }

      // Validate each conversation in the array as ChatData
      const validConversations = data
        .map((conversation: any) => ChatDataSchema.safeParse(conversation))
        .filter((result: any) => result.success)
        .map((result: any) => result.data);

      if (validConversations.length > 1) {
        // Multiple valid conversations - show conversation browser
        onConversationList(validConversations);
        setError(null);
        setOptions([]);
        return;
      } else if (validConversations.length === 1) {
        // Single valid conversation - show it directly
        if (!skipCaching && jsonText.length <= MAX_CACHE_SIZE) {
          localStorage.setItem(STORAGE_KEY, jsonText);
        }
        onValidJson(validConversations[0]);
        setError(null);
        setOptions([]);
        return;
      }

      // If we get here, no valid conversations were found
      setError("No valid conversations found in the JSON array.");
      return;
    }

    // Single conversation object
    const result = ChatDataSchema.safeParse(data);
    if (result.success) {
      // Only cache if not skipping and file is reasonably small
      if (!skipCaching && jsonText.length <= MAX_CACHE_SIZE) {
        localStorage.setItem(STORAGE_KEY, jsonText);
      }
      onValidJson(result.data);
      setError(null);
      setOptions([]);
    } else {
      const errors = result.error.errors.map((err: any) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      setError(formatValidationErrors(JSON.stringify(data, null, 2), errors));
    }
  };

  const handleSubmit = () => {
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (err) {
      if (err instanceof Error) {
        setError(
          `Invalid JSON: ${err.message}. Please check your JSON syntax.`,
        );
      } else {
        setError("Failed to parse JSON");
      }
      return;
    }

    processJsonData(parsedData);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Handle ZIP files
    if (file.name.toLowerCase().endsWith(".zip")) {
      try {
        const zip = await JSZip.loadAsync(file);

        // Look for conversations.json in the ZIP
        const conversationsFile = zip.file("conversations.json");

        if (!conversationsFile) {
          setError(
            "No conversations.json found in the ZIP archive. Please make sure you're uploading a Claude export archive.",
          );
          return;
        }

        const content = await conversationsFile.async("string");
        setJsonText(content);

        try {
          const parsedData = JSON.parse(content);
          processJsonData(parsedData, true);
        } catch (err) {
          if (err instanceof Error) {
            setError(`Invalid JSON in ZIP file: ${err.message}`);
          } else {
            setError("Failed to parse conversations.json from ZIP");
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(`Error reading ZIP file: ${err.message}`);
        } else {
          setError("Failed to read ZIP file");
        }
      }
      return;
    }

    // Handle JSON files (existing code)
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setJsonText(content);
        try {
          const parsedData = JSON.parse(content);
          // Skip caching for uploaded files to avoid storage issues with large files
          processJsonData(parsedData, true);
        } catch (err) {
          if (err instanceof Error) {
            setError(`Invalid JSON file: ${err.message}`);
          } else {
            setError("Failed to parse JSON file");
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const selectConversation = (option: ConversationOption) => {
    onValidJson(option.data);
    setOptions([]);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, jsonText);
  }, [jsonText]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Instructions Panel */}
      <div className="lg:col-span-3">
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  JSON Input
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Paste JSON or upload a file (.json or .zip)
                </p>
              </div>
              <Button
                onClick={handleUploadClick}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            </div>
          </div>
          <textarea
            className="w-full h-96 p-4 font-mono text-sm border-0 focus:ring-2 focus:ring-blue-500 resize-none"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste JSON here or click 'Upload File' to select a .json or .zip file..."
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip"
            onChange={handleFileUpload}
            className="hidden"
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
