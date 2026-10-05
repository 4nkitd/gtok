const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en');
const DAY_MS = 86_400_000;

export function formatCount(value: number): string {
  return compact.format(value).toLowerCase();
}

export function formatStars(value: number): string {
  return `${value < 10_000 ? full.format(value) : formatCount(value)} ${value === 1 ? 'star' : 'stars'}`;
}

export function describeAge(createdAt: string, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS));
  if (days === 0) return 'today';
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}
