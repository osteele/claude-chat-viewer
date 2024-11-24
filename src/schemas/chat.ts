import { z } from "zod";

const ContentItemSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

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
  sender: z.enum(["human", "assistant"]),
  content: z.array(ContentItemSchema),
  files: z.array(FileSchema).optional(),
  text: z.string(),
  index: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  truncated: z.boolean().default(false),
});

const SettingsSchema = z
  .object({
    preview_feature_uses_artifacts: z.boolean(),
    preview_feature_uses_latex: z.boolean(),
    enabled_artifacts_attachments: z.boolean(),
  })
  .default({
    preview_feature_uses_artifacts: false,
    preview_feature_uses_latex: false,
    enabled_artifacts_attachments: false,
  });

export const ChatDataSchema = z.object({
  uuid: z.string(),
  name: z.string().default("Untitled Conversation"),
  summary: z.string(),
  model: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  chat_messages: z.array(ChatMessageSchema),
  workspace_id: z.string(),
  conversation_id: z.string(),
  settings: SettingsSchema,
  is_starred: z.boolean().default(false),
  current_leaf_message_uuid: z.string(),
});
