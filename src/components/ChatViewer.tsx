import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseMessage } from "../lib/messageParser";
import { ChatData } from "../schemas/chat";
import { Artifact } from "./Artifact";
import { CodeBlock } from "./CodeBlock";
import { JsonInput } from "./JsonInput";
import { chatToText, chatToHtml } from "../lib/utils";

interface MessageCardProps {
  message: ChatData["chat_messages"][number];
  showThinking: boolean;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, showThinking }) => {
  const isHuman = message.sender === "human";

  const renderContent = (
    content: ChatData["chat_messages"][number]["content"]
  ) => {
    return content.map((item, index) => {
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
                        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                          <code {...props} className={className}>
                            {children}
                          </code>
                        </pre>
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
