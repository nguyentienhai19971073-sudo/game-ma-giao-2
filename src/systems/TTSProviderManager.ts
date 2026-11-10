import { VoiceOption, VoiceProviderType, VoiceSystemConfig } from '../types/magiao';
import { findBestBrowserVietnameseVoice } from './browserVietnameseVoices';

export interface TTSPlaybackCallbacks {
  onStart?: () => void;
  onViseme?: (openness: number) => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export class TTSProviderManager {
  private currentAudio: HTMLAudioElement | null = null;
  private lipSyncInterval: number | null = null;
  private lastError = '';
  private activeProviderStatus = 'Sẵn sàng';

  public getStatus(): { activeProviderStatus: string; lastError: string } {
    return {
      activeProviderStatus: this.activeProviderStatus,
      lastError: this.lastError,
    };
  }

  public stopCurrent() {
    if (this.lipSyncInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.lipSyncInterval);
      this.lipSyncInterval = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {
        // Ignore cleanup errors
      }
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public async fetchAvailableVoices(): Promise<
    Record<VoiceProviderType, { configured: boolean; statusText: string; voices: VoiceOption[] }> | null
  > {
    try {
      const resp = await fetch('/api/tts/voices');
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.providers || null;
    } catch {
      return null;
    }
  }

  public async speak(
    text: string,
    config: VoiceSystemConfig,
    callbacks: TTSPlaybackCallbacks = {}
  ): Promise<boolean> {
    const cleanText = String(text || '')
      .replace(/[{}]/g, '')
      .trim();

    if (!cleanText || !config.enabled || config.isMuted) {
      callbacks.onEnd?.();
      return false;
    }

    this.stopCurrent();

    // 1. If provider is not web_speech, try server TTS proxy first (Azure Speech, VieNeu Local/Cloud, etc.)
    if (config.provider !== 'web_speech') {
      try {
        const resp = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            provider: config.provider,
            voiceId: config.voiceId,
            speed: config.speed,
            pitch: config.pitch,
            volume: config.volume,
            vieneuUrl: config.vieneuLocalUrl,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.audioBase64) {
            this.activeProviderStatus = `Đang đọc bằng ${data.providerUsed}`;
            return await this.playBase64Audio(
              data.audioBase64,
              data.mimeType || 'audio/mpeg',
              config,
              cleanText,
              callbacks
            );
          }
          if (data.error) {
            this.lastError = data.error;
          }
        }
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : 'Lỗi gọi /api/tts';
      }

      if (!config.autoFallbackToWebSpeech) {
        callbacks.onError?.(this.lastError || 'Không thể phát TTS từ server');
        callbacks.onEnd?.();
        return false;
      }
    }

    // 2. Fallback or direct Browser Web Speech API (prioritizing Microsoft Nam Minh / Hoài My if in Edge)
    return this.playBrowserWebSpeech(cleanText, config, callbacks);
  }

  private playBase64Audio(
    base64: string,
    mimeType: string,
    config: VoiceSystemConfig,
    text: string,
    callbacks: TTSPlaybackCallbacks
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (typeof window === 'undefined') {
        callbacks.onEnd?.();
        resolve(false);
        return;
      }

      const audio = new Audio(`data:${mimeType};base64,${base64}`);
      audio.volume = Math.max(0, Math.min(1, config.volume));
      audio.playbackRate = Math.max(0.5, Math.min(2.0, config.speed));
      this.currentAudio = audio;

      const words = text.split(/\s+/);
      let tick = 0;

      const startVisemeLoop = () => {
        callbacks.onStart?.();
        this.lipSyncInterval = window.setInterval(() => {
          tick += 1;
          const wordSample = words[tick % Math.max(1, words.length)] || 'a';
          const vowelWeight = /[aăâeêioôơuưyáàảãạ]/i.test(wordSample) ? 0.85 : 0.45;
          const openness = Math.max(
            0.15,
            Math.min(1.0, Math.abs(Math.sin(tick * 0.75)) * vowelWeight + 0.15)
          );
          callbacks.onViseme?.(openness);
        }, 75);
      };

      const cleanup = (ok: boolean) => {
        if (this.lipSyncInterval !== null) {
          window.clearInterval(this.lipSyncInterval);
          this.lipSyncInterval = null;
        }
        callbacks.onViseme?.(0);
        callbacks.onEnd?.();
        resolve(ok);
      };

      audio.onplay = () => startVisemeLoop();
      audio.onended = () => cleanup(true);
      audio.onerror = () => {
        if (this.lipSyncInterval !== null) {
          window.clearInterval(this.lipSyncInterval);
          this.lipSyncInterval = null;
        }
        if (config.autoFallbackToWebSpeech) {
          this.playBrowserWebSpeech(text, config, callbacks).then(resolve);
        } else {
          cleanup(false);
        }
      };

      audio.play().catch(() => {
        if (config.autoFallbackToWebSpeech) {
          this.playBrowserWebSpeech(text, config, callbacks).then(resolve);
        } else {
          cleanup(false);
        }
      });
    });
  }

  private playBrowserWebSpeech(
    text: string,
    config: VoiceSystemConfig,
    callbacks: TTSPlaybackCallbacks
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Simulate timed subtitle + lip-sync even when headless/no audio device
        this.simulateSilentLipSync(text, config, callbacks).then(resolve);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = findBestBrowserVietnameseVoice(config.voiceId);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || 'vi-VN';
          this.activeProviderStatus = `Web Speech (${voice.name})`;
        } else {
          utterance.lang = 'vi-VN';
          this.activeProviderStatus = 'Web Speech (vi-VN)';
        }

        utterance.rate = Math.max(0.6, Math.min(1.8, config.speed));
        utterance.pitch = Math.max(0.5, Math.min(1.5, config.pitch));
        utterance.volume = Math.max(0, Math.min(1, config.volume));

        let tick = 0;
        let finished = false;

        const finish = (ok: boolean) => {
          if (finished) return;
          finished = true;
          if (this.lipSyncInterval !== null) {
            window.clearInterval(this.lipSyncInterval);
            this.lipSyncInterval = null;
          }
          callbacks.onViseme?.(0);
          callbacks.onEnd?.();
          resolve(ok);
        };

        utterance.onstart = () => {
          callbacks.onStart?.();
          this.lipSyncInterval = window.setInterval(() => {
            tick += 1;
            const openness = 0.2 + Math.abs(Math.sin(tick * 0.8)) * 0.75;
            callbacks.onViseme?.(openness);
          }, 80);
        };

        utterance.onboundary = () => {
          callbacks.onViseme?.(0.85);
        };

        utterance.onend = () => finish(true);
        utterance.onerror = () => {
          this.simulateSilentLipSync(text, config, callbacks).then(finish);
        };

        // Safety timeout in case browser speech synthesis hangs
        const estDurationMs = Math.max(2500, Math.min(12000, text.length * 75));
        window.setTimeout(() => {
          if (!finished) finish(true);
        }, estDurationMs + 1500);

        window.speechSynthesis.speak(utterance);
      } catch {
        this.simulateSilentLipSync(text, config, callbacks).then(resolve);
      }
    });
  }

  private simulateSilentLipSync(
    text: string,
    config: VoiceSystemConfig,
    callbacks: TTSPlaybackCallbacks
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (typeof window === 'undefined') {
        callbacks.onEnd?.();
        resolve(true);
        return;
      }
      callbacks.onStart?.();
      const durationMs = Math.max(2200, Math.min(7500, Math.round((text.length * 58) / Math.max(0.7, config.speed))));
      let elapsed = 0;
      this.lipSyncInterval = window.setInterval(() => {
        elapsed += 80;
        if (elapsed >= durationMs) {
          if (this.lipSyncInterval !== null) {
            window.clearInterval(this.lipSyncInterval);
            this.lipSyncInterval = null;
          }
          callbacks.onViseme?.(0);
          callbacks.onEnd?.();
          resolve(true);
          return;
        }
        const openness = 0.2 + Math.abs(Math.sin(elapsed * 0.025)) * 0.75;
        callbacks.onViseme?.(openness);
      }, 80);
    });
  }
}

export const ttsProviderManager = new TTSProviderManager();
