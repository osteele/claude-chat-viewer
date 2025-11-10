import type { ChatData } from '../schemas/chat';

export type SortField = 'created_at' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

/**
 * Sorts an array of conversations by the specified field and order.
 *
 * @param conversations - Array of conversations to sort
 * @param field - Field to sort by ('created_at' or 'updated_at')
 * @param order - Sort order ('asc' for ascending, 'desc' for descending)
 * @returns Sorted array of conversations
 */
export function sortConversations(
  conversations: ChatData[],
  field: SortField,
  order: SortOrder
): ChatData[] {
  return [...conversations].sort((a, b) => {
    const dateA = new Date(a[field]).getTime();
    const dateB = new Date(b[field]).getTime();

    if (order === 'asc') {
      return dateA - dateB; // Ascending: oldest first
    }
    return dateB - dateA; // Descending: newest first
  });
}

/**
 * Gets a human-readable label for a sort field.
 */
export function getSortFieldLabel(field: SortField): string {
  switch (field) {
    case 'created_at':
      return 'Created';
    case 'updated_at':
      return 'Modified';
  }
}

/**
 * Gets a human-readable label for a sort order.
 */
export function getSortOrderLabel(order: SortOrder): string {
  return order === 'asc' ? 'Oldest First' : 'Newest First';
}
