export function recordOpen(fullName: string): void {
  // Best-effort counters must never delay navigation. No visitor ID, cookies, or retry-generated duplicate events.
  void fetch('/api/opens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: fullName }),
    keepalive: true,
    credentials: 'omit',
    mode: 'same-origin',
  }).catch(() => {});
}
