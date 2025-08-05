# Claude Chat Viewer

A web application for viewing Claude chat conversations from exported JSON files. Renders Claude's chat JSON exports in a clean, readable format with support for code blocks, artifacts, and thinking process sections.

## Features

- View Claude chat JSON exports in a readable format
- Support for code blocks with syntax highlighting
- Download all code and artifacts as a zip file
- Copy entire conversations with formatting preserved
- Display Claude's thinking process (optional)
- Print-friendly layout
- Responsive design
- Persistent storage of last viewed conversation

## Usage

Visit [tools.osteele.com/claude-chat-viewer](https://tools.osteele.com/claude-chat-viewer) to use the application.

1. Export your Claude chat as JSON
2. Click "Enter JSON" in the viewer
3. Paste your JSON
4. View your conversation in a clean, readable format

### Loading Files via URL Parameter

In development mode, you can also load a JSON conversation file directly by providing a `file` URL parameter:

```
http://localhost:5173/?file=/inputs/gosper-chat.json
```

This is particularly useful for:
- Development and testing with sample data
- Sharing specific conversation files
- Automating the viewer with pre-loaded content

### Downloading Artifacts

Click the "Download Artifacts" button to download all code snippets and artifacts as a zip file. The downloaded archive will:
- Maintain file extensions based on language or MIME type
- Preserve directory structure from file paths
- Include all code snippets and tool outputs from the conversation
- Name files based on their titles or content

### Copying Conversations

Click the "Copy conversation" button to copy the entire conversation to your clipboard. The copied text will:
- Preserve formatting when pasted into rich text editors (like Google Docs or Word)
- Include proper formatting for code blocks with monospace font
- Fall back to clean plain text when pasted into plain text editors

### Printing

Use your browser's print function to create a PDF or paper copy. The viewer automatically formats the conversation for printing.

### Keyboard Shortcuts

- `Cmd/Ctrl + V` - Paste JSON
- `Tab` - Navigate between elements
- `Enter` - Activate buttons and controls

## Local Installation

If you want to run the viewer locally:

```bash
# Clone the repository
git clone https://github.com/osteele/claude-chat-viewer.git

# Install dependencies
cd claude-chat-viewer
bun install

# Start the development server
bun dev
```

Visit http://localhost:5173 in your browser.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Acknowledgements

Inspired by Simon Willison's [Convert Claude JSON to
Markdown](https://observablehq.com/@simonw/convert-claude-json-to-markdown)
tool.

Written with [Claude](https://www.anthropic.com/claude) 🤖 and
[Cursor](https://www.cursor.com) ✨

## License

MIT
