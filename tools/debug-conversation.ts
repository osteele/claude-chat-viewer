#!/usr/bin/env bun

/**
 * CLI tool to debug specific conversations and content items in Claude conversation JSON files
 *
 * Usage:
 *   bun tools/debug-conversation.ts <file-path> [conversation-index] [message-index] [content-index]
 *
 * Examples:
 *   # Show all conversations in a file
 *   bun tools/debug-conversation.ts ./inputs/conversations.json
 *
 *   # Show specific conversation
 *   bun tools/debug-conversation.ts ./inputs/conversations.json 115
 *
 *   # Show specific message in conversation
 *   bun tools/debug-conversation.ts ./inputs/conversations.json 115 3
 *
 *   # Show specific content item
 *   bun tools/debug-conversation.ts ./inputs/conversations.json 115 3 6
 */

import fs from "node:fs";
import path from "node:path";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function printUsage() {
  console.log(`
${colors.bold}Usage:${colors.reset}
  bun tools/debug-conversation.ts <file-path> [conversation-index] [message-index] [content-index]

${colors.bold}Arguments:${colors.reset}
  file-path           Path to the JSON file
  conversation-index  Index of conversation to inspect (for arrays)
  message-index       Index of message within conversation
  content-index       Index of content item within message

${colors.bold}Examples:${colors.reset}
  # List all conversations
  bun tools/debug-conversation.ts ./inputs/conversations.json

  # Inspect conversation at index 115
  bun tools/debug-conversation.ts ./inputs/conversations.json 115

  # Inspect message 3 in conversation 115
  bun tools/debug-conversation.ts ./inputs/conversations.json 115 3

  # Inspect content item 6 in message 3
  bun tools/debug-conversation.ts ./inputs/conversations.json 115 3 6

${colors.bold}Description:${colors.reset}
  Helps debug validation errors by showing the structure of specific
  conversations, messages, and content items.
  `);
}

function showConversationsList(data: any[]) {
  console.log(
    `${colors.blue}Found ${colors.bold}${data.length}${colors.reset}${colors.blue} conversations:${colors.reset}\n`,
  );

  data.forEach((conv, index) => {
    const messageCount = conv.chat_messages?.length || 0;
    const name = conv.name || "Unnamed";
    console.log(
      `  ${colors.gray}[${index}]${colors.reset} ${name} ${colors.gray}(${messageCount} messages)${colors.reset}`,
    );
  });

  console.log(
    `\n${colors.yellow}Tip:${colors.reset} Add an index to inspect a specific conversation`,
  );
}

function showConversation(conv: any, index: number) {
  console.log(
    `${colors.blue}Conversation [${index}]:${colors.reset} ${colors.bold}${conv.name || "Unnamed"}${colors.reset}\n`,
  );

  console.log(`${colors.cyan}Metadata:${colors.reset}`);
  console.log(`  UUID: ${conv.uuid}`);
  console.log(`  Created: ${conv.created_at}`);
  console.log(`  Updated: ${conv.updated_at}`);
  if (conv.summary) console.log(`  Summary: ${conv.summary}`);

  console.log(`\n${colors.cyan}Messages (${conv.chat_messages?.length || 0}):${colors.reset}`);

  conv.chat_messages?.forEach((msg: any, msgIndex: number) => {
    const contentCount = msg.content?.length || 0;
    const preview = msg.text?.substring(0, 60)?.replace(/\n/g, " ") || "";
    const sender = msg.sender === "human" ? "👤 Human" : "🤖 Assistant";

    console.log(
      `  ${colors.gray}[${msgIndex}]${colors.reset} ${sender} ${colors.gray}(${contentCount} content items)${colors.reset}`,
    );
    console.log(
      `      ${colors.gray}"${preview}${msg.text?.length > 60 ? "..." : ""}"${colors.reset}`,
    );
  });

  console.log(
    `\n${colors.yellow}Tip:${colors.reset} Add a message index to inspect specific message content`,
  );
}

function showMessage(msg: any, convIndex: number, msgIndex: number) {
  const sender = msg.sender === "human" ? "👤 Human" : "🤖 Assistant";

  console.log(`${colors.blue}Message [${convIndex}][${msgIndex}]:${colors.reset} ${sender}\n`);

  console.log(`${colors.cyan}Metadata:${colors.reset}`);
  console.log(`  UUID: ${msg.uuid}`);
  console.log(`  Created: ${msg.created_at}`);
  console.log(`  Sender: ${msg.sender}`);
  if (msg.index !== undefined) console.log(`  Index: ${msg.index}`);

  console.log(`\n${colors.cyan}Text:${colors.reset}`);
  console.log(
    `  ${colors.gray}${msg.text?.substring(0, 200)}${msg.text?.length > 200 ? "..." : ""}${colors.reset}`,
  );

  console.log(`\n${colors.cyan}Content items (${msg.content?.length || 0}):${colors.reset}`);

  msg.content?.forEach((item: any, itemIndex: number) => {
    const type = item.type;
    let description = "";

    if (type === "text") {
      description = item.text?.substring(0, 50)?.replace(/\n/g, " ") || "";
    } else if (type === "thinking") {
      description = item.thinking?.substring(0, 50)?.replace(/\n/g, " ") || "";
    } else if (type === "tool_use") {
      description = `${item.name} - ${item.input?.title || item.input?.id || "unknown"}`;
    } else if (type === "tool_result") {
      description = `${item.name} - ${item.is_error ? "error" : "success"}`;
    }

    const typeColor =
      type === "text"
        ? colors.green
        : type === "thinking"
          ? colors.magenta
          : type === "tool_use"
            ? colors.cyan
            : type === "tool_result"
              ? colors.yellow
              : colors.gray;

    console.log(
      `  ${colors.gray}[${itemIndex}]${colors.reset} ${typeColor}${type}${colors.reset}: ${colors.gray}${description}${colors.reset}`,
    );
  });

  console.log(
    `\n${colors.yellow}Tip:${colors.reset} Add a content index to inspect specific content item`,
  );
}

function showContentItem(item: any, convIndex: number, msgIndex: number, contentIndex: number) {
  console.log(
    `${colors.blue}Content Item [${convIndex}][${msgIndex}][${contentIndex}]:${colors.reset}\n`,
  );

  console.log(`${colors.cyan}Type:${colors.reset} ${colors.bold}${item.type}${colors.reset}`);
  console.log(`${colors.cyan}Keys:${colors.reset} ${Object.keys(item).join(", ")}`);

  console.log(`\n${colors.cyan}Full content:${colors.reset}`);
  console.log(JSON.stringify(item, null, 2));

  // Show specific details based on type
  if (item.type === "thinking" && item.summaries) {
    console.log(`\n${colors.cyan}Summaries (${item.summaries.length}):${colors.reset}`);
    item.summaries.forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.summary || s}`);
    });
  }

  if (item.type === "tool_use" && item.input) {
    console.log(`\n${colors.cyan}Tool Input:${colors.reset}`);
    console.log(`  Name: ${item.name}`);
    console.log(`  ID: ${item.input.id || "none"}`);
    console.log(`  Type: ${item.input.type || "none"}`);
    console.log(`  Title: ${item.input.title || "none"}`);
    if (item.input.content) {
      console.log(`  Content: ${item.input.content.substring(0, 100)}...`);
    }
  }
}

function debugFile(filePath: string, convIndex?: number, msgIndex?: number, contentIndex?: number) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}Error:${colors.reset} File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Handle single conversation vs array
    const isArray = Array.isArray(data);
    const conversations = isArray ? data : [data];

    // No index specified - show list
    if (convIndex === undefined) {
      if (isArray) {
        showConversationsList(conversations);
      } else {
        showConversation(data, 0);
      }
      return;
    }

    // Validate conversation index
    if (convIndex < 0 || convIndex >= conversations.length) {
      console.error(
        `${colors.red}Error:${colors.reset} Conversation index ${convIndex} out of range (0-${conversations.length - 1})`,
      );
      process.exit(1);
    }

    const conv = conversations[convIndex];

    // No message index - show conversation
    if (msgIndex === undefined) {
      showConversation(conv, convIndex);
      return;
    }

    // Validate message index
    if (!conv.chat_messages || msgIndex < 0 || msgIndex >= conv.chat_messages.length) {
      console.error(
        `${colors.red}Error:${colors.reset} Message index ${msgIndex} out of range (0-${(conv.chat_messages?.length || 0) - 1})`,
      );
      process.exit(1);
    }

    const msg = conv.chat_messages[msgIndex];

    // No content index - show message
    if (contentIndex === undefined) {
      showMessage(msg, convIndex, msgIndex);
      return;
    }

    // Validate content index
    if (!msg.content || contentIndex < 0 || contentIndex >= msg.content.length) {
      console.error(
        `${colors.red}Error:${colors.reset} Content index ${contentIndex} out of range (0-${(msg.content?.length || 0) - 1})`,
      );
      process.exit(1);
    }

    const contentItem = msg.content[contentIndex];
    showContentItem(contentItem, convIndex, msgIndex, contentIndex);
  } catch (error: any) {
    if (error.message.includes("JSON")) {
      console.error(`${colors.red}Error:${colors.reset} Invalid JSON in file`);
      console.error(`  ${error.message}`);
    } else {
      console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
    }
    process.exit(1);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  const filePath = path.resolve(args[0]);
  const convIndex = args[1] ? parseInt(args[1], 10) : undefined;
  const msgIndex = args[2] ? parseInt(args[2], 10) : undefined;
  const contentIndex = args[3] ? parseInt(args[3], 10) : undefined;

  // Validate numeric arguments
  if (args[1] && Number.isNaN(convIndex!)) {
    console.error(`${colors.red}Error:${colors.reset} Conversation index must be a number`);
    process.exit(1);
  }
  if (args[2] && Number.isNaN(msgIndex!)) {
    console.error(`${colors.red}Error:${colors.reset} Message index must be a number`);
    process.exit(1);
  }
  if (args[3] && Number.isNaN(contentIndex!)) {
    console.error(`${colors.red}Error:${colors.reset} Content index must be a number`);
    process.exit(1);
  }

  debugFile(filePath, convIndex, msgIndex, contentIndex);
}

main();
