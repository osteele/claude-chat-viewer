# Claude Chat Viewer Schema Documentation

## Schema Overview

The application uses Zod schemas defined in `src/schemas/chat.ts` to validate and type Claude conversation data. The schema supports two main formats:

1. **Individual conversation exports** (`IndividualChatSchema`) - Single conversation files
2. **Bulk conversation exports** (`ConversationItemSchema`) - Arrays of conversations

## Core Schema Structure

### ChatDataSchema
Union type that accepts both individual and bulk conversation formats:
```typescript
ChatDataSchema = z.union([IndividualChatSchema, ConversationItemSchema])
```

### Message Content Types

The schema recognizes three content types validated through a discriminated union:

1. **text** - Regular text/markdown content
   - Contains: `text` field with string content

2. **tool_use** - Tool interactions (including artifacts)
   - Contains: `name` field (e.g., "artifacts")
   - Contains: `input` object with tool-specific data

3. **tool_result** - Tool execution results
   - Contains: `content` array with results
   - Contains: `is_error` boolean flag

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

### Input File Examples
- `inputs/gosper-chat.json` - Individual conversation with artifacts
- `inputs/data/conversations.json` - Bulk export format

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