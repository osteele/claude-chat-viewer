type SegmentType = 'text' | 'thinking' | 'artifact';

interface Segment {
  type: SegmentType;
  content: string;
  title?: string;
  identifier?: string;
  artifactType?: string;
}

export function parseMessage(text: string): Segment[] {
  const segments: Segment[] = [];
  let currentIndex = 0;

  // Regex patterns
  const thinkingPattern = /<antThinking>([\s\S]*?)<\/antThinking>/g;
  const artifactPattern = /<antArtifact\s+identifier="([^"]+)"\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/antArtifact>/g;

  while (currentIndex < text.length) {
    // Find the next special tag
    const thinkingMatch = thinkingPattern.exec(text);
    const artifactMatch = artifactPattern.exec(text);

    // Find the closest match
    const nextThinkingIndex = thinkingMatch ? thinkingMatch.index : Infinity;
    const nextArtifactIndex = artifactMatch ? artifactMatch.index : Infinity;

    if (nextThinkingIndex === Infinity && nextArtifactIndex === Infinity) {
      // No more special segments, add remaining text
      const remainingText = text.slice(currentIndex).trim();
      if (remainingText) {
        segments.push({ type: 'text', content: remainingText });
      }
      break;
    }

    // Add text before the next special segment
    const nextIndex = Math.min(nextThinkingIndex, nextArtifactIndex);
    if (nextIndex > currentIndex) {
      const textContent = text.slice(currentIndex, nextIndex).trim();
      if (textContent) {
        segments.push({ type: 'text', content: textContent });
      }
    }

    // Add the special segment
    if (nextThinkingIndex === nextIndex) {
      segments.push({
        type: 'thinking',
        content: thinkingMatch![1].trim()
      });
      currentIndex = thinkingMatch!.index + thinkingMatch![0].length;
    } else {
      segments.push({
        type: 'artifact',
        identifier: artifactMatch![1],
        artifactType: artifactMatch![2],
        title: artifactMatch![3],
        content: artifactMatch![4].trim()
      });
      currentIndex = artifactMatch!.index + artifactMatch![0].length;
    }

    // Reset regex indices
    thinkingPattern.lastIndex = currentIndex;
    artifactPattern.lastIndex = currentIndex;
  }

  return segments;
}
