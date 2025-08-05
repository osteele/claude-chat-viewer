type BaseSegment = {
  type: string;
  content: string;
}

type TextSegment = BaseSegment & {
  type: 'text';
}

type ThinkingSegment = BaseSegment & {
  type: 'thinking';
}

type CodeSegment = BaseSegment & {
  type: "code";
  language: string;
  path?: string;
};

type ArtifactSegment = BaseSegment & {
  type: 'artifact';
  title: string;
  identifier: string;
  artifactType: string;
}

export type Segment =
  | TextSegment
  | ThinkingSegment
  | CodeSegment
  | ArtifactSegment;

export function parseMessage(text: string): Segment[] {
  const segments: Segment[] = [];
  let currentIndex = 0;

  // Regex patterns
  const thinkingPattern = /<antThinking>([\s\S]*?)<\/antThinking>/g;
  const artifactPattern = /<antArtifact\s+identifier="([^"]+)"\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/antArtifact>/g;
  const codePattern = /```([\w-]*)(?::([^\n]+))?\n?([\s\S]*?)```/g;

  while (currentIndex < text.length) {
    // Find the next special tag
    const thinkingMatch = thinkingPattern.exec(text);
    const artifactMatch = artifactPattern.exec(text);
    const codeMatch = codePattern.exec(text);

    // Find the closest match
    const nextThinkingIndex = thinkingMatch ? thinkingMatch.index : Infinity;
    const nextArtifactIndex = artifactMatch ? artifactMatch.index : Infinity;
    const nextCodeIndex = codeMatch ? codeMatch.index : Infinity;

    const nextIndex = Math.min(
      nextThinkingIndex,
      nextArtifactIndex,
      nextCodeIndex
    );

    if (nextIndex === Infinity) {
      // No more special segments, add remaining text
      const remainingText = text.slice(currentIndex).trim();
      if (remainingText) {
        segments.push({ type: "text", content: remainingText });
      }
      break;
    }

    // Add text before the next special segment
    if (nextIndex > currentIndex) {
      const textContent = text.slice(currentIndex, nextIndex).trim();
      if (textContent) {
        segments.push({ type: "text", content: textContent });
      }
    }

    // Add the special segment
    if (nextIndex === nextThinkingIndex) {
      segments.push({
        type: "thinking",
        content: thinkingMatch![1].trim(),
      });
      currentIndex = thinkingMatch!.index + thinkingMatch![0].length;
    } else if (nextIndex === nextCodeIndex) {
      segments.push({
        type: "code",
        language: codeMatch![1] || "text",  // Default to "text" if no language specified
        path: codeMatch![2],
        content: codeMatch![3].trim(),
      });
      currentIndex = codeMatch!.index + codeMatch![0].length;
    } else {
      segments.push({
        type: "artifact",
        identifier: artifactMatch![1],
        artifactType: artifactMatch![2],
        title: artifactMatch![3],
        content: artifactMatch![4].trim(),
      });
      currentIndex = artifactMatch!.index + artifactMatch![0].length;
    }

    // Reset regex indices
    thinkingPattern.lastIndex = currentIndex;
    artifactPattern.lastIndex = currentIndex;
    codePattern.lastIndex = currentIndex;
  }

  return segments;
}
