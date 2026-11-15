import type { SpeedStatus } from '../types';

export function countWords(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned ? cleaned.split(' ').length : 0;
}

export function parseDurationSeconds(timeRange: string): number {
  if (!timeRange) return 4;
  const matches = timeRange.match(/(\d+):?(\d+)?\s*[-–—a]\s*(\d+):?(\d+)?/);
  if (matches) {
    let startSec = 0;
    let endSec = 4;
    if (matches[2] !== undefined) {
      startSec = parseInt(matches[1], 10) * 60 + parseInt(matches[2], 10);
    } else {
      startSec = parseInt(matches[1], 10);
    }

    if (matches[4] !== undefined) {
      endSec = parseInt(matches[3], 10) * 60 + parseInt(matches[4], 10);
    } else {
      endSec = parseInt(matches[3], 10);
    }

    const diff = endSec - startSec;
    return diff > 0 ? diff : 4;
  }
  return 4;
}

export function calculateSpeed(spokenText: string, durationSeconds: number): {
  wordsCount: number;
  wordsPerSecond: number;
  wordsPerMinute: number;
  status: SpeedStatus;
  label: string;
  badgeColor: string;
} {
  const wordsCount = countWords(spokenText);
  const duration = durationSeconds > 0 ? durationSeconds : 4;
  const wordsPerSecond = Math.round((wordsCount / duration) * 10) / 10;
  const wordsPerMinute = Math.round(wordsPerSecond * 60);

  let status: SpeedStatus = 'optimal';
  let label = 'Ritmo Óptimo (Retención alta)';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

  if (wordsCount === 0) {
    status = 'optimal';
    label = 'Pausa / Solo Visual';
    badgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  } else if (wordsPerSecond < 1.8) {
    status = 'slow';
    label = 'Lento (Riesgo de scroll)';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else if (wordsPerSecond >= 1.8 && wordsPerSecond <= 3.6) {
    status = 'optimal';
    label = 'Óptimo para TikTok';
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (wordsPerSecond > 3.6 && wordsPerSecond <= 4.4) {
    status = 'fast';
    label = 'Rápido (Energía alta)';
    badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  } else {
    status = 'extreme';
    label = 'Ametralladora (Difícil entender)';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }

  return {
    wordsCount,
    wordsPerSecond,
    wordsPerMinute,
    status,
    label,
    badgeColor
  };
}
