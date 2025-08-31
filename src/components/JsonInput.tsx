import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Upload, FileJson, Archive, Clipboard, CheckCircle } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [isValidJson, setIsValidJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, jsonText);
  }, [jsonText]);

  // Live JSON validation with debouncing
  const validateJson = useCallback((text: string) => {
    if (!text.trim()) {
      setIsValidJson(false);
      setError(null);
      return;
    }

    try {
      JSON.parse(text);
      setIsValidJson(true);
      setError(null);
    } catch (err) {
      setIsValidJson(false);
      // Only show error for non-empty input after user stops typing
      if (text.trim().length > 10) {
        if (err instanceof Error) {
          const errorMessage = err.message.includes("Unexpected end")
            ? "JSON appears incomplete - keep typing or check for missing brackets"
            : `Syntax error: ${err.message.split(' at position')[0]}`;
          setError(errorMessage);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Set new timeout for validation (debounced)
    validationTimeoutRef.current = setTimeout(() => {
      validateJson(jsonText);
    }, 500);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [jsonText, validateJson]);

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
      const errors = result.error.errors
        .filter((err: any) => err.path.length > 0) // Filter out root-level errors with empty paths
        .map((err: any) => ({
          path: err.path.join("."),
          message: err.message,
        }));
      
      // If we have specific field errors, show them. Otherwise show a generic message
      if (errors.length > 0) {
        setError(formatValidationErrors(JSON.stringify(data, null, 2), errors));
      } else {
        // Check if it's the expected chat format
        if (!data.chat_messages && !data.messages) {
          setError("This doesn't appear to be a Claude conversation. Expected 'chat_messages' or 'messages' field.");
        } else {
          setError("Invalid conversation format. Please check that this is a Claude export.");
        }
      }
    }
  };

  const handleSubmit = () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON data or upload a file first.");
      return;
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.message.includes("Unexpected end")
          ? "The JSON appears to be incomplete. Please check that you've copied the entire content."
          : `Invalid JSON: ${err.message}. Please check your JSON syntax.`;
        setError(errorMessage);
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

  const loadSampleData = () => {
    const timestamp = new Date().toISOString();
    const conversationId = "sample-" + Date.now();
    
    const sampleData = {
      "uuid": conversationId,
      "name": "Sample Conversation: Python Functions",
      "summary": "Discussion about writing Python functions including greetings and factorial calculation",
      "created_at": timestamp,
      "updated_at": timestamp,
      "settings": {
        "preview_feature_uses_artifacts": false,
        "preview_feature_uses_latex": false,
        "enabled_artifacts_attachments": false
      },
      "is_starred": false,
      "current_leaf_message_uuid": "msg-4",
      "conversation_id": conversationId,
      "chat_messages": [
        {
          "uuid": "msg-1",
          "index": 0,
          "sender": "human",
          "text": "Hello! Can you help me write a simple Python function?",
          "content": [{"type": "text", "text": "Hello! Can you help me write a simple Python function?"}],
          "created_at": timestamp,
          "updated_at": timestamp,
          "truncated": false
        },
        {
          "uuid": "msg-2",
          "index": 1,
          "sender": "assistant",
          "text": "Of course! I'd be happy to help you write a Python function. What would you like the function to do? Here's a simple example to get started:\n\n```python\ndef greet(name):\n    \"\"\"\n    A simple function that returns a greeting message.\n    \"\"\"\n    return f\"Hello, {name}! Welcome to Python programming.\"\n\n# Example usage\nprint(greet(\"Alice\"))\n```\n\nThis function takes a name as input and returns a personalized greeting. Would you like me to help you create a different type of function?",
          "content": [{"type": "text", "text": "Of course! I'd be happy to help you write a Python function. What would you like the function to do? Here's a simple example to get started:\n\n```python\ndef greet(name):\n    \"\"\"\n    A simple function that returns a greeting message.\n    \"\"\"\n    return f\"Hello, {name}! Welcome to Python programming.\"\n\n# Example usage\nprint(greet(\"Alice\"))\n```\n\nThis function takes a name as input and returns a personalized greeting. Would you like me to help you create a different type of function?"}],
          "created_at": timestamp,
          "updated_at": timestamp,
          "truncated": false
        },
        {
          "uuid": "msg-3",
          "index": 2,
          "sender": "human",
          "text": "That's great! Can you show me a function that calculates the factorial of a number?",
          "content": [{"type": "text", "text": "That's great! Can you show me a function that calculates the factorial of a number?"}],
          "created_at": timestamp,
          "updated_at": timestamp,
          "truncated": false
        },
        {
          "uuid": "msg-4",
          "index": 3,
          "sender": "assistant",
          "text": "Certainly! Here's a Python function that calculates the factorial of a number:\n\n```python\ndef factorial(n):\n    \"\"\"\n    Calculate the factorial of a non-negative integer.\n    \n    Args:\n        n: A non-negative integer\n    \n    Returns:\n        The factorial of n\n    \"\"\"\n    if n < 0:\n        raise ValueError(\"Factorial is not defined for negative numbers\")\n    elif n == 0 or n == 1:\n        return 1\n    else:\n        result = 1\n        for i in range(2, n + 1):\n            result *= i\n        return result\n\n# Example usage\nprint(factorial(5))  # Output: 120\nprint(factorial(0))  # Output: 1\nprint(factorial(10)) # Output: 3628800\n```\n\nThis iterative version is efficient and easy to understand. The function:\n- Handles edge cases (negative numbers, 0, and 1)\n- Uses a loop to calculate the factorial\n- Includes documentation and examples\n\nWould you like to see a recursive version as well?",
          "content": [{"type": "text", "text": "Certainly! Here's a Python function that calculates the factorial of a number:\n\n```python\ndef factorial(n):\n    \"\"\"\n    Calculate the factorial of a non-negative integer.\n    \n    Args:\n        n: A non-negative integer\n    \n    Returns:\n        The factorial of n\n    \"\"\"\n    if n < 0:\n        raise ValueError(\"Factorial is not defined for negative numbers\")\n    elif n == 0 or n == 1:\n        return 1\n    else:\n        result = 1\n        for i in range(2, n + 1):\n            result *= i\n        return result\n\n# Example usage\nprint(factorial(5))  # Output: 120\nprint(factorial(0))  # Output: 1\nprint(factorial(10)) # Output: 3628800\n```\n\nThis iterative version is efficient and easy to understand. The function:\n- Handles edge cases (negative numbers, 0, and 1)\n- Uses a loop to calculate the factorial\n- Includes documentation and examples\n\nWould you like to see a recursive version as well?"}],
          "created_at": timestamp,
          "updated_at": timestamp,
          "truncated": false
        }
      ]
    };
    
    // Directly load the sample data without using the text area
    setError(null);
    setOptions([]);
    onValidJson(sampleData as ChatData);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      // Trigger validation
      validateJson(text);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API or user denied permission
      setError("Unable to read from clipboard. Please paste manually using Ctrl/Cmd+V.");
    }
  };

  const selectConversation = (option: ConversationOption) => {
    onValidJson(option.data);
    setOptions([]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.zip')) {
        // Create a proper event-like object for handleFileUpload
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const fakeInput = document.createElement('input');
        fakeInput.type = 'file';
        fakeInput.files = dataTransfer.files;
        const fakeEvent = { target: fakeInput } as unknown as React.ChangeEvent<HTMLInputElement>;
        await handleFileUpload(fakeEvent);
      } else {
        setError('Please drop a .json or .zip file');
      }
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, jsonText);
  }, [jsonText]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start gap-4 mb-8">
        <img 
          src={`${import.meta.env.BASE_URL}mascot-transparent.webp`}
          alt="Claude Chat Viewer Mascot" 
          className="h-36 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.onerror = null;
            img.src = `${import.meta.env.BASE_URL}mascot-transparent.png`;
          }}
        />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Claude Chat Viewer</h1>
          <p className="text-gray-600">
            View your Claude conversations in a clean, readable format. Upload your entire Claude archive to browse and search through all your conversations, or paste individual chats for quick viewing.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Choose how to import your conversation:</h2>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="upload" className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Archive className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Upload Archive</div>
                <div className="text-xs opacity-75 hidden sm:block">ZIP or JSON file</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Clipboard className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Paste JSON</div>
                <div className="text-xs opacity-75 hidden sm:block">Single chat</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="sample" className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <FileJson className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Try Sample</div>
                <div className="text-xs opacity-75 hidden sm:block">Demo data</div>
              </div>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Upload Your Claude Export</h2>
              <div className="prose prose-sm text-gray-600">
                <ol className="space-y-2">
                  <li>Get your archive from Claude: <strong>Settings → Account → Request Export</strong></li>
                  <li>When you receive the download link, download and save the ZIP file</li>
                  <li>Upload the ZIP file here to browse all your conversations</li>
                </ol>
                <p className="text-sm mt-4">
                  <strong>Supported files:</strong> ZIP archives from Claude export or conversations.json files
                </p>
              </div>
            </div>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {isDragging ? (
                <div>
                  <Upload className="h-12 w-12 mx-auto text-blue-500 mb-3" />
                  <p className="text-lg font-medium text-blue-600">Drop your file here</p>
                </div>
              ) : (
                <div>
                  <Archive className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">Drag and drop your ZIP or JSON file here</p>
                  <p className="text-gray-500 text-sm mb-4">or</p>
                  <Button onClick={handleUploadClick} className="mx-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  <p className="text-xs text-gray-500 mt-3">
                    Accepts .zip and .json files
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="paste" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Paste Individual Conversation</h2>
              <div className="prose prose-sm text-gray-600">
                <p>Export a single chat from Claude and paste the JSON here.</p>
                <p className="mt-2">
                  See <a href="https://observablehq.com/@simonw/convert-claude-json-to-markdown" 
                    target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Convert Claude JSON to Markdown
                  </a> for instructions on using the browser developer console to extract the JSON for a chat.
                </p>
                <p className="text-sm mt-4">
                  <strong>Tip:</strong> Press Enter to load or use Cmd/Ctrl+V to paste
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className={`border-2 rounded-lg overflow-hidden ${
                isValidJson ? 'border-green-400' : jsonText.trim() && !isValidJson ? 'border-yellow-400' : 'border-gray-200'
              }`}>
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                  <div className="text-sm">
                    {jsonText.trim() ? (
                      <span className="flex items-center gap-2">
                        {isValidJson && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {jsonText.length.toLocaleString()} characters
                        {isValidJson && <span className="text-green-600 font-medium">• Valid JSON</span>}
                      </span>
                    ) : (
                      <span className="text-gray-500">Paste your JSON below</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!jsonText.trim() && typeof navigator !== 'undefined' && navigator.clipboard && (
                      <Button
                        onClick={handlePasteFromClipboard}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs flex items-center gap-1"
                        title="Paste from clipboard"
                      >
                        <Clipboard className="h-3 w-3" />
                        Paste
                      </Button>
                    )}
                    {jsonText.trim() && (
                      <Button
                        onClick={() => { setJsonText(''); setError(null); setIsValidJson(false); }}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <textarea
                  className="w-full h-64 p-4 font-mono text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste your conversation JSON here..."
                />
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={!jsonText.trim() || !isValidJson}
              >
                {!jsonText.trim() 
                  ? "Paste JSON to continue" 
                  : !isValidJson 
                    ? "Fix JSON errors to continue"
                    : "Load Conversation"
                }
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sample" className="mt-6">
          <div className="text-center py-12">
            <FileJson className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Try with Sample Data</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              New to Claude Chat Viewer? Load a sample conversation to see how it works.
            </p>
            <Button onClick={loadSampleData} size="lg" className="gap-2">
              <FileJson className="h-5 w-5" />
              Load Sample Conversation
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              This will load a demo conversation about Python programming
            </p>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleFileUpload}
        className="hidden"
      />

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap font-mono text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {options.length > 0 && (
        <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-sm font-medium mb-4">
            Multiple conversations found. Please select one:
          </div>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
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
      )}
    </div>
  );
};
