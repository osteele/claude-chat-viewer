# Claude Chat Viewer

A web application for viewing Claude chat conversations from exported JSON files. Renders Claude's chat JSON exports in a clean, readable format with support for code blocks, artifacts, and thinking process sections.

## Features

- View Claude chat JSON exports in a readable format
- Support for code blocks with syntax highlighting
- Display Claude's thinking process (optional)
- Print-friendly layout
- Responsive design
- Persistent storage of last viewed conversation

## Usage

Visit [claude-chat-viewer.vercel.app](https://claude-chat-viewer.vercel.app) to use the application.

1. Export your Claude chat as JSON
2. Click "Enter JSON" in the viewer
3. Paste your JSON
4. View your conversation in a clean, readable format

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
