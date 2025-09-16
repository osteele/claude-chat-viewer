import JSZip from "jszip";
import { AlertCircle, Archive, CheckCircle, Clipboard, FileJson, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ZodInvalidUnionIssue, ZodIssue, z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import sampleBusiness from "../data/sampleConversations/business-strategy.json";
import sampleCooking from "../data/sampleConversations/cooking.json";
import sampleCreativeWriting from "../data/sampleConversations/creative-writing.json";
import sampleData from "../data/sampleConversations/data.json";
import sampleHistory from "../data/sampleConversations/history.json";
import sampleMath from "../data/sampleConversations/math-tutoring.json";
// Import sample conversations
import samplePython from "../data/sampleConversations/python.json";
import sampleWebDev from "../data/sampleConversations/webdev.json";
import { type ChatData, ChatDataSchema } from "../schemas/chat";

type ConversationOption = {
  name: string;
  uuid: string;
  data: ChatData;
};

interface JsonInputProps {
  onValidJson: (data: ChatData) => void;
  onConversationList: (conversations: ChatData[], warning?: string) => void;
}

export const JsonInput: React.FC<JsonInputProps> = ({ onValidJson, onConversationList }) => {
  const [jsonText, setJsonText] = useState("");
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidJson, setIsValidJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const processJsonData = (data: unknown) => {
    // Handle array of conversations
    if (Array.isArray(data)) {
      if (data.length === 0) {
        setError("JSON array is empty.");
        return;
      }

      // Validate each conversation in the array as ChatData
      const validationResults = (data as unknown[]).map((conversation: unknown, index: number) => {
        const result = ChatDataSchema.safeParse(conversation);
        if (!result.success) {
          const convName =
            (conversation as { name?: string } | null | undefined)?.name ||
            `Conversation ${index + 1}`;
          console.error(`Validation failed for ${convName}:`);

          // Log errors in readable format
          const errors: string[] = [];
          (result.error.errors as ZodIssue[]).forEach((err) => {
            if (err.code === "invalid_union" && (err as ZodInvalidUnionIssue).unionErrors) {
              (err as ZodInvalidUnionIssue).unionErrors.forEach((unionError) => {
                if (unionError.errors && unionError.errors.length > 0) {
                  unionError.errors.slice(0, 3).forEach((e) => {
                    const path = e.path.join(".");
                    const message = e.message || "Required field missing";
                    if (path) {
                      errors.push(`  - ${path}: ${message}`);
                    }
                  });
                }
              });
            } else {
              const path = err.path.join(".");
              const message = err.message || "Validation error";
              if (path) {
                errors.push(`  - ${path}: ${message}`);
              }
            }
          });

          if (errors.length > 0) {
            console.error(errors.slice(0, 5).join("\n"));
            if (errors.length > 5) {
              console.error(`  ... and ${errors.length - 5} more errors`);
            }
          }
        }
        return { index, result, conversation };
      });

      const validConversations = validationResults
        .filter((item) => item.result.success)
        .map((item) => item.result.data as ChatData);

      const invalidConversations = validationResults.filter((item) => !item.result.success);

      if (validConversations.length > 1) {
        // Multiple valid conversations - show conversation browser
        let warningMsg: string | undefined;
        if (invalidConversations.length > 0) {
          const errorDetails: string[] = [];
          errorDetails.push(
            `❌ Partially loaded: ${validConversations.length} of ${data.length} conversations were valid.\n`,
          );
          errorDetails.push(
            `${invalidConversations.length} conversation(s) had validation errors and were skipped:\n`,
          );

          // Show details of first few invalid conversations
          invalidConversations.slice(0, 3).forEach((item) => {
            const convName =
              (item.conversation as { name?: string })?.name || `Conversation ${item.index + 1}`;
            errorDetails.push(`\n• ${convName}:`);

            // Get the actual validation errors
            if (item.result?.error?.errors) {
              const errors = item.result.error.errors;

              // Process union errors to get actual validation details
              const processedErrors: string[] = [];
              (errors as ZodIssue[]).forEach((err) => {
                if (err.code === "invalid_union" && (err as ZodInvalidUnionIssue).unionErrors) {
                  // Extract errors from union attempts
                  (err as ZodInvalidUnionIssue).unionErrors.forEach((unionError) => {
                    if (unionError.errors && unionError.errors.length > 0) {
                      unionError.errors.slice(0, 2).forEach((e) => {
                        const path = e.path.join(".");
                        if (path && e.message !== "Invalid input") {
                          processedErrors.push(`  - At "${path}": ${e.message}`);
                        }
                      });
                    }
                  });
                } else {
                  const path = err.path.join(".");
                  const message =
                    err.message === "Invalid input" ? "Invalid data format" : err.message;
                  if (path) {
                    processedErrors.push(`  - At "${path}": ${message}`);
                  } else {
                    processedErrors.push(`  - ${message}`);
                  }
                }
              });

              // Add the first few processed errors
              if (processedErrors.length > 0) {
                processedErrors.slice(0, 3).forEach((error) => {
                  errorDetails.push(error);
                });
                if (processedErrors.length > 3) {
                  errorDetails.push(`  - ... and ${processedErrors.length - 3} more errors`);
                }
              } else {
                errorDetails.push(`  - Validation failed (check console for details)`);
              }
            } else {
              errorDetails.push(`  - Validation failed (no specific errors available)`);
            }
          });

          if (invalidConversations.length > 3) {
            errorDetails.push(
              `\n... and ${invalidConversations.length - 3} more conversations with errors`,
            );
          }

          errorDetails.push("\n🐛 Unexpected error?");
          errorDetails.push("If this file was downloaded directly from Claude's export feature:");
          errorDetails.push(
            "1. Check existing issues: https://github.com/osteele/claude-chat-viewer/issues",
          );
          errorDetails.push(
            "2. Report new issue: https://github.com/osteele/claude-chat-viewer/issues/new",
          );

          warningMsg = errorDetails.join("\n");
          console.log("Warning message being sent:", warningMsg);
        }
        onConversationList(validConversations, warningMsg);
        setError(null);
        setOptions([]);
        return;
      }
      if (validConversations.length === 1) {
        // Single valid conversation - check if we should show it directly or in browser
        if (invalidConversations.length > 0) {
          // If there were other invalid conversations, show in browser with warning
          const errorDetails: string[] = [];
          errorDetails.push(`❌ Partially loaded: 1 of ${data.length} conversations was valid.\n`);
          errorDetails.push(
            `${invalidConversations.length} conversation(s) had validation errors:\n`,
          );

          invalidConversations.slice(0, 3).forEach((item) => {
            const convName =
              (item.conversation as { name?: string })?.name || `Conversation ${item.index + 1}`;
            errorDetails.push(`\n• ${convName}:`);

            // Get the actual validation errors
            if (item.result?.error?.errors) {
              const errors = item.result.error.errors;

              // Process union errors to get actual validation details
              const processedErrors: string[] = [];
              (errors as ZodIssue[]).forEach((err) => {
                if (err.code === "invalid_union" && (err as ZodInvalidUnionIssue).unionErrors) {
                  // Extract errors from union attempts
                  (err as ZodInvalidUnionIssue).unionErrors.forEach((unionError) => {
                    if (unionError.errors && unionError.errors.length > 0) {
                      unionError.errors.slice(0, 2).forEach((e) => {
                        const path = e.path.join(".");
                        if (path && e.message !== "Invalid input") {
                          processedErrors.push(`  - At "${path}": ${e.message}`);
                        }
                      });
                    }
                  });
                } else {
                  const path = err.path.join(".");
                  const message =
                    err.message === "Invalid input" ? "Invalid data format" : err.message;
                  if (path) {
                    processedErrors.push(`  - At "${path}": ${message}`);
                  } else {
                    processedErrors.push(`  - ${message}`);
                  }
                }
              });

              // Add the first few processed errors
              if (processedErrors.length > 0) {
                processedErrors.slice(0, 3).forEach((error) => {
                  errorDetails.push(error);
                });
                if (processedErrors.length > 3) {
                  errorDetails.push(`  - ... and ${processedErrors.length - 3} more errors`);
                }
              } else {
                errorDetails.push(`  - Validation failed (check console for details)`);
              }
            } else {
              errorDetails.push(`  - Validation failed (no specific errors available)`);
            }
          });

          errorDetails.push("\n🐛 Unexpected error?");
          errorDetails.push("If this file was downloaded directly from Claude's export feature:");
          errorDetails.push(
            "1. Check existing issues: https://github.com/osteele/claude-chat-viewer/issues",
          );
          errorDetails.push(
            "2. Report new issue: https://github.com/osteele/claude-chat-viewer/issues/new",
          );

          const warningMsg = errorDetails.join("\n");
          onConversationList(validConversations, warningMsg);
        } else {
          // Only one conversation and it's valid - show it directly
          onValidJson(validConversations[0]);
        }
        setError(null);
        setOptions([]);
        return;
      }

      // If we get here, no valid conversations were found
      const errorDetails: string[] = [];
      errorDetails.push(
        `❌ No valid conversations found in the file (0 of ${data.length} conversations could be loaded)\n`,
      );

      // Show details of first few invalid conversations
      invalidConversations.slice(0, 3).forEach((item) => {
        const convName =
          (item.conversation as { name?: string })?.name || `Conversation ${item.index + 1}`;
        errorDetails.push(`\n📄 ${convName}:`);

        const firstErrors = item.result.error?.errors.slice(0, 2) || [];
        firstErrors.forEach((err: z.ZodIssue) => {
          const path = err.path.join(".");
          if (path) {
            errorDetails.push(`  • At "${path}": ${err.message}`);
          } else {
            errorDetails.push(`  • ${err.message}`);
          }
        });

        if (item.result.error?.errors && item.result.error.errors.length > 2) {
          errorDetails.push(`  • ... and ${item.result.error.errors.length - 2} more errors`);
        }
      });

      if (invalidConversations.length > 3) {
        errorDetails.push(
          `\n... and ${invalidConversations.length - 3} more conversations with errors`,
        );
      }

      errorDetails.push("\n💡 This might be:");
      errorDetails.push("• A corrupted export file");
      errorDetails.push("• An incompatible format from an older Claude version");
      errorDetails.push("• A modified or incomplete JSON file");

      setError(errorDetails.join("\n"));
      return;
    }

    // Single conversation object
    const result = ChatDataSchema.safeParse(data);
    if (result.success) {
      // Only cache if not skipping and file is reasonably small
      onValidJson(result.data);
      setError(null);
      setOptions([]);
    } else {
      // Log validation errors to console in a readable format
      console.error("Conversation validation failed:");

      // Extract and log the most relevant errors
      const relevantErrors: string[] = [];
      (result.error.errors as ZodIssue[]).forEach((err) => {
        if (err.code === "invalid_union" && (err as ZodInvalidUnionIssue).unionErrors) {
          (err as ZodInvalidUnionIssue).unionErrors.forEach((unionError) => {
            if (unionError.errors && unionError.errors.length > 0) {
              unionError.errors.slice(0, 5).forEach((e) => {
                const path = e.path.join(".");
                const message = e.message || "Required field missing";
                if (path) {
                  relevantErrors.push(`  - ${path}: ${message}`);
                } else {
                  relevantErrors.push(`  - ${message}`);
                }
              });
            }
          });
        } else {
          const path = err.path.join(".");
          const message = err.message || "Validation error";
          if (path) {
            relevantErrors.push(`  - ${path}: ${message}`);
          } else {
            relevantErrors.push(`  - ${message}`);
          }
        }
      });

      if (relevantErrors.length > 0) {
        console.error(`Validation errors:\n${relevantErrors.slice(0, 10).join("\n")}`);
        if (relevantErrors.length > 10) {
          console.error(`  ... and ${relevantErrors.length - 10} more errors`);
        }
      } else {
        console.error("  File structure doesn't match expected Claude conversation format");
      }

      // Create a more user-friendly error message
      const allErrors = result.error.errors;
      const errorSummary: string[] = [];

      // Group errors by message path for better readability
      const errorsByPath = new Map<string, string[]>();

      // For union errors, Zod nests the actual errors inside
      const processError = (err: z.ZodIssue & { unionErrors?: unknown[] }) => {
        const path = err.path.join(".");
        let message = err.message;

        // Handle union errors specially - they contain the actual validation errors
        if (err.code === "invalid_union" && err.unionErrors) {
          // Extract the most relevant errors from the union attempts
          const relevantErrors: string[] = [];
          (err as ZodInvalidUnionIssue).unionErrors?.forEach((ue) => {
            if (ue.errors && ue.errors.length > 0) {
              // Get the first few meaningful errors from each schema attempt
              ue.errors.slice(0, 3).forEach((e) => {
                const subPath = e.path.join(".");
                if (subPath && e.message !== "Invalid input") {
                  relevantErrors.push(`${subPath}: ${e.message}`);
                }
              });
            }
          });

          if (relevantErrors.length > 0) {
            // Skip adding this union error and process the nested errors instead
            relevantErrors.forEach((error) => {
              const [errPath, errMsg] = error.split(": ");
              if (!errorsByPath.has(errPath)) {
                errorsByPath.set(errPath, []);
              }
              errorsByPath.get(errPath)?.push(errMsg);
            });
            return; // Don't add the union error itself
          }
          // If no relevant errors were extracted, show the raw union errors
          if (
            (err as ZodInvalidUnionIssue).unionErrors &&
            (err as ZodInvalidUnionIssue).unionErrors.length > 0
          ) {
            (err as ZodInvalidUnionIssue).unionErrors.forEach((unionError) => {
              if (unionError.errors && unionError.errors.length > 0) {
                unionError.errors.slice(0, 5).forEach((e) => {
                  const subPath = e.path.join(".");
                  const subMessage = e.message || "Required field missing";
                  if (!errorsByPath.has(subPath)) {
                    errorsByPath.set(subPath, []);
                  }
                  errorsByPath.get(subPath)?.push(subMessage);
                });
              }
            });
            return;
          }
          message = "Data doesn't match expected conversation format";
        } else if (message === "Invalid input") {
          if (err.code === "invalid_type") {
            message = `Expected ${err.expected}, got ${err.received}`;
          } else {
            message = "Invalid data format";
          }
        }

        if (!errorsByPath.has(path)) {
          errorsByPath.set(path, []);
        }
        errorsByPath.get(path)?.push(message);
      };

      allErrors.forEach(processError);

      // Build user-friendly error message
      errorSummary.push("❌ This file cannot be loaded due to validation errors:\n");

      let errorCount = 0;
      errorsByPath.forEach((messages, path) => {
        errorCount++;
        if (errorCount <= 10) {
          // Show first 10 errors for more detail
          if (path) {
            errorSummary.push(`• At "${path}": ${messages.join(", ")}`);
          } else {
            errorSummary.push(`• ${messages.join(", ")}`);
          }
        }
      });

      if (errorCount > 10) {
        errorSummary.push(`\n... and ${errorCount - 10} more errors`);
      } else if (errorCount === 0) {
        // If no specific errors were extracted, show a generic message
        errorSummary.push(
          `• The file structure doesn't match any expected Claude conversation format`,
        );
        errorSummary.push(
          `• Missing required fields: uuid, name, created_at, updated_at, chat_messages`,
        );
      }

      // Add helpful context
      errorSummary.push("\n💡 Common issues:");
      errorSummary.push("• Ensure this is a Claude conversation export");
      errorSummary.push("• Check that the JSON structure hasn't been modified");
      errorSummary.push("• Verify all required fields are present");

      errorSummary.push("\n🐛 Unexpected error?");
      errorSummary.push(
        "If this file was downloaded directly from Claude's export feature and hasn't been modified:",
      );
      errorSummary.push(
        "1. Check if this issue has been reported: https://github.com/osteele/claude-chat-viewer/issues",
      );
      errorSummary.push(
        "2. If not, please report it: https://github.com/osteele/claude-chat-viewer/issues/new",
      );
      errorSummary.push("   Include the error details above when reporting.");

      const errorMessage = errorSummary.join("\n");
      setError(errorMessage);
    }
  };

  const handleSubmit = () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON data or upload a file first.");
      return;
    }

    let parsedData: unknown;
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
          processJsonData(parsedData);
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

    // Handle JSON files
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setJsonText(content);
        try {
          const parsedData = JSON.parse(content);
          processJsonData(parsedData);
        } catch (err) {
          console.error("JSON parse error:", err);
          if (err instanceof Error) {
            setError(`Invalid JSON file: ${err.message}`);
          } else {
            setError("Failed to parse JSON file");
          }
        }
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

  const loadSampleData = () => {
    // Assemble sample conversations from imported files
    const sampleConversations = [
      samplePython,
      sampleWebDev,
      sampleData,
      sampleCreativeWriting,
      sampleMath,
      sampleBusiness,
      sampleCooking,
      sampleHistory,
    ];

    // Load the sample conversations using the same flow as multiple conversation files
    setError(null);
    setOptions([]);
    onConversationList(sampleConversations as ChatData[]);
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
