import { resolveInProgressStart } from './queue-timer';

type QueueService = { name?: string; duration?: number };

type QueueEntry = {
  estimatedStart?: string;
  actualStart?: string;
  serviceName?: string;
  serviceDuration?: number;
  status?: string;
  userId?: string;
};

function entryDuration(entry: QueueEntry, services?: QueueService[]): number {
  if (entry.serviceDuration && entry.serviceDuration > 0) return entry.serviceDuration;
  const match = services?.find((s) => s.name === entry.serviceName);
  return match?.duration && match.duration > 0 ? match.duration : 30;
}

/** Minutos até o atendimento (usa previsões reais da fila, não média fixa). */
export function computeQueueWaitMinutes(options: {
  waitingEntries: QueueEntry[];
  inProgressEntry?: QueueEntry | null;
  queueServices?: QueueService[];
  userEntry?: QueueEntry | null;
}): number {
  const now = Date.now();
  const { waitingEntries, inProgressEntry, queueServices, userEntry } = options;

  if (userEntry?.status === 'IN_PROGRESS') return 0;
  if (userEntry?.status === 'WAITING' && userEntry.estimatedStart) {
    return Math.max(0, Math.ceil((new Date(userEntry.estimatedStart).getTime() - now) / 60000));
  }

  let queueEnd = now;

  if (inProgressEntry) {
    const start = resolveInProgressStart(inProgressEntry) ?? now;
    queueEnd = Math.max(queueEnd, start + entryDuration(inProgressEntry, queueServices) * 60000);
  }

  for (const entry of waitingEntries) {
    if (!entry.estimatedStart) continue;
    const est = new Date(entry.estimatedStart).getTime();
    if (Number.isNaN(est)) continue;
    queueEnd = Math.max(queueEnd, est + entryDuration(entry, queueServices) * 60000);
  }

  if (!inProgressEntry && waitingEntries.length === 0) return 0;

  return Math.max(0, Math.ceil((queueEnd - now) / 60000));
}
