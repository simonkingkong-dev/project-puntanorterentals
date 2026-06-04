/** True when Firestore needs a composite index that is not built yet. */
export function isMissingFirestoreIndexError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("FAILED_PRECONDITION") && msg.includes("index");
}

export function sortBySortOrder<T extends { sortOrder?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function sortByCreatedAtDesc<T extends { createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
