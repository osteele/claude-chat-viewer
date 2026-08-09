import { splitSearchText } from "../lib/searchUtils";

interface SearchHighlightProps {
  text: string;
  query: string;
  useRegex: boolean;
  caseSensitive: boolean;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  query,
  useRegex,
  caseSensitive,
}) =>
  splitSearchText(text, query, useRegex, caseSensitive).map((segment, index) =>
    segment.isMatch ? (
      <mark
        key={`${index}-${segment.text}`}
        className="bg-yellow-200 text-inherit rounded-sm px-0.5"
      >
        {segment.text}
      </mark>
    ) : (
      <span key={`${index}-${segment.text}`}>{segment.text}</span>
    ),
  );
