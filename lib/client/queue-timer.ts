/** Resolve o instante de início para cronômetro de atendimento em andamento. */
export function resolveInProgressStart(
  entry?: { actualStart?: string | null; estimatedStart?: string | null } | null
): number | null {
  if (!entry) return null;

  const now = Date.now();

  if (entry.actualStart) {
    const actual = new Date(entry.actualStart).getTime();
    if (!Number.isNaN(actual)) return actual;
  }

  if (entry.estimatedStart) {
    const estimated = new Date(entry.estimatedStart).getTime();
    if (!Number.isNaN(estimated) && estimated <= now) return estimated;
  }

  return now;
}

export function formatElapsed(ms: number): string {
  if (ms < 0) return '00:00';
  const totalSecs = Math.floor(ms / 1000);
  const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const secs = String(totalSecs % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}
