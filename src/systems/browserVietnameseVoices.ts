/**
 * Helper to discover and select the best Vietnamese voice in browser Web Speech API
 * (including Microsoft Nam Minh / Hoài My Natural voices in Microsoft Edge).
 */
export function findBestBrowserVietnameseVoice(preferredVoiceId?: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const viVoices = voices.filter(
    v =>
      v.lang.toLowerCase().startsWith('vi') ||
      v.name.toLowerCase().includes('vietnam') ||
      v.name.toLowerCase().includes('namminh') ||
      v.name.toLowerCase().includes('nam minh') ||
      v.name.toLowerCase().includes('hoaimy') ||
      v.name.toLowerCase().includes('hoài my') ||
      v.name.toLowerCase().includes('an ')
  );

  if (preferredVoiceId) {
    const lowerPref = preferredVoiceId.toLowerCase();
    const exactOrPartial = viVoices.find(
      v =>
        v.name.toLowerCase().includes(lowerPref) ||
        v.voiceURI.toLowerCase().includes(lowerPref) ||
        (lowerPref.includes('namminh') && v.name.toLowerCase().includes('nam minh')) ||
        (lowerPref.includes('hoaimy') && v.name.toLowerCase().includes('hoai my'))
    );
    if (exactOrPartial) return exactOrPartial;
  }

  // Prefer Microsoft Nam Minh Online (Natural) first for Sect Leader
  const namMinh = viVoices.find(
    v => v.name.toLowerCase().includes('nam minh') || v.name.toLowerCase().includes('namminh')
  );
  if (namMinh) return namMinh;

  // Next prefer any Microsoft Natural Vietnamese voice
  const msNatural = viVoices.find(v => v.name.toLowerCase().includes('microsoft'));
  if (msNatural) return msNatural;

  if (viVoices.length > 0) return viVoices[0];
  return null;
}
