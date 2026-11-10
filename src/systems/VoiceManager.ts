import {
  VoicePriorityTier,
  VoiceQueueItem,
  VoiceSystemConfig,
  SectLeaderAnimationId,
} from '../types/magiao';
import { DEFAULT_VOICE_CONFIG } from '../data/sectDefaults';
import { ttsProviderManager } from './TTSProviderManager';

const PRIORITY_WEIGHTS: Record<VoicePriorityTier, number> = {
  diet_mon: 120,
  throne_transfer: 100,
  high_gift: 85,
  minigame: 70,
  promotion: 55,
  welcome: 35,
  boast_idle: 15,
};

export interface VoiceStateSnapshot {
  isSpeaking: boolean;
  currentItem: VoiceQueueItem | null;
  mouthOpenness: number;
  queue: VoiceQueueItem[];
  lastSpokenAt: number;
  activeProviderStatus: string;
  lastError: string;
}

type VoiceListener = (snapshot: VoiceStateSnapshot) => void;

export class VoiceManager {
  private config: VoiceSystemConfig = structuredClone(DEFAULT_VOICE_CONFIG);
  private queue: VoiceQueueItem[] = [];
  private currentItem: VoiceQueueItem | null = null;
  private isSpeaking = false;
  private mouthOpenness = 0;
  private lastSpokenAt = 0;
  private listeners = new Set<VoiceListener>();
  private processTimer: number | null = null;

  public updateConfig(next: Partial<VoiceSystemConfig>) {
    this.config = { ...this.config, ...next };
    this.notify();
  }

  public getConfig(): VoiceSystemConfig {
    return { ...this.config };
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  public getSnapshot(): VoiceStateSnapshot {
    const status = ttsProviderManager.getStatus();
    return {
      isSpeaking: this.isSpeaking,
      currentItem: this.currentItem ? { ...this.currentItem } : null,
      mouthOpenness: this.mouthOpenness,
      queue: this.queue.map(i => ({ ...i })),
      lastSpokenAt: this.lastSpokenAt,
      activeProviderStatus: status.activeProviderStatus,
      lastError: status.lastError,
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach(fn => fn(snap));
  }

  public enqueue(params: {
    text: string;
    priority: VoicePriorityTier;
    category?: string;
    animationId?: SectLeaderAnimationId;
    interruptIfHigher?: boolean;
  }): VoiceQueueItem | null {
    const cleanText = String(params.text || '')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return null;

    // Avoid duplicate identical text already waiting in queue
    if (this.queue.some(item => item.text === cleanText)) {
      return null;
    }

    const item: VoiceQueueItem = {
      id: `vq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: cleanText,
      priority: params.priority,
      priorityScore: PRIORITY_WEIGHTS[params.priority] || 15,
      category: params.category || params.priority,
      createdAt: Date.now(),
      animationId: params.animationId,
    };

    // If throne_transfer arrives, optionally interrupt lower-priority boast_idle speech immediately
    if (
      params.interruptIfHigher &&
      this.isSpeaking &&
      this.currentItem &&
      item.priorityScore > this.currentItem.priorityScore + 40
    ) {
      this.skipCurrent();
    }

    this.queue.push(item);
    // Sort highest priorityScore first, then FIFO by createdAt
    this.queue.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.createdAt - b.createdAt;
    });

    // Trim queue to maxQueueLength (dropping lowest-priority items at the tail)
    const maxLen = Math.max(3, this.config.maxQueueLength || 15);
    if (this.queue.length > maxLen) {
      this.queue = this.queue.slice(0, maxLen);
    }

    this.notify();
    this.scheduleNext();
    return item;
  }

  public skipCurrent() {
    ttsProviderManager.stopCurrent();
    this.isSpeaking = false;
    this.currentItem = null;
    this.mouthOpenness = 0;
    this.notify();
    this.scheduleNext(150);
  }

  public clearQueue() {
    this.queue = [];
    this.skipCurrent();
  }

  private scheduleNext(customDelayMs?: number) {
    if (this.isSpeaking || this.queue.length === 0) return;
    if (typeof window === 'undefined') return;

    if (this.processTimer !== null) {
      window.clearTimeout(this.processTimer);
      this.processTimer = null;
    }

    const elapsed = Date.now() - this.lastSpokenAt;
    const minCooldown = Math.max(200, this.config.cooldownBetweenLinesMs || 1200);
    const waitMs = customDelayMs !== undefined ? customDelayMs : Math.max(50, minCooldown - elapsed);

    this.processTimer = window.setTimeout(() => {
      this.processTimer = null;
      this.playNextInQueue();
    }, waitMs);
  }

  private async playNextInQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    const next = this.queue.shift();
    if (!next) return;

    this.currentItem = next;
    this.isSpeaking = true;
    this.mouthOpenness = 0.25;
    this.notify();

    await ttsProviderManager.speak(next.text, this.config, {
      onStart: () => {
        this.isSpeaking = true;
        this.notify();
      },
      onViseme: openness => {
        this.mouthOpenness = openness;
        this.notify();
      },
      onEnd: () => {
        this.isSpeaking = false;
        this.currentItem = null;
        this.mouthOpenness = 0;
        this.lastSpokenAt = Date.now();
        this.notify();
        this.scheduleNext();
      },
      onError: () => {
        this.isSpeaking = false;
        this.currentItem = null;
        this.mouthOpenness = 0;
        this.lastSpokenAt = Date.now();
        this.notify();
        this.scheduleNext();
      },
    });
  }
}

export const voiceManager = new VoiceManager();
