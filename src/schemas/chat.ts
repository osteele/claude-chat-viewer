import { z } from "zod";

const AttachmentSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  file_size: z.number(),
  file_type: z.string(),
  extracted_content: z.string().optional(),
  created_at: z.string(),
});

const ToolUseSchema = z.object({
  type: z.literal("tool_use"),
  name: z.string(),
  input: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    command: z.string(),
    content: z.string(),
    language: z.string().optional(),
    version_uuid: z.string(),
  }),
});

const ToolResultSchema = z.object({
  type: z.literal("tool_result"),
  name: z.string(),
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    })
  ),
  is_error: z.boolean(),
});

const ContentItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  ToolUseSchema,
  ToolResultSchema,
]);

// Content schema for conversations.json format (with timestamps and citations)
const ConversationContentItemSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  start_timestamp: z.string().nullable().optional(),
  stop_timestamp: z.string().nullable().optional(),
  citations: z.array(z.any()).optional(),
}).passthrough();

const ConversationContentSchema = z.union([
  ConversationContentItemSchema,
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

const FileSchema = z.object({
  file_kind: z.string(),
  file_uuid: z.string(),
  file_name: z.string(),
  created_at: z.string(),
  thumbnail_url: z.string().optional(),
  preview_url: z.string().optional(),
  thumbnail_asset: ThumbnailAssetSchema,
  preview_asset: PreviewAssetSchema,
});

const ChatMessageSchema = z.object({
  uuid: z.string(),
  index: z.number(),
  sender: z.enum(["human", "assistant"]),
  content: z.array(ContentItemSchema),
  text: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  truncated: z.boolean().default(false),
  attachments: z.array(AttachmentSchema).optional(),
  files: z.array(FileSchema).optional(),
  files_v2: z.array(FileSchema).optional(),
  sync_sources: z.array(z.any()).optional(),
  parent_message_uuid: z.string().optional(),
});

// Message schema for conversations.json format
const ConversationMessageSchema = z.object({
  uuid: z.string(),
  text: z.string(),
  content: z.array(ConversationContentSchema),
  sender: z.enum(["human", "assistant"]),
  created_at: z.string(),
  updated_at: z.string(),
  attachments: z.array(z.any()).optional(),
  files: z.array(z.any()).optional(),
  index: z.number().default(0), // Default to 0 if not present
  truncated: z.boolean().default(false),
  parent_message_uuid: z.string().optional(),
}).passthrough();

const SettingsSchema = z.object({
  preview_feature_uses_artifacts: z.boolean(),
  preview_feature_uses_latex: z.boolean(),
  preview_feature_uses_citations: z.boolean().optional(),
  enabled_artifacts_attachments: z.boolean(),
  enabled_turmeric: z.boolean().optional(),
});

// Schema for individual conversation exports
const IndividualChatSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  summary: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  settings: SettingsSchema,
  is_starred: z.boolean().default(false),
  current_leaf_message_uuid: z.string(),
  chat_messages: z.array(ChatMessageSchema),
  conversation_id: z.string().optional(),
  model: z.string().optional(),
  project_uuid: z.string().optional(),
  project: z.any().optional(),
  workspace_id: z.string().optional(),
}).passthrough(); // Allow additional fields

// Schema for conversations.json items
const ConversationItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  account: z.object({ 
    uuid: z.string() 
  }).passthrough(),
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
}).passthrough(); // Allow additional fields

// Union type that accepts both formats
export const ChatDataSchema = z.union([
  IndividualChatSchema,
  ConversationItemSchema,
]);


// Export inferred types
export type ChatData = z.infer<typeof ChatDataSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema> | z.infer<typeof ConversationMessageSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema> | z.infer<typeof ConversationContentSchema>;
export type FileData = z.infer<typeof FileSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
