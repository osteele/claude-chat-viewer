import { AlertCircle, Archive, CheckCircle, Clipboard, FileJson, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConversationImportResult } from "../lib/conversationImport";
import { importConversationText } from "../lib/conversationImportClient";
import type { ChatData } from "../schemas/chat";

const sampleConversationModules = import.meta.glob<ChatData>("../data/sampleConversations/*.json", {
  import: "default",
});

interface JsonInputProps {
  onValidJson: (data: ChatData) => void;
  onConversationList: (conversations: ChatData[], warning?: string) => void;
}

export const JsonInput: React.FC<JsonInputProps> = ({ onValidJson, onConversationList }) => {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidJson, setIsValidJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Live JSON validation with debouncing
  const validateJson = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setIsValidJson(false);
        // Only clear error if it's a syntax error
        if (error?.startsWith("Syntax error") || error?.includes("JSON appears incomplete")) {
          setError(null);
        }
        return;
      }

      try {
        JSON.parse(text);
        setIsValidJson(true);
        // Only clear error if it's a syntax error
        if (error?.startsWith("Syntax error") || error?.includes("JSON appears incomplete")) {
          setError(null);
        }
      } catch (err) {
        setIsValidJson(false);
        // Only show error for non-empty input after user stops typing
        if (text.trim().length > 10) {
          if (err instanceof Error) {
            const errorMessage = err.message.includes("Unexpected end")
              ? "JSON appears incomplete - keep typing or check for missing brackets"
              : `Syntax error: ${err.message.split(" at position")[0]}`;
            setError(errorMessage);
          }
        }
      }
    },
    [error],
  );

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

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSubmit();
    }
  };

  const applyImportResult = (result: ConversationImportResult) => {
    if (result.kind === "conversation") {
      onValidJson(result.conversation);
      setError(null);
      return;
    }
    if (result.kind === "collection") {
      onConversationList(result.conversations, result.warning);
      setError(null);
      return;
    }
    setError(result.message);
  };

  const processJsonText = async (text: string) => {
    applyImportResult(await importConversationText(text));
  };

  const handleSubmit = async () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON data or upload a file first.");
      return;
    }
    await processJsonText(jsonText);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Handle ZIP files
    if (file.name.toLowerCase().endsWith(".zip")) {
      try {
        // Lazy load JSZip only when processing ZIP files
        const JSZip = (await import("jszip")).default;
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

        await processJsonText(content);
      } catch (err) {
        if (err instanceof Error) {
          setError(`Error reading ZIP file: ${err.message}`);
        } else {
          setError("Failed to read ZIP file");
        }
      }
      return;
    }

    // Handle JSON files
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        setJsonText(content);
        await processJsonText(content);
      }
    };
    reader.onerror = (e) => {
      console.error("FileReader error:", e);
      setError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const loadSampleData = async () => {
    const sampleConversations = await Promise.all(
      Object.values(sampleConversationModules).map((load) => load()),
    );
    setError(null);
    onConversationList(sampleConversations);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      // Trigger validation
      validateJson(text);
    } catch (_err) {
      // Fallback for browsers that don't support clipboard API or user denied permission
      setError("Unable to read from clipboard. Please paste manually using Ctrl/Cmd+V.");
    }
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
      if (file.name.toLowerCase().endsWith(".json") || file.name.toLowerCase().endsWith(".zip")) {
        // Create a proper event-like object for handleFileUpload
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const fakeInput = document.createElement("input");
        fakeInput.type = "file";
        fakeInput.files = dataTransfer.files;
        const fakeEvent = { target: fakeInput } as unknown as React.ChangeEvent<HTMLInputElement>;
        await handleFileUpload(fakeEvent);
      } else {
        setError("Please drop a .json or .zip file");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start gap-4 mb-8">
        <img
          src="mascot-transparent.webp"
          alt="Claude Chat Viewer Mascot"
          className="h-36 w-auto object-contain flex-shrink-0"
        />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Claude Chat Viewer</h1>
          <p className="text-gray-600">
            View your Claude conversations in a clean, readable format. Upload your entire Claude
            archive to browse and search through all your conversations, or paste individual chats
            for quick viewing.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Choose how to import your conversation:
        </h2>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="upload"
              className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Archive className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Upload Archive</div>
                <div className="text-xs opacity-75 hidden sm:block">ZIP or JSON file</div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="paste"
              className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Clipboard className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Paste JSON</div>
                <div className="text-xs opacity-75 hidden sm:block">Single chat</div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="sample"
              className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
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
                    <li>
                      Get your archive from Claude:{" "}
                      <strong>Settings → Account → Request Export</strong>
                    </li>
                    <li>When you receive the download link, download and save the ZIP file</li>
                    <li>Upload the ZIP file here to browse all your conversations</li>
                  </ol>
                  <p className="text-sm mt-4">
                    <strong>Supported files:</strong> ZIP archives from Claude export or
                    conversations.json files
                  </p>
                </div>
              </div>
              <section
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                aria-label="Upload area"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                aria-describedby="upload-instructions"
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
                    <p className="text-xs text-gray-500 mt-3">Accepts .zip and .json files</p>
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Paste Individual Conversation</h2>
                <div className="prose prose-sm text-gray-600">
                  <p>Export a single chat from Claude and paste the JSON here.</p>
                  <p className="mt-2">
                    See{" "}
                    <a
                      href="https://observablehq.com/@simonw/convert-claude-json-to-markdown"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Convert Claude JSON to Markdown
                    </a>{" "}
                    for instructions on using the browser developer console to extract the JSON for
                    a chat.
                  </p>
                  <p className="text-sm mt-4">
                    <strong>Tip:</strong> Press Enter to load or use Cmd/Ctrl+V to paste
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div
                  className={`border-2 rounded-lg overflow-hidden ${
                    isValidJson
                      ? "border-green-400"
                      : jsonText.trim() && !isValidJson
                        ? "border-yellow-400"
                        : "border-gray-200"
                  }`}
                >
                  <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                    <div className="text-sm">
                      {jsonText.trim() ? (
                        <span className="flex items-center gap-2">
                          {isValidJson && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {jsonText.length.toLocaleString()} characters
                          {isValidJson && (
                            <span className="text-green-600 font-medium">• Valid JSON</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-500">Paste your JSON below</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!jsonText.trim() &&
                        typeof navigator !== "undefined" &&
                        navigator.clipboard && (
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
                          onClick={() => {
                            setJsonText("");
                            setError(null);
                            setIsValidJson(false);
                          }}
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
                      : "Load Conversation"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sample" className="mt-6">
            <div className="text-center py-12">
              <FileJson className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Try with Sample Data</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                New to Claude Chat Viewer? Load sample conversations to see how it works.
              </p>
              <Button onClick={loadSampleData} size="lg" className="gap-2">
                <FileJson className="h-5 w-5" />
                Load Sample Conversations
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                This will load 3 demo conversations: Python, Web Development, and Data Analysis
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4 relative">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap font-mono text-sm">
              {error.split("\n").map((line, idx) => {
                // Make GitHub URLs clickable
                if (line.includes("https://github.com/")) {
                  const urlMatch = line.match(/(.*?)(https:\/\/github\.com\/[^\s]+)(.*)/);
                  if (urlMatch) {
                    return (
                      <span key={`url-${idx}-${urlMatch[2]}`}>
                        {urlMatch[1]}
                        <a
                          href={urlMatch[2]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {urlMatch[2]}
                        </a>
                        {urlMatch[3]}
                        {"\n"}
                      </span>
                    );
                  }
                }
                return (
                  <span key={`line-${idx}-${line.slice(0, 24)}`}>
                    {line}
                    {"\n"}
                  </span>
                );
              })}
            </AlertDescription>
            <button
              type="button"
              onClick={(e) => {
                navigator.clipboard.writeText(error);
                // Show a brief confirmation
                const btn = e.currentTarget;
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                btn.classList.add("text-green-600");
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.classList.remove("text-green-600");
                }, 2000);
              }}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
              title="Copy error message to clipboard"
            >
              Copy Error
            </button>
          </Alert>
        )}
      </div>

      <div className="mt-6 space-y-3 text-xs text-gray-500">
        <div className="flex items-start gap-2">
          <svg
            className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Shield</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p>
            <strong>Privacy:</strong> This app runs entirely in your browser. Your conversations and
            files never leave your computer. The app is served as static files with no backend
            server—we cannot see, store, or access any of your data.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <svg
            className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Info</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>
            <strong>Note:</strong> Due to technical limitations, the app cannot currently render
            image attachments. Also, it does not currently render LaTeX or run artifacts.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <svg
            className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Link</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p>
            <strong>More Tools:</strong> Check out my{" "}
            <a
              href="https://osteele.com/software/web-apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              other web applications
            </a>{" "}
            and{" "}
            <a
              href="https://osteele.com/topics/ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              AI & LLM tools
            </a>
            .
          </p>
        </div>

        <div className="flex items-start gap-2">
          <svg
            className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Acknowledgements</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
          <p>
            <strong>Acknowledgements:</strong> This app was <em>inspired</em> by Simon Willison's{" "}
            <a
              href="https://observablehq.com/@simonw/convert-claude-json-to-markdown"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Convert Claude JSON to Markdown
            </a>{" "}
            tool, and (largely) <em>written</em> by{" "}
            <a
              href="https://cursor.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Cursor
            </a>{" "}
            and{" "}
            <a
              href="https://anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Claude
            </a>
            .
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
