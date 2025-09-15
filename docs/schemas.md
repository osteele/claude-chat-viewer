# Claude Chat Viewer Schema Documentation

## Schema Overview

The application uses Zod schemas defined in `src/schemas/chat.ts` to validate and type Claude conversation data. The schema supports two main formats:

1. **Individual conversation exports** (`IndividualChatSchema`) - Single conversation files
2. **Bulk conversation exports** (`ConversationItemSchema`) - Arrays of conversations

## Schema Sources and Validation Status

The schema elements come from different sources of conversation data:

### Elements from Real Claude Exports
These elements are present in actual exported conversation files from Claude:
- **Core conversation structure** - uuid, name, created_at, updated_at, chat_messages
- **Message structure** - uuid, text, content, sender, created_at, updated_at
- **Content types** - text, thinking, tool_use, tool_result, voice_note
- **Artifacts** - tool_use with name="artifacts" and associated input fields
- **Attachments/Files** - Present in some bulk exports
- **Account field** - Present in bulk exports but not individual exports

### Elements Only in Sample Data
These elements appear only in the sample conversations (`src/data/sampleConversations/`) and NOT in real Claude exports:
- **`SettingsSchema`** - Feature flags like `preview_feature_uses_artifacts`, `preview_feature_uses_latex`
- **`ThumbnailAssetSchema` and `PreviewAssetSchema`** - Rich media preview metadata
- **`files_v2` field** - Alternative file attachment format

### Recent Additions for Export Compatibility
The schema was recently updated to support all real export formats:
- **`thinking` content type** - Added for conversations with Claude's thinking process
- **`voice_note` content type** - Added for voice transcription notes
- **`source` and `md_citations` fields** - Added to tool_use input for web search artifacts
- **`language` field nullable** - Changed from optional string to nullable to handle null values
- **`index` field default** - Made optional with default 0 for messages missing this field

## Core Schema Structure

### ChatDataSchema
Union type that accepts both individual and bulk conversation formats:
```typescript
ChatDataSchema = z.union([IndividualChatSchema, ConversationItemSchema])
```

### Message Content Types

The schema recognizes five content types validated through a discriminated union:

1. **text** - Regular text/markdown content
   - Contains: `text` field with string content

2. **thinking** - Claude's internal reasoning process
   - Contains: `thinking` field with reasoning text
   - May contain: `summaries` array and `cut_off` boolean

3. **tool_use** - Tool interactions (including artifacts)
   - Contains: `name` field (e.g., "artifacts")
   - Contains: `input` object with tool-specific data

4. **tool_result** - Tool execution results
   - Contains: `content` array with results
   - Contains: `is_error` boolean flag

5. **voice_note** - Voice transcription notes
   - Contains: `text` field with transcribed content
   - May contain: `title` field with note title

## Schema Properties

### Used Properties (Present in Current Data)

#### Conversation Level
- `uuid` - Unique conversation identifier
- `name` - Conversation title
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `chat_messages` - Array of message objects
- `account` - Account metadata (in bulk exports)

#### Message Level
- `uuid` - Unique message identifier
- `text` - Message text content
- `content` - Structured content array
- `sender` - "human" or "assistant"
- `created_at` - Message creation timestamp
- `updated_at` - Message update timestamp
- `attachments` - File attachments (always empty array currently)
- `files` - Alternative file format (always empty array currently)

#### Tool Use (Artifacts)
- `type` - Always "tool_use"
- `name` - Tool name (e.g., "artifacts")
- `input` - Tool input object containing:
  - `id` - Artifact identifier
  - `type` - Content type (e.g., "application/vnd.ant.code")
  - `title` - Artifact title
  - `command` - Operation (e.g., "create", "rewrite")
  - `content` - Artifact content
  - `language` - Programming language
  - `version_uuid` - Version tracking

### Unused Properties

These properties are defined in the schema but not present in current data. They may be from older export formats or reserved for future features:

#### Message Properties
- `index` - Message ordering (defaults to 0)
- `truncated` - Whether message was truncated (defaults to false)
- `files_v2` - Alternative file attachment format
- `sync_sources` - Synchronization metadata
- `parent_message_uuid` - Message threading/branching support

#### Conversation Properties
- `summary` - Conversation summary text
- `settings` - Feature flags and preferences
- `is_starred` - Bookmark/favorite status
- `current_leaf_message_uuid` - Active message in conversation tree
- `conversation_id` - Alternative identifier
- `model` - AI model used
- `project_uuid` - Project organization
- `project` - Project metadata
- `workspace_id` - Workspace organization

#### Tool Interaction Properties
Always null in current data:
- `message` - Tool execution messages
- `integration_name` - External integration identifier
- `integration_icon_url` - Integration branding
- `context` - Execution context
- `display_content` - Alternative display format
- `approval_options` - User approval workflows
- `approval_key` - Approval tracking

#### Rich Attachment Properties
Not used but schema supports:
- `thumbnail_url`, `preview_url` - Media previews
- `thumbnail_asset`, `preview_asset` - Detailed image metadata
- `file_kind`, `file_uuid` - File classification

## Validation Strategy

The schema uses several validation techniques:

1. **Union Types** - Supports multiple export formats
2. **Discriminated Unions** - Type-safe content type handling
3. **Optional Fields** - Backwards compatibility
4. **Default Values** - Handles missing fields gracefully
5. **Passthrough** - Forward compatibility with unknown fields

## Format Compatibility

### Supported Formats
- Individual Claude conversation exports
- Bulk conversation exports (conversations.json)
- Tool use/artifact content
- Timestamped content with citations

### Supported Export Formats
- Individual conversation exports - Single conversation files
- Bulk conversation exports - Arrays of conversations (conversations.json format)

## Schema Design Philosophy

The comprehensive schema appears designed to handle:

1. **Multiple Export Sources** - Different Claude interfaces and versions
2. **Rich Attachments** - Full file/media support with previews
3. **Conversation Organization** - Projects, workspaces, starring
4. **Message Threading** - Branching conversations and edits
5. **Integration Workflows** - External tools and approval processes
6. **Future Extensibility** - Unknown fields passed through

Current data represents a simpler subset focusing on basic conversation export with artifacts, without advanced organizational features.

## Notes for Developers

- Properties marked as unused may appear in exports from different Claude interfaces
- The schema is intentionally permissive to handle format variations
- Use `.passthrough()` to preserve unknown fields for forward compatibility
- Validation errors should provide clear feedback about which format failed
- The `SettingsSchema` and rich media assets (thumbnails/previews) are only used in sample data, not real exports
- Use the CLI tools (`bun validate` and `bun debug`) to test schema changes