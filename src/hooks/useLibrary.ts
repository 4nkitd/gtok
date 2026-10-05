import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadSaved, loadSeen, storeSaved, storeSeen } from '../lib/storage';
import type { Repo } from '../lib/types';

export function useLibrary() {
  const [saved, setSaved] = useState<Repo[]>(loadSaved);
  const [seen, setSeen] = useState<number[]>(loadSeen);

  useEffect(() => storeSaved(saved), [saved]);
  useEffect(() => storeSeen(seen), [seen]);

  const savedIds = useMemo(() => new Set(saved.map((repo) => repo.id)), [saved]);
  const seenIds = useMemo(() => new Set(seen), [seen]);

  const toggleSaved = useCallback((repo: Repo) => {
    setSaved((current) =>
      current.some((item) => item.id === repo.id) ? current.filter((item) => item.id !== repo.id) : [repo, ...current],
    );
  }, []);

  const markSeen = useCallback((id: number) => {
    setSeen((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  return { saved, savedIds, seenIds, toggleSaved, markSeen };
}
