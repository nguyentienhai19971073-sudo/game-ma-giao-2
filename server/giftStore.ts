import fs from 'fs';
import path from 'path';
import {
  GiftMappingConfig,
  GiftMappingInput,
  UnknownGiftLog,
} from '../src/types/magiao';
import {
  DEFAULT_MAGIAO_GIFT_MAPPINGS,
  DEFAULT_MAGIAO_GIFT_PRESETS,
} from '../src/data/sectDefaults';

export { DEFAULT_MAGIAO_GIFT_MAPPINGS, DEFAULT_MAGIAO_GIFT_PRESETS };

export function normalizeGiftIds(giftIds?: number[], legacyGiftId?: number): number[] {
  const rawList: number[] = [];
  if (Array.isArray(giftIds)) {
    for (const id of giftIds) {
      const n = Number(id);
      if (Number.isInteger(n) && n > 0) rawList.push(n);
    }
  }
  if (legacyGiftId !== undefined) {
    const n = Number(legacyGiftId);
    if (Number.isInteger(n) && n > 0) rawList.push(n);
  }
  return Array.from(new Set(rawList));
}

export class PersistentGiftStore {
  private readonly filePath: string;
  private mappings: GiftMappingConfig[] = [];
  private unknownLogs: UnknownGiftLog[] = [];

  constructor(filePath = path.resolve(process.cwd(), 'data', 'magiao_gifts.json')) {
    this.filePath = filePath;
    this.mappings = this.loadFromDisk();
  }

  private loadFromDisk(): GiftMappingConfig[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => this.sanitizeMapping(item));
        }
      }
    } catch (err) {
      console.warn('[GiftStore] Failed to load gift store from disk, using defaults:', err);
    }
    const defaults = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS);
    this.saveToDisk(defaults);
    return defaults;
  }

  private saveToDisk(list: GiftMappingConfig[]) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[GiftStore] Failed to save gift store to disk:', err);
    }
  }

  private sanitizeMapping(raw: Partial<GiftMappingConfig>): GiftMappingConfig {
    const giftIds = normalizeGiftIds(raw.giftIds, raw.giftId);
    const now = new Date().toISOString();
    return {
      id: String(raw.id || `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      giftIds,
      giftId: giftIds[0],
      giftName: String(raw.giftName || 'Bảo Vật Ma Giáo').trim(),
      coinValue: Math.max(1, Number(raw.coinValue || 1)),
      rankGranted: raw.rankGranted,
      inGameEffect: String(raw.inGameEffect || 'Tăng công trạng Ma Giáo').trim(),
      visualAura: String(raw.visualAura || '#D4AF37').trim(),
      soundEffect: (raw.soundEffect as GiftMappingConfig['soundEffect']) || 'gong',
      priorityLevel: Math.max(1, Math.min(10, Number(raw.priorityLevel || 1))),
      grantsThrone: Boolean(raw.grantsThrone),
      grantsCoLeader: Boolean(raw.grantsCoLeader),
      icon: String(raw.icon || '🎁'),
      enabled: raw.enabled !== false,
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || now,
    };
  }

  public getAll(): GiftMappingConfig[] {
    return structuredClone(this.mappings);
  }

  public getUnknownLogs(): UnknownGiftLog[] {
    return structuredClone(this.unknownLogs);
  }

  public clearUnknownLogs(): void {
    this.unknownLogs = [];
  }

  public recordUnknownGift(payload: {
    giftId?: number;
    giftName?: string;
    senderName?: string;
    repeatCount?: number;
    diamondCount?: number;
  }): UnknownGiftLog {
    const entry: UnknownGiftLog = {
      id: `unk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      giftId: payload.giftId,
      giftName: payload.giftName || 'Unknown Gift',
      senderName: payload.senderName || 'Ẩn Danh',
      repeatCount: Math.max(1, Number(payload.repeatCount || 1)),
      diamondCount: payload.diamondCount,
    };
    this.unknownLogs = [entry, ...this.unknownLogs].slice(0, 100);
    return entry;
  }

  public findConflicts(giftIds: number[], excludeRecordId?: string): { giftId: number; existingMapping: GiftMappingConfig }[] {
    const conflicts: { giftId: number; existingMapping: GiftMappingConfig }[] = [];
    for (const id of giftIds) {
      const found = this.mappings.find(
        m => m.id !== excludeRecordId && normalizeGiftIds(m.giftIds, m.giftId).includes(id)
      );
      if (found) {
        conflicts.push({ giftId: id, existingMapping: structuredClone(found) });
      }
    }
    return conflicts;
  }

  public create(input: GiftMappingInput): { ok: true; record: GiftMappingConfig } | { ok: false; error: string } {
    const giftIds = normalizeGiftIds(input.giftIds, input.giftId);
    if (!input.giftName || !input.giftName.trim()) {
      return { ok: false, error: 'Tên quà TikTok không được để trống.' };
    }
    const conflicts = this.findConflicts(giftIds);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return {
        ok: false,
        error: `Gift ID ${c.giftId} đã được gán cho quà "${c.existingMapping.giftName}". Không cho phép trùng Gift ID.`,
      };
    }

    const record = this.sanitizeMapping({
      ...input,
      id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      giftIds,
      giftId: giftIds[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.mappings.push(record);
    this.saveToDisk(this.mappings);
    return { ok: true, record: structuredClone(record) };
  }

  public update(id: string, input: Partial<GiftMappingInput>): { ok: true; record: GiftMappingConfig } | { ok: false; error: string } {
    const idx = this.mappings.findIndex(m => m.id === id);
    if (idx === -1) {
      return { ok: false, error: `Không tìm thấy cấu hình quà có ID "${id}".` };
    }
    const existing = this.mappings[idx];
    const nextGiftIds =
      input.giftIds !== undefined || input.giftId !== undefined
        ? normalizeGiftIds(input.giftIds, input.giftId)
        : normalizeGiftIds(existing.giftIds, existing.giftId);

    const conflicts = this.findConflicts(nextGiftIds, id);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return {
        ok: false,
        error: `Gift ID ${c.giftId} đã thuộc về quà "${c.existingMapping.giftName}".`,
      };
    }

    const updated = this.sanitizeMapping({
      ...existing,
      ...input,
      id: existing.id,
      giftIds: nextGiftIds,
      giftId: nextGiftIds[0],
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    this.mappings[idx] = updated;
    this.saveToDisk(this.mappings);
    return { ok: true, record: structuredClone(updated) };
  }

  public delete(id: string): boolean {
    const before = this.mappings.length;
    this.mappings = this.mappings.filter(m => m.id !== id);
    if (this.mappings.length !== before) {
      this.saveToDisk(this.mappings);
      return true;
    }
    return false;
  }

  public resetToDefaults(): GiftMappingConfig[] {
    this.mappings = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS);
    this.saveToDisk(this.mappings);
    return this.getAll();
  }

  public importJson(rawPayload: unknown, mode: 'replace' | 'merge' = 'replace'): {
    ok: boolean;
    count: number;
    mappings: GiftMappingConfig[];
    error?: string;
  } {
    let arr: unknown[] | null = null;
    if (Array.isArray(rawPayload)) {
      arr = rawPayload;
    } else if (rawPayload && typeof rawPayload === 'object' && Array.isArray((rawPayload as { mappings?: unknown[] }).mappings)) {
      arr = (rawPayload as { mappings: unknown[] }).mappings;
    }

    if (!arr || arr.length === 0) {
      return { ok: false, count: 0, mappings: this.getAll(), error: 'Dữ liệu JSON không chứa danh sách quà hợp lệ.' };
    }

    const sanitized = arr.map(item => this.sanitizeMapping(item as Partial<GiftMappingConfig>));

    if (mode === 'replace') {
      this.mappings = sanitized;
    } else {
      const byId = new Map<string, GiftMappingConfig>();
      for (const m of this.mappings) byId.set(m.id, m);
      for (const m of sanitized) byId.set(m.id, m);
      this.mappings = Array.from(byId.values());
    }

    this.saveToDisk(this.mappings);
    return { ok: true, count: this.mappings.length, mappings: this.getAll() };
  }
}
