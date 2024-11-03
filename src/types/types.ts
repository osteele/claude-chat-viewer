export interface ChatMessage {
  uuid: string;
  text: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  sender: 'human' | 'assistant';
  index: number;
  created_at: string;
  updated_at: string;
  truncated: boolean;
  files?: Array<{
    file_kind: string;
    file_uuid: string;
    file_name: string;
    created_at: string;
    thumbnail_url?: string;
    preview_url?: string;
    thumbnail_asset?: {
      url: string;
      file_variant: string;
      primary_color: string;
      image_width: number;
      image_height: number;
    };
    preview_asset?: {
      url: string;
      file_variant: string;
      primary_color: string;
      image_width: number;
      image_height: number;
    };
  }>;
}

export interface ChatData {
  uuid: string;
  name: string;
  summary: string;
  model: string;
  created_at: string;
  updated_at: string;
  settings: {
    preview_feature_uses_artifacts: boolean;
    preview_feature_uses_latex: boolean;
    enabled_artifacts_attachments: boolean;
  };
  is_starred: boolean;
  current_leaf_message_uuid: string;
  chat_messages: ChatMessage[];
}

export interface ArtifactMatch {
  type: 'artifact';
  title: string;
  content: string;
}

export interface TextContent {
  type: 'text';
  content: string;
}

export type ContentPart = ArtifactMatch | TextContent;
