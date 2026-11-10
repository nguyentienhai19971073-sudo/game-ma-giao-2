import {
  GiftMappingConfig,
  GiftMappingInput,
  UnknownGiftLog,
} from '../types/magiao';
import {
  DEFAULT_MAGIAO_GIFT_MAPPINGS,
  DEFAULT_MAGIAO_GIFT_PRESETS,
} from '../data/sectDefaults';

export class GiftRegistry {
  private mappings: GiftMappingConfig[] = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS);
  private unknownGifts: UnknownGiftLog[] = [];
  private listeners = new Set<() => void>();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public setMappingsFromServer(list: GiftMappingConfig[]) {
    if (Array.isArray(list) && list.length > 0) {
      this.mappings = structuredClone(list);
      this.notify();
    }
  }

  public setUnknownGiftsFromServer(list: UnknownGiftLog[]) {
    if (Array.isArray(list)) {
      this.unknownGifts = structuredClone(list);
      this.notify();
    }
  }

  public getAll(): GiftMappingConfig[] {
    return structuredClone(this.mappings);
  }

  public getPresets() {
    return structuredClone(DEFAULT_MAGIAO_GIFT_PRESETS);
  }

  public getUnknownGifts(): UnknownGiftLog[] {
    return structuredClone(this.unknownGifts);
  }

  /**
   * Resolves a TikTok gift event by Gift ID first, then by exact/partial Gift Name,
   * or falls back to coinValue calculation.
   */
  public resolveGift(params: {
    giftId?: number;
    giftName?: string;
    coinValue?: number;
  }): { matched: GiftMappingConfig | null; isUnknown: boolean } {
    const enabledList = this.mappings.filter(m => m.enabled);

    if (params.giftId && params.giftId > 0) {
      const byId = enabledList.find(
        m =>
          (Array.isArray(m.giftIds) && m.giftIds.includes(params.giftId!)) ||
          m.giftId === params.giftId
      );
      if (byId) {
        return { matched: byId, isUnknown: false };
      }
    }

    if (params.giftName) {
      const cleanName = params.giftName.trim().toLowerCase();
      const byName = enabledList.find(m => m.giftName.trim().toLowerCase() === cleanName);
      if (byName) {
        return { matched: byName, isUnknown: false };
      }
      const byPartial = enabledList.find(
        m =>
          cleanName.includes(m.giftName.trim().toLowerCase()) ||
          m.giftName.trim().toLowerCase().includes(cleanName)
      );
      if (byPartial) {
        return { matched: byPartial, isUnknown: false };
      }
    }

    if (params.coinValue && params.coinValue > 0) {
      // Find closest tier <= coinValue if exact ID wasn't matched
      const sortedByCoin = [...enabledList].sort((a, b) => b.coinValue - a.coinValue);
      const byCoin = sortedByCoin.find(m => m.coinValue === params.coinValue);
      if (byCoin) {
        return { matched: byCoin, isUnknown: false };
      }
    }

    return { matched: null, isUnknown: true };
  }

  public async fetchFromServer(): Promise<void> {
    try {
      const resp = await fetch('/api/gifts');
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
      }
      if (Array.isArray(data.unknownGifts)) {
        this.unknownGifts = data.unknownGifts;
      }
      this.notify();
    } catch {
      // Offline or test environment fallback
    }
  }

  public async createGift(input: GiftMappingInput): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        return { ok: false, error: data.error || 'Không thể thêm quà mới.' };
      }
      if (Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Lỗi kết nối server' };
    }
  }

  public async updateGift(id: string, input: Partial<GiftMappingInput>): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await fetch(`/api/gifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        return { ok: false, error: data.error || 'Không thể cập nhật quà.' };
      }
      if (Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Lỗi kết nối server' };
    }
  }

  public async deleteGift(id: string): Promise<boolean> {
    try {
      const resp = await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (resp.ok && data.ok && Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async resetToDefaults(): Promise<void> {
    try {
      const resp = await fetch('/api/gifts/reset', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
      }
    } catch {
      this.mappings = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS);
      this.notify();
    }
  }

  public async reportUnknownGift(payload: {
    giftId?: number;
    giftName?: string;
    senderName?: string;
    repeatCount?: number;
    diamondCount?: number;
  }): Promise<void> {
    try {
      const resp = await fetch('/api/gifts/unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.unknownGifts)) {
        this.unknownGifts = data.unknownGifts;
        this.notify();
      }
    } catch {
      // Ignore network error
    }
  }
}

export const giftRegistry = new GiftRegistry();
