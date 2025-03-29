export function formatTimestamp(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleString();
} 