# Claude Chat Viewer

A React application for viewing Claude chat conversations from exported JSON files.

## Features

- JSON validation and parsing
- Interactive chat visualization
- Support for code blocks and artifacts
- Persistent storage of last viewed conversation
- Responsive design with Tailwind CSS

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Node.js 16+ (for some dev dependencies)

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/osteele/claude-chat-viewer.git
cd claude-chat-viewer
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun dev
```

The application will be available at http://localhost:5173

## Project Structure

```
claude-chat-viewer/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── ChatViewer.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Usage

1. Open the application in your browser
2. Click on "Enter JSON" tab
3. Paste a Claude chat JSON export
4. Click "Load Conversation" to view the chat

The application will automatically save the last valid JSON and reload it on next visit.

## Development

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun preview` - Preview production build

## Dependencies

- React
- Vite
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

## Acknowledgements

Inspired by Simon Willison's [Convert Claude JSON to
Markdown](https://observablehq.com/@simonw/convert-claude-json-to-markdown)
tool.

Written with [Claude](https://www.anthropic.com/claude) 🤖 and
[Cursor](https://www.cursor.com) ✨

## License

MIT
