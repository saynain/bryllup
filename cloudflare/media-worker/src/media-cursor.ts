export interface MediaCursor {
  sortAt: number;
  createdAt: string;
  id: string;
}

export function parseMediaCursor(value: string | null): MediaCursor | null {
  if (!value) {
    return null;
  }

  const [sortAt, createdAt, id] = value.split("|", 3);
  const numericSortAt = Number(sortAt);
  if (
    !sortAt ||
    !createdAt ||
    !id ||
    !Number.isSafeInteger(numericSortAt)
  ) {
    return null;
  }

  return { sortAt: numericSortAt, createdAt, id };
}
