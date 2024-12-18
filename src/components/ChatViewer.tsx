import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseMessage } from "../lib/messageParser";
import { ChatData, ChatMessage } from "../schemas/chat";
import { Artifact } from "./Artifact";
import { CodeBlock } from "./CodeBlock";
import { JsonInput } from "./JsonInput";
import { chatToText, chatToHtml } from "../lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import mime from "mime-types";

interface MessageCardProps {
  message: ChatMessage;
  showThinking: boolean;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, showThinking }) => {
  const isHuman = message.sender === "human";

  const renderContent = (content: ChatMessage["content"]) => {
    return content.map((item, index) => {
      if (item.type === "tool_use") {
        return (
          <div className="ml-4 inline-block">
            <Artifact
              key={index}
              title={item.input.title}
              content={item.input.content}
              identifier={item.input.id}
              artifactType={item.input.type}
            />
          </div>
        );
      }

      if (item.type === "text") {
        const segments = isHuman
          ? [{ type: "text" as const, content: item.text }]
          : parseMessage(item.text);

        return (
          <div key={index} className="max-w-none p-4">
            {segments.map((segment, i) => {
              if (segment.type === "artifact") {
                return (
                  <Artifact
                    key={i}
                    title={segment.title}
                    content={segment.content}
                    identifier={segment.identifier}
                    artifactType={segment.artifactType}
                  />
                );
              }

              if (segment.type === "thinking") {
                if (!showThinking) return null;
                return (
                  <div
                    key={i}
                    className="my-4 bg-purple-50 rounded-2xl border border-purple-100 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded">
                        <div className="text-sm text-purple-600">💭</div>
                      </div>
                      <div className="text-sm text-purple-700">
                        Thinking Process
                      </div>
                    </div>
                    <div className="text-sm text-purple-600">
                      {segment.content}
                    </div>
                  </div>
                );
              }

              if (segment.type === "code") {
                return (
                  <CodeBlock
                    key={i}
                    code={segment.content}
                    language={segment.language}
                    path={segment.path}
                  />
                );
              }

              return segment.content.split("\n").map((line, j) => (
                <ReactMarkdown
                  key={`${i}-${j}`}
                  className="prose font-serif max-w-none leading-loose"
                  components={{
                    code({ className, children, ...props }) {
                      return (
                        <code
                          {...props}
                          className={`text-[#986460] bg-[#f1f0eb] font-normal ${className}`}
                        >
                          {children}
                        </code>
                      );
                    },
                    li: ({ children }) => <li className="my-0">{children}</li>,
                  }}
                >
                  {line}
                </ReactMarkdown>
              ));
            })}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <>
      {message.files && message.files.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {message.files.map((file, i) => (
            <div
              key={i}
              className="inline-flex items-center px-3 py-2 bg-[#f5f4ef] border border-[#e8e7df] rounded-lg"
            >
              <a
                href={`https://api.claude.ai/${file.preview_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-800 hover:underline text-sm"
              >
                {message.files && message.files.length > 1
                  ? `Attachment #${i + 1}/${message.files.length}`
                  : "Attachment"}
              </a>
            </div>
          ))}
        </div>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {message.attachments.map((attachment, i) => {
            const [baseName, extension] =
              attachment.file_name.split(/\.(?=[^.]+$)/);
            return (
              <div
                key={i}
                className="px-3 py-8 bg-gradient-to-b from-[#fdfdfb] to-[#e6f5fc] border border-[#e8e7df] rounded-lg"
              >
                <div className="flex flex-col items-center gap-5">
                  <span className="text-blue-600/80 text-[14px] font-medium">
                    {baseName}
                  </span>
                  {extension && (
                    <span className="px-2 py-0.25 bg-white border border-[#e8e7df] rounded-xl text-[11px] font-normal text-gray-800 uppercase">
                      {extension}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print version - positioned above */}
      <div className={`text-sm hidden print:block`}>
        {isHuman ? "Human" : "Claude"}
      </div>
      <div
        className={`mb-8 rounded-md overflow-hidden
      ${
        isHuman
          ? "flex gap-2 bg-gradient-to-t from-[#e8e5d8] to-[#f5f4ee] border border-[#e8e7df]"
          : "bg-[#f7f6f4] border border-[#e9e7e1]"
      }`}
      >
        <div className="flex-shrink-0 pt-4 pl-4">
          {/* Screen version */}
          <div
            className={`w-6 h-6 rounded-full text-white flex items-center justify-center
                          text-sm print:hidden ${
                            isHuman ? "bg-[#5645a1]" : "bg-[#d97656]"
                          }`}
          >
            {isHuman ? "H" : "C"}
          </div>
        </div>

        <div>{renderContent(message.content)}</div>
      </div>
    </>
  );
};

const getFileInfo = (
  content: string,
  inputType: string,
  language?: string,
  title?: string
) => {
  // Check first line for file path
  const lines = content.split("\n");
  const firstLine = lines[0].trim();
  const pathMatch = firstLine.match(
    /^(?:\/\/|#|<!--)\s*([\w/./-]+\.\w+)\s*(?:-->)?$/
  );

  if (pathMatch) {
    // Return the path and content without the first line
    return {
      path: pathMatch[1],
      content: lines.slice(1).join("\n").trim(),
    };
  }

  // Check if title already has an extension
  if (title && /\.\w+$/.test(title)) {
    return {
      path: "",
      content,
      fileName: title, // Use the complete filename as is
    };
  }

  // Try to get extension from MIME type first
  let extension = mime.extension(inputType);

  // If no extension found and we have a language, map common programming languages
  if (!extension && language) {
    // Handle programming languages not in mime-types
    const languageExtensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      ruby: "rb",
      cpp: "cpp",
      "c++": "cpp",
      // Add only languages that aren't handled well by mime-types
    };
    extension = languageExtensions[language.toLowerCase()];
  }

  // Default to txt if nothing else worked
  extension = extension || "txt";

  return {
    path: "",
    content,
    extension,
  };
};

const ConversationView: React.FC<{ data: ChatData }> = ({ data }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Check if any message contains thinking segments
  const hasThinkingSegments = data.chat_messages.some((message) =>
    message.content.some(
      (item) =>
        item.type === "text" &&
        parseMessage(item.text).some((segment) => segment.type === "thinking")
    )
  );

  const handleCopy = async () => {
    try {
      const plainText = chatToText(data);
      const htmlContent = chatToHtml(data);

      // Create a clipboard item with both formats
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([htmlContent], { type: "text/html" }),
      });

      await navigator.clipboard.write([clipboardItem]);

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadArtifacts = async () => {
    const zip = new JSZip();
    let artifactCount = 0;

    // Collect all tool_use artifacts
    data.chat_messages.forEach((message, messageIndex) => {
      message.content.forEach((item, itemIndex) => {
        if (item.type === "tool_use") {
          artifactCount++;
          const fileInfo = getFileInfo(
            item.input.content,
            item.input.type,
            item.input.language,
            item.input.title
          );

          let fileName: string;
          if (fileInfo.path) {
            // Use the path from the first line comment
            fileName = fileInfo.path;
          } else if (fileInfo.fileName) {
            // Use the complete filename if provided
            fileName = fileInfo.fileName;
          } else {
            // Generate a filename using the title or default name with extension
            const baseFileName =
              item.input.title || `artifact-${messageIndex}-${itemIndex}`;
            fileName = `${baseFileName}.${fileInfo.extension}`;
          }

          // Create folders if the path includes directories
          zip.file(fileName, fileInfo.content || item.input.content);
        }
      });
    });

    if (artifactCount === 0) return;

    // Generate and download the zip file
    const blob = await zip.generateAsync({ type: "blob" });
    const chatTitle = data.name || "untitled-chat";
    const sanitizedTitle = chatTitle.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
    saveAs(blob, `${sanitizedTitle}-artifacts.zip`);
  };

  // Find if there are any tool_use artifacts with content
  const hasArtifacts = data.chat_messages.some((message) =>
    message.content.some(
      (item) => item.type === "tool_use" && item.input.content?.trim()
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1 print:hidden">
        <div className="flex items-center gap-4">
          {hasThinkingSegments && (
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={showThinking}
                onChange={(e) => setShowThinking(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show thinking process
            </label>
          )}
        </div>

        <div className="flex gap-2">
          {hasArtifacts && (
            <button
              onClick={handleDownloadArtifacts}
              disabled={!hasArtifacts}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm
                ${
                  !hasArtifacts
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:text-gray-900"
                }
                bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Artifacts
            </button>
          )}

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {copySuccess ? "Copied!" : "Copy conversation"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#e8e7df] p-4">
        <h1 className="text-xl font-semibold">
          {data.name || "Untitled Conversation"}
        </h1>
      </div>

      {data.chat_messages.map((message) => (
        <MessageCard
          key={message.uuid}
          message={message}
          showThinking={showThinking}
        />
      ))}
    </div>
  );
};

const ChatViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"json" | "view">("json");
  const [chatData, setChatData] = useState<ChatData | null>(null);

  const handleValidJson = (data: ChatData) => {
    setChatData(data);
    setActiveTab("view");
  };

  return (
    <div className="min-h-screen bg-[#f1f0e7] print:bg-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="print:hidden">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "json" | "view")}
          >
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="json">Enter JSON</TabsTrigger>
                <TabsTrigger value="view" disabled={!chatData}>
                  View
                </TabsTrigger>
              </TabsList>

              <a
                href="https://github.com/osteele/claude-chat-viewer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>

            <TabsContent value="json">
              <JsonInput onValidJson={handleValidJson} />
            </TabsContent>

            <TabsContent value="view">
              {chatData && <ConversationView data={chatData} />}
            </TabsContent>
          </Tabs>
        </div>

        {/* Show conversation view directly when printing */}
        <div className="hidden print:block">
          {chatData && <ConversationView data={chatData} />}
        </div>
      </div>
    </div>
  );
};

export default ChatViewer;
