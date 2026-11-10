/**
 * Compact player name formatting for 9:16 mobile livestream screens.
 * Inherited & preserved from Chùa Online 2:
 * Shows max 5 characters on avatar foot-plate to prevent overlap across 80 players,
 * while preserving the full name for promotions, leaderboards, and TTS speech.
 */
export function formatCompactPlayerName(rawName: string | undefined | null, maxChars = 5): string {
  const cleaned = String(rawName ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'ĐồĐệ';

  const chars = Array.from(cleaned);
  if (chars.length <= maxChars) {
    return cleaned;
  }
  return chars.slice(0, maxChars).join('');
}

export function sanitizeCommentForBubble(rawText: string | undefined | null, maxChars = 64): string {
  const cleaned = String(rawText ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const chars = Array.from(cleaned);
  if (chars.length <= maxChars) return cleaned;
  return `${chars.slice(0, maxChars).join('')}…`;
}
