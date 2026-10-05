import { useCallback, useEffect, useState } from 'react';
import { loadReadme } from '../lib/readme';

export type ReadmeState =
  | { status: 'idle' | 'loading' | 'missing' | 'error' }
  | { status: 'ready'; html: string };

export function useReadme(fullName: string, enabled: boolean) {
  const [state, setState] = useState<ReadmeState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadReadme(fullName).then(
      (html) => active && setState(html === null ? { status: 'missing' } : { status: 'ready', html }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, [fullName, enabled, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { state: state.status === 'idle' && enabled ? ({ status: 'loading' } as const) : state, retry };
}
