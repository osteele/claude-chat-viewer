import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatData, ChatMessage } from "../schemas/chat";
import { parseMessage } from "./messageParser";
import Prism from "./prism-languages";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
    .replace(/[*_~`]/g, "") // Remove basic markdown symbols
    .replace(/^\s*[#-]\s+/gm, "") // Remove headers and list markers
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, __, code) => code.trim()); // Remove code block markers and language but keep content
}

export function chatToText(data: ChatData): string {
  return data.chat_messages
    .map((message: ChatMessage) => {
      const sender = message.sender === "human" ? "Human" : "Claude";
      const content = message.content
        .map((item: { type: string; text?: string }) => {
          if (item.type === "text") {
            // Handle code blocks before stripping markdown
            const text = (item.text ?? "").replace(
              /```(\w+)?\n([\s\S]*?)```/g,
              (_, __, code) => code.trim()
            );
            return stripMarkdown(text);
          }
          return "";
        })
        .join("\n")
        .trim();
      return `${sender}:\n${content}\n`;
    })
    .join("\n");
}

export function chatToHtml(data: ChatData): string {
  return data.chat_messages
    .map((message: ChatMessage) => {
      const sender = message.sender === "human" ? "Human" : "Claude";
      const content = message.content
        .map(
          (item: {
            type: string;
            text?: string;
            language?: string;
            input?: { title: string; content: string; language?: string };
          }) => {
            if (item.type === "text") {
              return (
                (item.text ?? "")
                  // Convert code blocks with language
                  .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
                    const language = lang || "text";
                    let highlightedCode;
                    try {
                      const grammar = Prism.languages[language] || Prism.languages.plaintext || Prism.languages.text || {};
                      highlightedCode = Prism.highlight(
                        code.trim(),
                        grammar,
                        language
                      );
                    } catch (error) {
                      // If highlighting fails, just escape the HTML
                      console.warn(`Failed to highlight code for language: ${language}`, error);
                      highlightedCode = code.trim()
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    }
                    return `<pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>`;
                  })
                  // Convert inline code
                  .replace(
                    /`([^`]+)`/g,
                    '<code style="font-family: monospace; background-color: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px;">$1</code>'
                  )
                  // Convert bold
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  // Convert italic
                  .replace(/\*(.*?)\*/g, "<em>$1</em>")
                  // Convert newlines
                  .replace(/\n/g, "<br>")
              );
            } else if (item.type === "tool_use" && item.input) {
              const language = item.input.language || "text";
              const content = item.input.content || "";
              let highlightedCode;
              try {
                const grammar = Prism.languages[language] || Prism.languages.plaintext || Prism.languages.text || {};
                highlightedCode = Prism.highlight(
                  content.trim(),
                  grammar,
                  language
                );
              } catch (error) {
                console.warn(`Failed to highlight code for language: ${language}`, error);
                highlightedCode = content.trim()
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
              }
              return `<div><strong>${item.input.title}</strong><pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre></div>`;
            }
            return "";
          }
        )
        .join("");
      return `<p><strong>${sender}:</strong></p><p>${content}</p>`;
    })
    .join("\n");
}

interface LineMap {
  [path: string]: number;
}

function buildLineMap(json: string): LineMap {
  const lines = json.split("\n");
  const lineMap: LineMap = {};
  let currentPath: string[] = [];
  let arrayIndices: { [key: string]: number } = {};

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmedLine = line.trim();

    // Handle array elements
    if (trimmedLine === "{") {
      const currentPathStr = currentPath.join(".");
      if (arrayIndices[currentPathStr] !== undefined) {
        arrayIndices[currentPathStr]++;
        // Store the line number for the array element itself
        const arrayPath = [
          ...currentPath,
          arrayIndices[currentPathStr].toString(),
        ].join(".");
        lineMap[arrayPath] = lineNum + 1;
      }
    }

    // Handle property names
    const propertyMatch = trimmedLine.match(/^"([^"]+)"\s*:/);
    if (propertyMatch) {
      const key = propertyMatch[1];
      const currentPathStr = currentPath.join(".");
      const arrayIndex = arrayIndices[currentPathStr];

      // Build the full path including array indices
      const pathParts = [...currentPath];
      if (arrayIndex !== undefined) {
        pathParts.push(arrayIndex.toString());
      }
      pathParts.push(key);
      const fullPath = pathParts.join(".");

      // Store the line number for this property
      lineMap[fullPath] = lineNum + 1;

      // Look ahead for nested structures
      const valueMatch = line.match(/:\s*(.+)$/);
      if (valueMatch) {
        const value = valueMatch[1].trim();
        if (value === "[") {
          currentPath.push(key);
          arrayIndices[currentPath.join(".")] = -1;
        } else if (value === "{") {
          currentPath.push(key);
        }
      }

      // Store line numbers for all parent paths
      let parentPath = "";
      for (const part of pathParts) {
        parentPath = parentPath ? `${parentPath}.${part}` : part;
        if (!lineMap[parentPath]) {
          lineMap[parentPath] = lineNum + 1;
        }
      }
    }

    // Handle closing brackets
    if (trimmedLine === "}" || trimmedLine === "},") {
      currentPath.pop();
    } else if (trimmedLine === "]" || trimmedLine === "],") {
      delete arrayIndices[currentPath.join(".")];
      currentPath.pop();
    }
  }

  return lineMap;
}

interface MarkdownOptions {
  showThinking?: boolean;
  showArtifacts?: boolean;
  showColophon?: boolean;
}

export function chatToMarkdown(data: ChatData, options: MarkdownOptions = {}): string {
  const { showThinking = false, showArtifacts = true, showColophon = true } = options;
  
  let markdown = `# ${data.name || "Untitled Conversation"}\n\n`;
  
  // Add metadata
  markdown += `**Created:** ${new Date(data.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n`;
  
  markdown += `**Updated:** ${new Date(data.updated_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n`;
  
  markdown += "---\n\n";
  
  // Add messages
  data.chat_messages.forEach((message: ChatMessage) => {
    const sender = message.sender === "human" ? "**Human**" : "**Claude**";
    markdown += `## ${sender}\n\n`;
    
    message.content.forEach((item) => {
      if (item.type === "text" && item.text) {
        const segments = message.sender === "human" ? [{ type: "text" as const, content: item.text }] : parseMessage(item.text);
        
        segments.forEach(segment => {
          if (segment.type === "text") {
            markdown += segment.content + "\n\n";
          } else if (segment.type === "thinking" && showThinking) {
            markdown += `> 💭 **Thinking Process**\n> ${segment.content.split('\n').join('\n> ')}\n\n`;
          } else if (segment.type === "code") {
            const lang = segment.language || "";
            markdown += `\`\`\`${lang}\n${segment.content}\n\`\`\`\n\n`;
          } else if (segment.type === "artifact" && showArtifacts) {
            markdown += `### 📄 Artifact: ${segment.title}\n\n`;
            markdown += `\`\`\`${segment.artifactType || ""}\n${segment.content}\n\`\`\`\n\n`;
          }
        });
      } else if (item.type === "tool_use" && item.input && showArtifacts) {
        markdown += `### 📄 Artifact: ${item.input.title}\n\n`;
        const lang = item.input.language || item.input.type || "";
        markdown += `\`\`\`${lang}\n${item.input.content}\n\`\`\`\n\n`;
      }
    });
  });
  
  // Add colophon
  if (showColophon) {
    markdown += "---\n\n";
    markdown += "*Rendered by [Claude Chat Viewer](https://github.com/osteele/claude-chat-viewer)*\n";
    markdown += "*An open-source tool for viewing Claude chat exports*\n";
  }
  
  return markdown;
}

export function formatValidationErrors(
  json: string,
  errors: Array<{ path: string; message: string }>
): string {
  const lineMap = buildLineMap(json);

  const formattedErrors = errors.map((error) => {
    // Convert array notation in path if needed
    const normalizedPath = error.path.replace(/\[(\d+)\]/g, ".$1");

    // Try exact path first
    let line = lineMap[normalizedPath];

    // If no exact match, try finding the deepest matching parent path
    if (!line) {
      const pathParts = normalizedPath.split(".");
      let currentPath = "";
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        if (lineMap[currentPath]) {
          line = lineMap[currentPath];
        }
      }
    }

    const lineInfo = line ? ` (line ${line})` : "";
    return `${error.message} at "${error.path}"${lineInfo}`;
  });

  return [
    "The following validation errors were found:",
    ...formattedErrors,
  ].join("\n");
}
