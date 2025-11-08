import { z } from "zod";

const AttachmentSchema = z
  .object({
    id: z.string().optional(), // Made optional for newer export formats
    file_name: z.string().optional(), // Made optional for newer export formats
    file_size: z.number().optional(), // Made optional for newer export formats
    file_type: z.string().optional(), // Made optional for newer export formats
    extracted_content: z.string().optional(),
    created_at: z.string().optional(), // Made optional for newer export formats
  })
  .passthrough(); // Allow additional fields from newer export formats

const ToolUseSchema = z.object({
  type: z.literal("tool_use"),
  name: z.string(),
  input: z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
      title: z.string().optional(),
      command: z.string().optional(),
      content: z.string().optional(),
      language: z.string().nullable().optional(),
      version_uuid: z.string().optional(),
      source: z.string().optional(),
      md_citations: z.array(z.any()).optional(),
    })
    .passthrough(),
  start_timestamp: z.string().nullable().optional(),
  stop_timestamp: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  integration_name: z.string().nullable().optional(),
  integration_icon_url: z.string().nullable().optional(),
  context: z.any().nullable().optional(),
  display_content: z.any().nullable().optional(),
  approval_options: z.any().nullable().optional(),
  approval_key: z.string().nullable().optional(),
});

const ToolResultSchema = z.object({
  type: z.literal("tool_result"),
  name: z.string(),
  content: z.array(
    z
      .object({
        type: z.string(),
        text: z.string(),
        uuid: z.string().optional(),
      })
      .passthrough(),
  ),
  is_error: z.boolean(),
  start_timestamp: z.string().nullable().optional(),
  stop_timestamp: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  integration_name: z.string().nullable().optional(),
  integration_icon_url: z.string().nullable().optional(),
  display_content: z.any().nullable().optional(),
});

// Flexible content item schema that handles both formats
const ContentItemSchema = z.union([
  z
    .object({
      type: z.literal("text"),
      text: z.string(),
      start_timestamp: z.string().nullable().optional(),
      stop_timestamp: z.string().nullable().optional(),
      citations: z.array(z.any()).optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("thinking"),
      thinking: z.string(),
      start_timestamp: z.string().nullable().optional(),
      stop_timestamp: z.string().nullable().optional(),
      summaries: z.array(z.any()).optional(),
      cut_off: z.boolean().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("voice_note"),
      title: z.string().optional(),
      text: z.string(),
      start_timestamp: z.string().nullable().optional(),
      stop_timestamp: z.string().nullable().optional(),
    })
    .passthrough(),
  ToolUseSchema,
  ToolResultSchema,
]);

const ThumbnailAssetSchema = z
  .object({
    url: z.string(),
    file_variant: z.string(),
    primary_color: z.string(),
    image_width: z.number(),
    image_height: z.number(),
  })
  .optional();

const PreviewAssetSchema = z
  .object({
    url: z.string(),
    file_variant: z.string(),
    primary_color: z.string(),
    image_width: z.number(),
    image_height: z.number(),
  })
  .optional();

const FileSchema = z
  .object({
    file_kind: z.string().optional(),
    file_uuid: z.string().optional(), // Made optional for newer export formats
    file_name: z.string().optional(), // Made optional for newer export formats
    created_at: z.string().optional(), // Made optional for newer export formats
    thumbnail_url: z.string().optional(),
    preview_url: z.string().optional(),
    thumbnail_asset: ThumbnailAssetSchema,
    preview_asset: PreviewAssetSchema,
  })
  .passthrough(); // Allow additional fields from newer export formats

const ChatMessageSchema = z
  .object({
    uuid: z.string().describe("Message unique identifier"),
    index: z.number().default(0).describe("Message index in conversation"), // Default to 0 if not present
    sender: z.enum(["human", "assistant"]).describe("Message sender"),
    content: z
      .array(ContentItemSchema, {
        required_error: "Message content is required",
        invalid_type_error: "Message content must be an array",
      })
      .describe("Message content items"),
    text: z.string().optional().describe("Message text"), // Made optional for newer export formats
    created_at: z.string().describe("Creation timestamp"),
    updated_at: z.string().describe("Update timestamp"),
    truncated: z.boolean().default(false),
    attachments: z.array(AttachmentSchema).optional(),
    files: z.array(FileSchema).optional(),
    files_v2: z.array(FileSchema).optional(),
    sync_sources: z.array(z.any()).optional(),
    parent_message_uuid: z.string().optional(),
  })
  .passthrough(); // Allow additional fields from newer export formats

// Message schema for conversations.json format
const ConversationMessageSchema = z
  .object({
    uuid: z.string(),
    text: z.string().optional(), // Made optional for newer export formats
    content: z.array(ContentItemSchema),
    sender: z.enum(["human", "assistant"]),
    created_at: z.string(),
    updated_at: z.string(),
    attachments: z.array(z.any()).optional(),
    files: z.array(z.any()).optional(),
    index: z.number().default(0), // Default to 0 if not present
    truncated: z.boolean().default(false),
    parent_message_uuid: z.string().optional(),
  })
  .passthrough();

const SettingsSchema = z.object({
  preview_feature_uses_artifacts: z.boolean(),
  preview_feature_uses_latex: z.boolean(),
  preview_feature_uses_citations: z.boolean().optional(),
  enabled_artifacts_attachments: z.boolean(),
  enabled_turmeric: z.boolean().optional(),
});

// Schema for individual conversation exports
const IndividualChatSchema = z
  .object({
    uuid: z.string({ required_error: "Conversation UUID is required" }),
    name: z.string({ required_error: "Conversation name is required" }),
    summary: z.string().optional(),
    created_at: z.string({ required_error: "Creation date is required" }),
    updated_at: z.string({ required_error: "Update date is required" }),
    settings: SettingsSchema.optional(),
    is_starred: z.boolean().default(false),
    current_leaf_message_uuid: z.string().optional(),
    chat_messages: z.array(ChatMessageSchema, {
      required_error: "chat_messages array is required",
      invalid_type_error: "chat_messages must be an array of messages",
    }),
    conversation_id: z.string().optional(),
    model: z.string().optional(),
    project_uuid: z.string().optional(),
    project: z.any().optional(),
    workspace_id: z.string().optional(),
  })
  .passthrough(); // Allow additional fields

// Schema for conversations.json items
const ConversationItemSchema = z
  .object({
    uuid: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    account: z
      .object({
        uuid: z.string(),
      })
      .passthrough()
      .optional(),
    chat_messages: z.array(ConversationMessageSchema),
    // Optional fields that may or may not be present
    summary: z.string().optional(),
    settings: SettingsSchema.optional(),
    is_starred: z.boolean().optional(),
    current_leaf_message_uuid: z.string().optional(),
    conversation_id: z.string().optional(),
    model: z.string().optional(),
    project_uuid: z.string().optional(),
    project: z.any().optional(),
    workspace_id: z.string().optional(),
  })
  .passthrough(); // Allow additional fields

// Union type that accepts both formats
export const ChatDataSchema = z.union([IndividualChatSchema, ConversationItemSchema]);

// Export inferred types
export type ChatData = z.infer<typeof ChatDataSchema>;
export type ChatMessage =
  | z.infer<typeof ChatMessageSchema>
  | z.infer<typeof ConversationMessageSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
export type FileData = z.infer<typeof FileSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
