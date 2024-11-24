import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  code: string;
  language: string;
  path?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  path,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4">
      <div className="flex justify-between items-center bg-[#f1f0eb] px-4 py-2 rounded-t-lg">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[15px] text-[#383838]">
            {language}
          </span>
          {path && (
            <span className="text-gray-500 font-mono text-[15px]">{path}</span>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-[14px]"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          fontSize: "15px",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
