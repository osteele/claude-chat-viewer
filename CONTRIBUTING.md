# Contributing to Claude Chat Viewer

Thank you for your interest in contributing to Claude Chat Viewer! This document provides guidelines and instructions for development.

## Development Environment

### Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Node.js 16+ (for some dev dependencies)

### Setup

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

```text
claude-chat-viewer/
├── docs/                    # Technical documentation
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Artifact.tsx    # Artifact rendering
│   │   ├── ChatViewer.tsx  # Main viewer component
│   │   ├── CodeBlock.tsx   # Code block rendering
│   │   └── JsonInput.tsx   # JSON input handling
│   ├── content/
│   │   └── instructions.mdx # User instructions
│   ├── lib/
│   │   ├── messageParser.ts # Message parsing logic
│   │   └── utils.ts        # Utility functions
│   ├── schemas/
│   │   └── chat.ts         # Chat data type definitions
│   ├── types/
│   │   ├── mdx.d.ts        # MDX type definitions
│   │   └── types.ts        # Global type definitions
│   ├── App.tsx             # Root application component
│   └── main.tsx           # Application entry point
├── styles/
│   └── chat.css           # Global styles
├── CONTRIBUTING.md         # Contributor guidelines
├── README.md              # Project overview
├── package.json           # Project dependencies
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

### Key Directories

- `docs/` - Technical documentation and architecture details
- `src/components/` - React components, organized by feature
- `src/lib/` - Shared utilities and business logic
- `src/schemas/` - TypeScript types and validation schemas
- `src/content/` - Static content and instructions
- `src/types/` - TypeScript type definitions
- `styles/` - Global CSS and Tailwind utilities

## Development Commands

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun test` - Run tests (when implemented)

## Technical Dependencies

- React - UI framework
- Vite - Build tool and dev server
- Tailwind CSS - Utility-first CSS framework
- shadcn/ui - React component library
- ReactMarkdown - Markdown rendering
- Lucide React - Icon library

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements. Also check [Ideas](docs/ideas.md) for other feature ideas.

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow functional programming patterns
- Use Tailwind for styling
- Include JSDoc comments for complex functions

### Component Guidelines

- Keep components focused and single-purpose
- Use TypeScript interfaces for props
- Implement error boundaries where appropriate
- Support keyboard navigation and screen readers
- Include print styles where relevant

### Testing

(To be implemented)

### Documentation

- Update technical documentation for significant changes
- Include JSDoc comments for public functions
- Update README.md for user-facing changes

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update documentation as needed
5. Submit a pull request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
