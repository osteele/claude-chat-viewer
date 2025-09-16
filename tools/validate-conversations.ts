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
import type { ZodInvalidUnionIssue, ZodIssue } from "zod";
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

          // Get the first few errors for this conversation
          const firstErrors = result.error.errors.slice(0, 3);

          // Check for union errors to get more specific information
          const unionError = result.error.errors.find(
            (e): e is ZodInvalidUnionIssue => e.code === "invalid_union",
          );
          let specificErrors: ZodIssue[] = firstErrors as ZodIssue[];

          if (unionError?.unionErrors && unionError.unionErrors.length > 0) {
            // Get the most relevant error from union attempts
            const relevantUnion = unionError.unionErrors[unionError.unionErrors.length - 1];
            if (relevantUnion.errors && relevantUnion.errors.length > 0) {
              specificErrors = relevantUnion.errors.slice(0, 3);
            }
          }

          errors.push({
            index,
            name,
            errors: specificErrors,
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

        // Get specific errors
        const errors = result.error.errors as ZodIssue[];
        const unionError = errors.find(
          (e): e is ZodInvalidUnionIssue => e.code === "invalid_union",
        );

        if (unionError?.unionErrors) {
          // Show the most specific error from union attempts
          unionError.unionErrors.forEach((ue, i: number) => {
            if (ue.errors && ue.errors.length > 0) {
              console.log();
              console.log(`${colors.gray}Schema attempt ${i + 1}:${colors.reset}`);
              ue.errors.slice(0, 3).forEach((e) => {
                console.log(formatError(e));
              });
            }
          });
        } else {
          // Show regular errors
          errors.slice(0, 10).forEach((e) => {
            console.log(formatError(e));
          });
        }

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
