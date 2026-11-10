/**
 * Resolves the best display name from TikTok LIVE payload fields.
 * Preserves full Unicode Vietnamese names and falls back cleanly.
 */
export function resolveTikTokDisplayName(payload: {
  nickname?: string;
  displayName?: string;
  uniqueId?: string;
  userId?: string;
}): string {
  const candidates = [
    payload.nickname,
    payload.displayName,
    payload.uniqueId,
    payload.userId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.replace(/\s+/g, ' ').trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return 'Đệ Tử Ẩn Danh';
}
