export function normalizeOutput(output: string): string {
  return output.trim().split(/\s+/u).join(' ');
}

export function compareOutput(actual: string, expected: string): 'AC' | 'WA' {
  return normalizeOutput(actual) === normalizeOutput(expected) ? 'AC' : 'WA';
}

export function classifyRun({ timedOut, oom, code, overflow }: {
  timedOut: boolean; oom: boolean; code: number | null; overflow: boolean;
}): 'TLE' | 'MLE' | 'RE' | null {
  if (oom) return 'MLE';
  if (timedOut) return 'TLE';
  if (overflow || code !== 0) return 'RE';
  return null;
}
