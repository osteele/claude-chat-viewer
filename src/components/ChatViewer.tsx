import { saveAs } from "file-saver";
import JSZip from "jszip";
import mime from "mime";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseMessage } from "../lib/messageParser";
import { chatToHtml, chatToMarkdown, chatToText } from "../lib/utils";
import { type ChatData, ChatDataSchema, type ChatMessage } from "../schemas/chat";
import { Artifact } from "./Artifact";
import { CodeBlock } from "./CodeBlock";
import { ConversationBrowser } from "./ConversationBrowser";
import { JsonInput } from "./JsonInput";
import { MasterDetailView } from "./MasterDetailView";

interface MessageCardProps {
  message: ChatMessage;
  showThinking: boolean;
  artifactNumberMap: Map<string, number>;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, showThinking, artifactNumberMap }) => {
  const isHuman = message.sender === "human";

  const renderContent = (content: ChatMessage["content"]) => {
    // Safety check for content
    if (!content || !Array.isArray(content)) {
      console.error("Invalid content in message:", message.uuid, content);
      return <div className="p-4 text-red-600">Error: Invalid message content format</div>;
    }
    return content.map((item, index) => {
      if (item.type === "tool_use") {
        const key = `${message.uuid}-tool-${item.input.id}`;
        const artifactNum = artifactNumberMap.get(key) || 0;
        return (
          <div key={index} className="ml-4 inline-block">
            <Artifact
              title={item.input.title}
              content={item.input.content}
              identifier={item.input.id}
              artifactType={item.input.type}
              artifactNumber={artifactNum}
            />
          </div>
        );
      }

      if (item.type === "text") {
        // Safety check for text content
        if (typeof item.text !== "string") {
          console.error("Invalid text content in message:", message.uuid, item);
          return (
            <div key={index} className="p-4 text-red-600">
              Error: Invalid text content (expected string, got {typeof item.text})
            </div>
          );
        }

        let segments;
        try {
          segments = isHuman
            ? [{ type: "text" as const, content: item.text }]
            : parseMessage(item.text);
        } catch (error) {
          console.error("Error parsing message:", error, item.text);
          // Fallback to plain text rendering
          segments = [{ type: "text" as const, content: item.text }];
        }

        return (
          <div key={index} className="max-w-none p-4">
            {segments.map((segment, i) => {
              if (segment.type === "artifact") {
                const key = `${message.uuid}-artifact-${segment.identifier}`;
                const artifactNum = artifactNumberMap.get(key) || 0;
                return (
                  <Artifact
                    key={i}
                    title={segment.title}
                    content={segment.content}
                    identifier={segment.identifier}
                    artifactType={segment.artifactType}
                    artifactNumber={artifactNum}
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
                      <div className="text-sm text-purple-700">Thinking Process</div>
                    </div>
                    <div className="text-sm text-purple-600">{segment.content}</div>
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
            const [baseName, extension] = attachment.file_name.split(/\.(?=[^.]+$)/);
            return (
              <div
                key={i}
                className="px-3 py-8 bg-gradient-to-b from-[#fdfdfb] to-[#e6f5fc] border border-[#e8e7df] rounded-lg"
              >
                <div className="flex flex-col items-center gap-5">
                  <span className="text-blue-600/80 text-[14px] font-medium">{baseName}</span>
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
      <div className="text-sm hidden print:block message-label mb-2">
        {isHuman ? "Human" : "Claude"}
      </div>
      <div
        className={`mb-8 rounded-md overflow-hidden
      ${
        isHuman
          ? "flex gap-2 bg-gradient-to-t from-[#e8e5d8] to-[#f5f4ee] border border-[#e8e7df] human-message-print"
          : "bg-[#f7f6f4] border border-[#e9e7e1]"
      }`}
      >
        <div className="flex-shrink-0 pt-4 pl-4">
          {/* Screen version */}
          <div
            className={`w-6 h-6 rounded-full text-white flex items-center justify-center
                          text-sm print:hidden ${isHuman ? "bg-[#5645a1]" : "bg-[#d97656]"}`}
          >
            {isHuman ? "H" : "C"}
          </div>
        </div>

        <div>{renderContent(message.content)}</div>
      </div>
    </>
  );
};

const getFileInfo = (content: string, inputType: string, language?: string, title?: string) => {
  // Check first line for file path
  const lines = content.split("\n");
  const firstLine = lines[0].trim();
  const pathMatch = firstLine.match(/^(?:\/\/|#|<!--)\s*([\w/./-]+\.\w+)\s*(?:-->)?$/);

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
  let extension = mime.getExtension(inputType);

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
  const [showArtifactsInExport, setShowArtifactsInExport] = useState(true);
  const [showColophonInExport, setShowColophonInExport] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [downloadArtifactsSuccess, setDownloadArtifactsSuccess] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);

  // Generate diagnostic report
  const generateDiagnosticReport = () => {
    const report: string[] = [];
    report.push("=== CLAUDE CHAT VIEWER DIAGNOSTIC REPORT ===");
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push("");

    // Browser info
    report.push("Browser Information:");
    report.push(`  User Agent: ${navigator.userAgent}`);
    report.push(`  Platform: ${navigator.platform}`);
    report.push(`  Language: ${navigator.language}`);
    report.push("");

    // Data structure info
    report.push("Conversation Data:");
    report.push(`  Name: ${data.name || "Untitled"}`);
    report.push(`  UUID: ${data.uuid}`);
    report.push(`  Messages: ${data.chat_messages?.length || 0}`);
    report.push(`  Created: ${data.created_at}`);
    report.push(`  Updated: ${data.updated_at}`);
    report.push("");

    // Message analysis
    if (data.chat_messages && data.chat_messages.length > 0) {
      report.push("Message Analysis:");
      const senderCounts = { human: 0, assistant: 0 };
      const contentTypes = new Set<string>();
      let errorCount = 0;

      data.chat_messages.forEach((msg, idx) => {
        senderCounts[msg.sender]++;

        if (!msg.content || !Array.isArray(msg.content)) {
          errorCount++;
          report.push(`  ERROR: Message ${idx + 1} has invalid content structure`);
        } else {
          msg.content.forEach((item) => {
            contentTypes.add(item.type);
          });
        }
      });

      report.push(`  Human messages: ${senderCounts.human}`);
      report.push(`  Assistant messages: ${senderCounts.assistant}`);
      report.push(`  Content types found: ${Array.from(contentTypes).join(", ")}`);
      if (errorCount > 0) {
        report.push(`  Messages with errors: ${errorCount}`);
      }

      // Sample first message
      report.push("");
      report.push("First Message Sample:");
      const firstMsg = data.chat_messages[0];
      report.push(`  Sender: ${firstMsg.sender}`);
      report.push(`  Content items: ${firstMsg.content?.length || 0}`);
      if (firstMsg.content && firstMsg.content.length > 0) {
        const firstContent = firstMsg.content[0];
        report.push(`  First content type: ${firstContent.type}`);
        if (firstContent.type === "text" && "text" in firstContent) {
          report.push(`  Text preview (50 chars): ${firstContent.text.substring(0, 50)}...`);
        }
      }
    }

    report.push("");
    report.push("=== END OF REPORT ===");

    const reportText = report.join("\n");
    setDiagnosticReport(reportText);
    console.log(reportText);
    return reportText;
  };

  // Update window title when conversation is loaded
  useEffect(() => {
    const originalTitle = document.title;
    document.title = data.name ? `${data.name} - Claude Chat Viewer` : "Claude Chat Viewer";

    // Cleanup: restore original title when component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [data.name]);

  // Collect all artifacts with their content and metadata
  const artifacts: Array<{
    title: string;
    content: string;
    type: string;
    language?: string;
    key: string;
  }> = [];
  const artifactNumberMap = new Map<string, number>();

  // Pre-collect all artifacts to assign consistent numbers
  if (!data.chat_messages) {
    console.error("No chat_messages found in data:", data);
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">Error: Invalid conversation data</div>
        <div className="text-gray-600 text-sm">
          The loaded data does not contain valid chat messages. Please ensure you're loading a
          properly formatted conversation file.
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Technical details
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded text-left">
            <p className="text-xs font-mono text-gray-600">
              Data structure: {JSON.stringify(Object.keys(data), null, 2)}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Expected: chat_messages array with conversation data
            </p>
          </div>
        </details>
      </div>
    );
  }

  // Additional validation
  if (!Array.isArray(data.chat_messages)) {
    console.error("chat_messages is not an array:", typeof data.chat_messages);
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">Error: Invalid message format</div>
        <div className="text-gray-600 text-sm">
          The chat_messages field is not in the expected format (array).
        </div>
      </div>
    );
  }

  if (data.chat_messages.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-yellow-600 mb-2">Empty conversation</div>
        <div className="text-gray-600 text-sm">This conversation contains no messages.</div>
      </div>
    );
  }

  data.chat_messages.forEach((message) => {
    message.content.forEach((item) => {
      if (item.type === "tool_use") {
        const key = `${message.uuid}-tool-${item.input.id}`;
        if (!artifactNumberMap.has(key)) {
          artifacts.push({
            title: item.input.title,
            content: item.input.content,
            type: item.input.type,
            language: item.input.language,
            key,
          });
          artifactNumberMap.set(key, artifacts.length);
        }
      } else if (item.type === "text") {
        const segments = message.sender === "human" ? [] : parseMessage(item.text);
        segments.forEach((segment) => {
          if (segment.type === "artifact") {
            const key = `${message.uuid}-artifact-${segment.identifier}`;
            if (!artifactNumberMap.has(key)) {
              artifacts.push({
                title: segment.title,
                content: segment.content,
                type: segment.artifactType,
                key,
              });
              artifactNumberMap.set(key, artifacts.length);
            }
          }
        });
      }
    });
  });

  // Check if any message contains thinking segments
  const hasThinkingSegments = data.chat_messages.some((message) =>
    message.content.some(
      (item) =>
        item.type === "text" &&
        parseMessage(item.text).some((segment) => segment.type === "thinking"),
    ),
  );

  const handleDownloadMarkdown = () => {
    try {
      const markdown = chatToMarkdown(data, {
        showThinking,
        showArtifacts: showArtifactsInExport,
        showColophon: showColophonInExport,
      });

      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name || "untitled-conversation"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to download markdown:", err);
    }
  };

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
            item.input.title,
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
            const baseFileName = item.input.title || `artifact-${messageIndex}-${itemIndex}`;
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
    message.content.some((item) => item.type === "tool_use" && item.input.content?.trim()),
  );

  return (
    <div className="space-y-8">
      {/* Minimal Actions and Options - only show when conversation is loaded */}
      {data && (
        <div className="print:hidden mb-6 space-y-3">
          {/* Primary Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                window.print();
                setPrintSuccess(true);
                setTimeout(() => setPrintSuccess(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              {printSuccess ? "Printing..." : "Print"}
            </button>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copySuccess ? "Copied!" : "Copy conversation"}
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {downloadSuccess ? "Downloaded!" : "Download Markdown"}
            </button>

            {hasArtifacts && (
              <button
                onClick={() => {
                  handleDownloadArtifacts();
                  setDownloadArtifactsSuccess(true);
                  setTimeout(() => setDownloadArtifactsSuccess(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {downloadArtifactsSuccess ? "Downloaded!" : "Download Artifacts"}
              </button>
            )}
          </div>

          {/* Diagnostic Report */}
          <div className="mb-2">
            <button
              onClick={() => generateDiagnosticReport()}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Generate Diagnostic Report
            </button>
            {diagnosticReport && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-blue-700">Diagnostic Report</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(diagnosticReport);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setDiagnosticReport(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <pre className="text-xs font-mono text-blue-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {diagnosticReport}
                </pre>
              </div>
            )}
          </div>

          {/* Display Options (Collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 select-none flex items-center gap-1.5 transition-colors">
              <svg
                className="w-3 h-3 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span>Display options</span>
            </summary>
            <div className="ml-4 mt-2 flex gap-8">
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Display and export:</div>
                <label
                  className={`flex items-center gap-2 cursor-pointer ${!hasThinkingSegments ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={showThinking}
                    onChange={(e) => setShowThinking(e.target.checked)}
                    disabled={!hasThinkingSegments}
                    className="w-3 h-3 rounded border-gray-300 text-gray-600 focus:ring-1 focus:ring-gray-400 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-600">Show thinking</span>
                </label>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">Export only:</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showArtifactsInExport}
                      onChange={(e) => setShowArtifactsInExport(e.target.checked)}
                      className="w-3 h-3 rounded border-gray-300 text-gray-600 focus:ring-1 focus:ring-gray-400"
                    />
                    <span className="text-xs text-gray-600">Artifacts</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showColophonInExport}
                      onChange={(e) => setShowColophonInExport(e.target.checked)}
                      className="w-3 h-3 rounded border-gray-300 text-gray-600 focus:ring-1 focus:ring-gray-400"
                    />
                    <span className="text-xs text-gray-600">Attribution</span>
                  </label>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#e8e7df] p-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {data.name || "Untitled Conversation"}
        </h1>
        <div className="mt-3 text-sm text-gray-600">
          <span>
            Created:{" "}
            {new Date(data.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="mx-2">•</span>
          <span>
            Updated:{" "}
            {new Date(data.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {data.chat_messages.map((message) => (
        <MessageCard
          key={message.uuid}
          message={message}
          showThinking={showThinking}
          artifactNumberMap={artifactNumberMap}
        />
      ))}

      {/* Print-only artifacts appendix */}
      {showArtifactsInExport && artifacts.length > 0 && (
        <div
          className="print-only-appendix mt-12"
          data-print-only="true"
          style={
            {
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            } as React.CSSProperties
          }
        >
          <h2 className="text-2xl font-bold mb-6">Artifacts Appendix</h2>
          {artifacts.map((artifact, index) => (
            <div key={artifact.key} className="mb-8 border border-gray-300 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">
                Artifact {index + 1}: {artifact.title}
              </h3>
              {(artifact.type || artifact.language) && (
                <div className="text-sm text-gray-600 mb-2">
                  {artifact.type && `Type: ${artifact.type}`}{" "}
                  {artifact.language && `(${artifact.language})`}
                </div>
              )}
              <pre
                className="p-4 bg-gray-50 rounded overflow-x-auto text-sm"
                style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
              >
                <code>{artifact.content}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Colophon - visible on screen and optionally in print */}
      <div
        className={
          showColophonInExport
            ? "mt-12 pt-8 border-t border-gray-200"
            : "mt-12 pt-8 border-t border-gray-200 print:hidden"
        }
      >
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            Rendered by{" "}
            <a
              href="https://github.com/osteele/claude-chat-viewer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Claude Chat Viewer
            </a>
          </p>
          <p className="text-xs">An open-source tool for viewing Claude chat exports</p>
        </div>
      </div>
    </div>
  );
};

const ChatViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"json" | "view" | "browse" | "master-detail">("json");
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [conversationList, setConversationList] = useState<ChatData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [fullErrorDetails, setFullErrorDetails] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [useMasterDetail] = useState(true); // Default to master-detail view

  // Update URL to reflect current state
  const updateURL = (
    tab: "json" | "view" | "browse" | "master-detail",
    conversationId?: string,
  ) => {
    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get("file");

    const newPath = window.location.pathname;
    let newSearch = fileParam ? `?file=${fileParam}` : "";

    if (tab === "browse") {
      newSearch += `${newSearch ? "&" : "?"}tab=browse`;
    } else if (tab === "view" && conversationId) {
      newSearch += `${newSearch ? "&" : "?"}tab=view&conversation=${conversationId}`;
    }

    const newURL = newPath + newSearch;

    // Only push state if we're not navigating via popstate
    if (!isNavigating) {
      window.history.pushState({ tab, conversationId }, "", newURL);
    }
  };

  const handleValidJson = (data: ChatData) => {
    setChatData(data);
    // Only clear conversation list if we're loading a single conversation directly
    if (!conversationList) {
      setConversationList(null);
    }
    setActiveTab("view");
    updateURL("view", data.uuid);
  };

  const handleConversationList = (conversations: ChatData[], warning?: string) => {
    setConversationList(conversations);

    if (warning) {
      // Store full details for copying
      setFullErrorDetails(warning);

      // Create a condensed version for UI display
      const lines = warning.split("\n");
      const condensedLines: string[] = [];

      // Find and add the summary line (first line that starts with ❌)
      const summaryLine = lines.find((line) => line.startsWith("❌"));
      if (summaryLine) {
        condensedLines.push(summaryLine);
      }

      // Find and add error count line (if different from summary)
      const errorCountLine = lines.find(
        (line) => line.includes("conversation(s) had validation errors") && line !== summaryLine,
      );
      if (errorCountLine) {
        condensedLines.push(errorCountLine);
      }

      // Include first error details only
      let foundFirstError = false;
      let errorLineCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("• ")) {
          if (!foundFirstError) {
            foundFirstError = true;
            condensedLines.push(""); // Add blank line before error details
            condensedLines.push(line);
            // Include next 2 lines of error details
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
              if (lines[j].includes('At "')) {
                condensedLines.push(lines[j]);
                errorLineCount++;
                if (errorLineCount >= 2) break;
              }
            }
          }
          break;
        }
      }

      // Check if there are more errors beyond the first
      let errorCount = 0;
      lines.forEach((line) => {
        if (line.startsWith("• ")) errorCount++;
      });

      if (errorCount > 1) {
        condensedLines.push("\n[More errors hidden - click Copy Error for full details]");
      }

      // Always include the bug report section
      const bugReportIndex = lines.findIndex((line) => line.includes("🐛 Unexpected error?"));
      if (bugReportIndex !== -1) {
        condensedLines.push("");
        for (let i = bugReportIndex; i < Math.min(bugReportIndex + 4, lines.length); i++) {
          if (lines[i]) condensedLines.push(lines[i]);
        }
      }

      setLoadWarning(condensedLines.join("\n"));
      console.log("Warning received in ChatViewer:", warning);
    } else {
      setLoadWarning(null);
      setFullErrorDetails(null);
      setFullErrorDetails(null);
    }
    setChatData(null);
    // Use master-detail view when enabled
    if (useMasterDetail) {
      setActiveTab("master-detail");
      // Select first conversation by default if available
      if (conversations.length > 0) {
        setChatData(conversations[0]);
        updateURL("view", conversations[0].uuid);
      }
    } else {
      setActiveTab("browse");
      updateURL("browse");
    }
  };

  const handleSelectFromBrowser = (conversation: ChatData) => {
    setChatData(conversation);
    // Keep conversationList so user can navigate back
    setActiveTab("view");
    updateURL("view", conversation.uuid);
    // Scroll to top when switching to conversation view
    window.scrollTo(0, 0);
  };

  const handleBackToInput = () => {
    setConversationList(null);
    setChatData(null);
    setLoadWarning(null);
    setFullErrorDetails(null);
    setActiveTab("json");
    updateURL("json");
  };

  // Update window title when no conversation is loaded
  useEffect(() => {
    if (!chatData) {
      document.title = "Claude Chat Viewer";
    }
  }, [chatData]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setIsNavigating(true);

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const conversationParam = params.get("conversation");

      if (tabParam === "browse" && conversationList) {
        setActiveTab("browse");
        setChatData(null);
        window.scrollTo(0, 0);
      } else if (tabParam === "view" && conversationParam && conversationList) {
        // Find the conversation in the list
        const conversation = conversationList.find((c) => c.uuid === conversationParam);
        if (conversation) {
          setChatData(conversation);
          setActiveTab("view");
          window.scrollTo(0, 0);
        }
      } else {
        // Default to import tab
        setActiveTab("json");
        window.scrollTo(0, 0);
      }

      setIsNavigating(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [conversationList]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get("file");
    const tabParam = params.get("tab");
    const conversationParam = params.get("conversation");

    if (fileParam) {
      setIsLoading(true);
      setLoadError(null);

      fetch(fileParam)
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to load file "${fileParam}": ${response.status} ${response.statusText}. Make sure the file path is correct and the file is accessible.`,
            );
          }
          return response.json();
        })
        .then((data) => {
          // Don't cache query parameter data to avoid storage issues with large files

          // Check if it's a conversations.json file (array format)
          if (Array.isArray(data)) {
            if (data.length === 0) {
              setLoadError("The conversations file is empty.");
              return;
            }

            if (data.length === 1) {
              // Single conversation in array - load it directly
              setChatData(data[0]);
              setActiveTab("view");
              return;
            }

            // Multiple conversations - validate each as ChatData and show browser
            const validConversations: ChatData[] = [];
            const invalidConversations: { index: number; error: string }[] = [];

            data.forEach((conversation, index) => {
              const result = ChatDataSchema.safeParse(conversation);
              if (result.success) {
                validConversations.push(result.data);
              } else {
                const errorMessage = result.error.errors
                  .map((e) => `${e.path.join(".")}: ${e.message}`)
                  .join("; ");
                invalidConversations.push({ index, error: errorMessage });
                console.error(`Conversation ${index + 1} validation failed:`, result.error.errors);
              }
            });

            if (validConversations.length === 0) {
              setLoadError("No valid conversations found in the file. Check console for details.");
              return;
            }

            if (invalidConversations.length > 0) {
              console.warn(
                `Loaded ${validConversations.length} of ${data.length} conversations. ${invalidConversations.length} had errors.`,
              );
            }

            // Show conversation browser with valid conversations
            setConversationList(validConversations);

            // Check if we should navigate to a specific conversation
            if (tabParam === "view" && conversationParam) {
              const conversation = validConversations.find((c) => c.uuid === conversationParam);
              if (conversation) {
                setChatData(conversation);
                if (useMasterDetail) {
                  setActiveTab("master-detail");
                } else {
                  setActiveTab("view");
                }
              } else if (useMasterDetail) {
                setActiveTab("master-detail");
                // Select first conversation by default
                if (validConversations.length > 0) {
                  setChatData(validConversations[0]);
                }
              } else {
                setActiveTab("browse");
              }
            } else if (useMasterDetail) {
              setActiveTab("master-detail");
              // Select first conversation by default
              if (validConversations.length > 0) {
                setChatData(validConversations[0]);
              }
            } else {
              setActiveTab("browse");
            }
            return;
          }

          // Single conversation object
          setChatData(data);
          setActiveTab("view");
        })
        .catch((error) => {
          console.error("Error loading file:", error);
          setLoadError(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [useMasterDetail]);

  return (
    <div className="min-h-screen bg-[#f1f0e7] print:bg-white">
      {/* Minimal Header Bar - Hide when in master-detail view */}
      {activeTab !== "master-detail" && (
        <div className="print:hidden bg-gray-50/80 border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-6 py-1.5 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveTab("json");
                  setChatData(null);
                  setConversationList(null);
                  setLoadWarning(null);
                  setFullErrorDetails(null);
                  updateURL("json");
                  window.scrollTo(0, 0);
                }}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === "json"
                    ? "text-gray-900 bg-white/80 shadow-xs"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                1. Import
              </button>
              {conversationList && (
                <button
                  onClick={() => {
                    if (useMasterDetail) {
                      setActiveTab("master-detail");
                      if (!chatData && conversationList.length > 0) {
                        setChatData(conversationList[0]);
                        updateURL("view", conversationList[0].uuid);
                      }
                    } else {
                      setActiveTab("browse");
                      setChatData(null);
                      updateURL("browse");
                    }
                    window.scrollTo(0, 0);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === "browse"
                      ? "text-gray-900 bg-white/80 shadow-xs"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  2. Browse ({conversationList.length})
                </button>
              )}
              <button
                onClick={() => {
                  if (chatData) {
                    setActiveTab("view");
                    updateURL("view", chatData.uuid);
                    window.scrollTo(0, 0);
                  }
                }}
                disabled={!chatData}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTab === "view"
                    ? "text-gray-900 bg-white/80 shadow-xs"
                    : chatData
                      ? "text-gray-500 hover:text-gray-700"
                      : "text-gray-300 cursor-not-allowed"
                }`}
              >
                {conversationList ? "3." : "2."} View
                {chatData ? ` • ${chatData.name || "Untitled"}` : ""}
              </button>
            </div>
            <a
              href="https://github.com/osteele/claude-chat-viewer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>osteele/claude-chat-viewer</span>
            </a>
          </div>
        </div>
      )}

      <div className={activeTab === "master-detail" ? "" : "max-w-4xl mx-auto px-6 py-8"}>
        <div className="print:hidden">
          {loadError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-semibold">Error loading file:</p>
              <p className="text-red-600 mt-1">{loadError}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-red-500 hover:text-red-700">
                  Troubleshooting tips
                </summary>
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside space-y-1">
                  <li>Ensure the JSON file is properly formatted</li>
                  <li>Check that the file contains valid Claude conversation data</li>
                  <li>For large files (&gt;10MB), loading may take longer</li>
                  <li>Check browser console (F12) for detailed error messages</li>
                  <li>Enable debug mode below to see more information</li>
                </ul>
              </details>
            </div>
          )}

          {loadWarning && activeTab !== "json" && activeTab !== "master-detail" && (
            <div
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md relative"
              style={{ minHeight: "auto" }}
            >
              <div className="text-red-700 whitespace-pre-wrap font-mono text-sm overflow-visible">
                {loadWarning.split("\n").map((line, index) => {
                  // Make GitHub URLs clickable
                  if (line.includes("https://github.com/")) {
                    const urlMatch = line.match(/(.*?)(https:\/\/github\.com\/[^\s]+)(.*)/);
                    if (urlMatch) {
                      return (
                        <span key={index}>
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
                    <span key={index}>
                      {line}
                      {"\n"}
                    </span>
                  );
                })}
              </div>
              <button
                onClick={(e) => {
                  navigator.clipboard.writeText(fullErrorDetails || loadWarning);
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
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading conversation file...</div>
          ) : activeTab === "json" ? (
            <JsonInput onValidJson={handleValidJson} onConversationList={handleConversationList} />
          ) : activeTab === "master-detail" && conversationList ? (
            <div className="fixed inset-0 top-[49px] flex flex-col">
              {loadWarning && (
                <div className="p-4 bg-red-50 border-b border-red-200 relative flex-shrink-0">
                  <div className="text-red-700 whitespace-pre-wrap font-mono text-sm overflow-visible">
                    {loadWarning.split("\n").map((line, index) => {
                      // Make GitHub URLs clickable
                      if (line.includes("https://github.com/")) {
                        const urlMatch = line.match(/(.*?)(https:\/\/github\.com\/[^\s]+)(.*)/);
                        if (urlMatch) {
                          return (
                            <span key={index}>
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
                        <span key={index}>
                          {line}
                          {"\n"}
                        </span>
                      );
                    })}
                  </div>
                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(fullErrorDetails || loadWarning);
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
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <MasterDetailView
                  conversations={conversationList}
                  selectedConversation={chatData}
                  onSelectConversation={(conversation) => {
                    setChatData(conversation);
                    updateURL("view", conversation.uuid);
                  }}
                  onBack={handleBackToInput}
                >
                  {chatData && <ConversationView data={chatData} />}
                </MasterDetailView>
              </div>
            </div>
          ) : activeTab === "browse" && conversationList ? (
            <ConversationBrowser
              conversations={conversationList}
              onSelectConversation={handleSelectFromBrowser}
              onBack={handleBackToInput}
            />
          ) : activeTab === "view" && chatData ? (
            <ConversationView data={chatData} />
          ) : null}
        </div>

        {/* Show conversation view directly when printing */}
        <div className="hidden print:block">{chatData && <ConversationView data={chatData} />}</div>
      </div>
    </div>
  );
};

export default ChatViewer;
