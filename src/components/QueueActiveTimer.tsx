import { useEffect, useRef, useState } from 'react';
import { formatElapsed, resolveInProgressStart } from '../lib/queue-timer';

type QueueActiveTimerProps = {
  entry?: { actualStart?: string | null; estimatedStart?: string | null } | null;
  className?: string;
};

export function QueueActiveTimer({ entry, className }: QueueActiveTimerProps) {
  const [elapsed, setElapsed] = useState('00:00');
  const fallbackStartRef = useRef<number | null>(null);

  useEffect(() => {
    fallbackStartRef.current = null;

    const tick = () => {
      let start = resolveInProgressStart(entry);

      if (start === null) {
        setElapsed('--:--');
        return;
      }

      if (start > Date.now()) {
        if (fallbackStartRef.current === null) {
          fallbackStartRef.current = Date.now();
        }
        start = fallbackStartRef.current;
      }

      setElapsed(formatElapsed(Date.now() - start));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [entry?.actualStart, entry?.estimatedStart]);

  return (
    <span className={className ?? 'font-mono text-xl font-bold tracking-wider text-indigo-600 dark:text-indigo-400 animate-pulse'}>
      {elapsed}
    </span>
  );
}
