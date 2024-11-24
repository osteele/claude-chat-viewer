import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatData } from "../schemas/chat";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function stripMarkdown(text: string): string {
  // Basic markdown stripping - can be enhanced based on needs
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
    .replace(/[*_~`]/g, "") // Remove basic markdown symbols
    .replace(/^\s*[#-]\s+/gm, ""); // Remove headers and list markers
}

export function chatToText(data: ChatData): string {
  return data.chat_messages
    .map((message: ChatData["chat_messages"][number]) => {
      const sender = message.sender === "human" ? "Human" : "Claude";
      const content = message.content
        .map((item: { type: string; text?: string }) => {
          if (item.type === "text") {
            return stripMarkdown(item.text ?? "");
          }
          return "";
        })
        .join("\n");
      return `${sender}:\n${content}\n`;
    })
    .join("\n");
}

export function chatToHtml(data: ChatData): string {
  return data.chat_messages
    .map((message: ChatData["chat_messages"][number]) => {
      const sender = message.sender === "human" ? "Human" : "Claude";
      const content = message.content
        .map((item: { type: string; text?: string }) => {
          if (item.type === "text") {
            return (
              (item.text ?? "")
                // Convert code blocks with language
                .replace(
                  /```(\w+)?\n([\s\S]*?)```/g,
                  '<pre style="font-family: monospace; background-color: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto;"><code>$2</code></pre>'
                )
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
          }
          return "";
        })
        .join("\n");
      return `<p><strong>${sender}:</strong></p><p>${content}</p>`;
    })
    .join("\n");
}
