const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function formatCount(value: number): string {
  return compact.format(value).toLowerCase();
}
