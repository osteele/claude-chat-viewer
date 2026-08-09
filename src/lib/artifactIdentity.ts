export function createToolArtifactKey(
  messageUuid: string,
  id: unknown,
  legacyIdentifier: unknown,
  itemIndex: number,
): string {
  const artifactId =
    (typeof id === "string" && id) ||
    (typeof legacyIdentifier === "string" && legacyIdentifier) ||
    `item-${itemIndex}`;

  return `${messageUuid}-tool-${artifactId}`;
}
