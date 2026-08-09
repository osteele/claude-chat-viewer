#!/usr/bin/env bun

/**
 * CLI tool to validate Claude conversation JSON files
 *
 * Usage:
 *   bun tools/validate-conversations.ts <file-path>
 *
 * Examples:
 *   bun tools/validate-conversations.ts ./testdata/gosper-style-conversation.json
 *   bun tools/validate-conversations.ts ./inputs/conversations.json
 */

import fs from "node:fs";
import path from "node:path";
import type { ZodIssue } from "zod";
import { formatZodIssues } from "../src/lib/conversationImport";
import { ChatDataSchema } from "../src/schemas/chat";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function printUsage() {
  console.log(`
${colors.bold}Usage:${colors.reset}
  bun tools/validate-conversations.ts <file-path>

${colors.bold}Examples:${colors.reset}
  bun tools/validate-conversations.ts ./testdata/gosper-style-conversation.json
  bun tools/validate-conversations.ts ./inputs/conversations.json

${colors.bold}Description:${colors.reset}
  Validates Claude conversation JSON files against the chat schema.
  Supports both single conversations and arrays of conversations.
  `);
}

function formatError(error: ZodIssue | { message: string; path?: (string | number)[] }): string {
  const path = (error as ZodIssue).path ?? (error as { path?: (string | number)[] }).path;
  const message = (error as ZodIssue).message ?? (error as { message: string }).message;
  if (path && path.length > 0) {
    return `  ${colors.gray}Path:${colors.reset} ${path.join(".")} - ${message}`;
  }
  return `  ${message}`;
}

function validateFile(filePath: string) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}Error:${colors.reset} File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`${colors.blue}Validating:${colors.reset} ${filePath}`);
  console.log();

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Check if it's an array of conversations
    if (Array.isArray(data)) {
      console.log(`Found ${colors.bold}${data.length}${colors.reset} conversations in array`);
      console.log();

      let validCount = 0;
      let invalidCount = 0;
      const errors: { index: number; name: string; errors: ZodIssue[] }[] = [];

      data.forEach((conv, index) => {
        const result = ChatDataSchema.safeParse(conv);
        if (result.success) {
          validCount++;
        } else {
          invalidCount++;
          const name = conv?.name || `Conversation ${index + 1}`;

          errors.push({
            index,
            name,
            errors: result.error.issues.slice(0, 3),
          });
        }
      });

      // Print summary
      console.log(`${colors.green}✓ Valid:${colors.reset} ${validCount}`);
      console.log(`${colors.red}✗ Invalid:${colors.reset} ${invalidCount}`);

      if (invalidCount > 0) {
        console.log();
        console.log(`${colors.yellow}Validation errors (showing first 10):${colors.reset}`);

        errors.slice(0, 10).forEach((err) => {
          console.log();
          console.log(`${colors.bold}[${err.index}] ${err.name}${colors.reset}`);
          err.errors.forEach((e) => {
            console.log(formatError(e));
          });
        });

        if (errors.length > 10) {
          console.log();
          console.log(
            `${colors.gray}... and ${errors.length - 10} more conversations with errors${colors.reset}`,
          );
        }
      }

      // Exit with error code if any invalid
      process.exit(invalidCount > 0 ? 1 : 0);
    } else {
      // Single conversation
      const result = ChatDataSchema.safeParse(data);

      if (result.success) {
        console.log(`${colors.green}✓ Valid${colors.reset} conversation`);
        console.log();
        console.log(`  Name: ${result.data.name}`);
        console.log(`  UUID: ${result.data.uuid}`);
        console.log(`  Messages: ${result.data.chat_messages.length}`);

        // Count artifacts
        const artifactCount = result.data.chat_messages
          .flatMap((m) => m.content)
          .filter((c) => c.type === "tool_use" && c.name === "artifacts").length;

        if (artifactCount > 0) {
          console.log(`  Artifacts: ${artifactCount}`);
        }

        process.exit(0);
      } else {
        console.log(`${colors.red}✗ Invalid${colors.reset} conversation`);
        console.log();

        if (data.name) {
          console.log(`  Name: ${data.name}`);
        }

        console.log();
        console.log(`${colors.yellow}Validation errors:${colors.reset}`);

        formatZodIssues(result.error.issues).forEach((line) => {
          console.log(line);
        });

        process.exit(1);
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("JSON")) {
      console.error(`${colors.red}Error:${colors.reset} Invalid JSON in file`);
      console.error(`  ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${colors.red}Error:${colors.reset} ${message}`);
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
  validateFile(filePath);
}

main();
