import fs from 'fs';
import path from 'path';
import {
  BulkGiftIdCheckResult,
  GiftItemMetadata,
  GiftMappingConfig,
  GiftMappingInput,
  UnknownGiftLog,
} from '../src/types/magiao';
import {
  DEFAULT_MAGIAO_GIFT_MAPPINGS,
  DEFAULT_MAGIAO_GIFT_PRESETS,
} from '../src/data/sectDefaults';

export { DEFAULT_MAGIAO_GIFT_MAPPINGS, DEFAULT_MAGIAO_GIFT_PRESETS };

export function normalizeGiftIdStrings(
  giftIds?: (number | string)[],
  giftIdStrings?: string[],
  legacyGiftId?: number | string
): string[] {
  const rawList: string[] = [];

  const pushToken = (val: unknown) => {
    if (val === undefined || val === null) return;
    const str = String(val).trim();
    if (/^\d+$/.test(str) && !/^0+$/.test(str)) {
      rawList.push(str.replace(/^0+/, ''));
    }
  };

  if (Array.isArray(giftIdStrings)) {
    for (const s of giftIdStrings) pushToken(s);
  }
  if (Array.isArray(giftIds)) {
    for (const id of giftIds) pushToken(id);
  }
  if (legacyGiftId !== undefined) {
    pushToken(legacyGiftId);
  }

  return Array.from(new Set(rawList));
}

export function normalizeGiftIds(
  giftIds?: (number | string)[],
  legacyGiftId?: number | string,
  giftIdStrings?: string[]
): number[] {
  const strs = normalizeGiftIdStrings(giftIds, giftIdStrings, legacyGiftId);
  const nums: number[] = [];
  for (const s of strs) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) {
      nums.push(n);
    }
  }
  return Array.from(new Set(nums));
}

/**
 * Splits a raw bulk string (comma, newline, semicolon, or whitespace separated)
 * into raw tokens with empty items removed.
 */
export function tokenizeBulkGiftIdString(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return [];
  return rawText
    .split(/[\n,;|\s]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

const LEGACY_GIFT_RANKS = new Set([
  'ngoai_mon_do_de',
  'noi_mon_de_tu',
  'su_huynh_su_ty',
  'tinh_anh_de_tu',
  'ho_phap_ma_giao',
  'dai_truong_lao',
  'dong_ton_giao_chu',
  'tan_giao_chu',
]);

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
          const hasLegacy = parsed.some(
            (item: Partial<GiftMappingConfig>) =>
              item.rankGranted && LEGACY_GIFT_RANKS.has(item.rankGranted)
          );
          if (!hasLegacy) {
            return parsed.map(item => this.sanitizeMapping(item));
          }
        }
      }
    } catch (err) {
      console.warn('[GiftStore] Failed to load gift store from disk, using defaults:', err);
    }
    const defaults = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS).map(item =>
      this.sanitizeMapping(item)
    );
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

  private sanitizeMapping(raw: Partial<GiftMappingConfig | GiftMappingInput> & { id?: string; createdAt?: string; updatedAt?: string }): GiftMappingConfig {
    const giftIdStrings = normalizeGiftIdStrings(raw.giftIds, raw.giftIdStrings, raw.giftId);
    const giftIds = normalizeGiftIds(raw.giftIds, raw.giftId, giftIdStrings);
    const coinValue = Math.max(1, Number(raw.coinValue || 1));
    const defaultGiftName = String(raw.giftName || `Bảo Vật ${coinValue.toLocaleString('vi-VN')} X`).trim();
    const groupName = String(
      raw.groupName || `NHÓM ${coinValue.toLocaleString('vi-VN')} X`
    ).trim();

    const existingItems = raw.giftItems && typeof raw.giftItems === 'object' ? raw.giftItems : {};
    const giftItems: Record<string, GiftItemMetadata> = {};
    for (const idStr of giftIdStrings) {
      const prev = existingItems[idStr];
      giftItems[idStr] = {
        giftId: idStr,
        giftName: String(prev?.giftName || defaultGiftName).trim(),
        enabled: prev?.enabled !== undefined ? Boolean(prev.enabled) : raw.enabled !== false,
      };
    }

    const now = new Date().toISOString();
    return {
      id: String(raw.id || `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      groupName,
      giftIds,
      giftIdStrings,
      giftItems,
      giftId: giftIds[0],
      giftName: defaultGiftName,
      coinValue,
      rankGranted: raw.rankGranted,
      inGameEffect: String(raw.inGameEffect || 'Tăng công trạng Ma Giáo').trim(),
      visualAura: String(raw.visualAura || '#D4AF37').trim(),
      soundEffect: (raw.soundEffect as GiftMappingConfig['soundEffect']) || 'gong',
      priorityLevel: Math.max(1, Math.min(10, Number(raw.priorityLevel || 1))),
      grantsThrone: Boolean(raw.grantsThrone),
      grantsCoLeader: Boolean(raw.grantsCoLeader),
      icon: String(raw.icon || '🜂'),
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
    giftId?: number | string;
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

  public findStringConflicts(
    giftIdStrings: string[],
    excludeRecordId?: string
  ): { giftId: string; existingMapping: GiftMappingConfig }[] {
    const conflicts: { giftId: string; existingMapping: GiftMappingConfig }[] = [];
    for (const idStr of giftIdStrings) {
      const found = this.mappings.find(m => {
        if (m.id === excludeRecordId) return false;
        const mStrs = normalizeGiftIdStrings(m.giftIds, m.giftIdStrings, m.giftId);
        return mStrs.includes(idStr);
      });
      if (found) {
        conflicts.push({ giftId: idStr, existingMapping: structuredClone(found) });
      }
    }
    return conflicts;
  }

  public findConflicts(
    giftIds: (number | string)[],
    excludeRecordId?: string
  ): { giftId: number; giftIdStr: string; existingMapping: GiftMappingConfig }[] {
    const strs = normalizeGiftIdStrings(giftIds);
    return this.findStringConflicts(strs, excludeRecordId).map(c => ({
      giftId: Number(c.giftId),
      giftIdStr: c.giftId,
      existingMapping: c.existingMapping,
    }));
  }

  /**
   * Inspects a bulk list of gift IDs (string or array) against a target group before saving.
   */
  public inspectBulkGiftIds(
    rawInput: string | (string | number)[],
    targetGroupId?: string
  ): BulkGiftIdCheckResult {
    const tokens = Array.isArray(rawInput)
      ? rawInput.map(x => String(x).trim()).filter(Boolean)
      : tokenizeBulkGiftIdString(rawInput);

    const targetGroup = targetGroupId
      ? this.mappings.find(m => m.id === targetGroupId)
      : undefined;
    const sameGroupSet = new Set(
      targetGroup
        ? normalizeGiftIdStrings(targetGroup.giftIds, targetGroup.giftIdStrings, targetGroup.giftId)
        : []
    );

    const seenInBatch = new Set<string>();
    const validNewIds: string[] = [];
    const invalidTokens: string[] = [];
    const duplicateInBatchIds: string[] = [];
    const alreadyInSameGroupIds: string[] = [];
    const conflictOtherGroups: BulkGiftIdCheckResult['conflictOtherGroups'] = [];

    for (const token of tokens) {
      if (!/^\d+$/.test(token) || /^0+$/.test(token)) {
        invalidTokens.push(token);
        continue;
      }
      const cleanId = token.replace(/^0+/, '');
      if (seenInBatch.has(cleanId)) {
        duplicateInBatchIds.push(cleanId);
        continue;
      }
      seenInBatch.add(cleanId);

      if (sameGroupSet.has(cleanId)) {
        alreadyInSameGroupIds.push(cleanId);
        continue;
      }

      const otherConflict = this.findStringConflicts([cleanId], targetGroupId)[0];
      if (otherConflict) {
        conflictOtherGroups.push({
          giftId: cleanId,
          groupId: otherConflict.existingMapping.id,
          groupName:
            otherConflict.existingMapping.groupName ||
            `NHÓM ${otherConflict.existingMapping.coinValue.toLocaleString('vi-VN')} X`,
          coinValue: otherConflict.existingMapping.coinValue,
        });
        continue;
      }

      validNewIds.push(cleanId);
    }

    return {
      rawCount: tokens.length,
      validNewIds,
      invalidTokens,
      duplicateInBatchIds,
      alreadyInSameGroupIds,
      conflictOtherGroups,
    };
  }

  /**
   * Bulk-adds verified Gift IDs into a value group (or creates the value group if needed).
   */
  public bulkAddToGroup(
    targetGroupId: string,
    rawInput: string | (string | number)[],
    defaultItemName?: string
  ): {
    ok: boolean;
    addedCount: number;
    check: BulkGiftIdCheckResult;
    record?: GiftMappingConfig;
    error?: string;
  } {
    const idx = this.mappings.findIndex(m => m.id === targetGroupId);
    if (idx === -1) {
      return {
        ok: false,
        addedCount: 0,
        check: this.inspectBulkGiftIds(rawInput),
        error: `Không tìm thấy nhóm quà có ID "${targetGroupId}".`,
      };
    }

    const check = this.inspectBulkGiftIds(rawInput, targetGroupId);
    if (check.validNewIds.length === 0) {
      const reason =
        check.conflictOtherGroups.length > 0
          ? `Phát hiện ${check.conflictOtherGroups.length} ID đã tồn tại ở nhóm khác (VD: ID ${check.conflictOtherGroups[0].giftId} thuộc ${check.conflictOtherGroups[0].groupName}).`
          : check.alreadyInSameGroupIds.length > 0
          ? 'Tất cả ID nhập vào đều đã có sẵn trong nhóm này.'
          : 'Không có Gift ID hợp lệ nào để thêm.';
      return {
        ok: false,
        addedCount: 0,
        check,
        error: reason,
      };
    }

    const group = this.mappings[idx];
    const currentStrs = normalizeGiftIdStrings(group.giftIds, group.giftIdStrings, group.giftId);
    const mergedStrs = Array.from(new Set([...currentStrs, ...check.validNewIds]));
    const nextItems: Record<string, GiftItemMetadata> = { ...(group.giftItems || {}) };

    for (const idStr of check.validNewIds) {
      nextItems[idStr] = {
        giftId: idStr,
        giftName: (defaultItemName && defaultItemName.trim()) || group.giftName,
        enabled: true,
      };
    }

    const updated = this.sanitizeMapping({
      ...group,
      giftIdStrings: mergedStrs,
      giftIds: mergedStrs,
      giftItems: nextItems,
      updatedAt: new Date().toISOString(),
    });

    this.mappings[idx] = updated;
    this.saveToDisk(this.mappings);

    return {
      ok: true,
      addedCount: check.validNewIds.length,
      check,
      record: structuredClone(updated),
    };
  }

  /**
   * Replaces the entire Gift ID list of a value group with the pasted IDs (`THAY THẾ DANH SÁCH`),
   * while deduplicating within the batch and rejecting IDs that belong to other value groups.
   */
  public bulkReplaceGroupIds(
    targetGroupId: string,
    rawInput: string | (string | number)[],
    defaultItemName?: string
  ): {
    ok: boolean;
    replacedCount: number;
    check: BulkGiftIdCheckResult;
    record?: GiftMappingConfig;
    error?: string;
  } {
    const idx = this.mappings.findIndex(m => m.id === targetGroupId);
    if (idx === -1) {
      return {
        ok: false,
        replacedCount: 0,
        check: this.inspectBulkGiftIds(rawInput),
        error: `Không tìm thấy nhóm quà có ID "${targetGroupId}".`,
      };
    }

    const check = this.inspectBulkGiftIds(rawInput, targetGroupId);
    if (check.conflictOtherGroups.length > 0) {
      const c = check.conflictOtherGroups[0];
      return {
        ok: false,
        replacedCount: 0,
        check,
        error: `Phát hiện ${check.conflictOtherGroups.length} ID đã thuộc nhóm giá trị khác (VD: ID ${c.giftId} thuộc ${c.groupName} - ${c.coinValue} X). Không cho phép một ID hoạt động ở nhiều nhóm giá trị khác nhau.`,
      };
    }

    const tokens = Array.isArray(rawInput)
      ? rawInput.map(x => String(x).trim()).filter(Boolean)
      : tokenizeBulkGiftIdString(rawInput);
    const orderedValidIds: string[] = [];
    const seen = new Set<string>();
    for (const token of tokens) {
      if (/^\d+$/.test(token) && !/^0+$/.test(token)) {
        const cleanId = token.replace(/^0+/, '');
        if (!seen.has(cleanId)) {
          seen.add(cleanId);
          orderedValidIds.push(cleanId);
        }
      }
    }

    if (orderedValidIds.length === 0) {
      return {
        ok: false,
        replacedCount: 0,
        check,
        error: 'Không có Gift ID hợp lệ nào để thay thế danh sách.',
      };
    }

    const group = this.mappings[idx];
    const prevItems = group.giftItems || {};
    const nextItems: Record<string, GiftItemMetadata> = {};
    for (const idStr of orderedValidIds) {
      if (prevItems[idStr]) {
        nextItems[idStr] = { ...prevItems[idStr], giftId: idStr };
      } else {
        nextItems[idStr] = {
          giftId: idStr,
          giftName: (defaultItemName && defaultItemName.trim()) || group.giftName,
          enabled: true,
        };
      }
    }

    const updated = this.sanitizeMapping({
      ...group,
      giftIdStrings: orderedValidIds,
      giftIds: orderedValidIds,
      giftId: Number(orderedValidIds[0]) || undefined,
      giftItems: nextItems,
      updatedAt: new Date().toISOString(),
    });

    this.mappings[idx] = updated;
    this.saveToDisk(this.mappings);

    return {
      ok: true,
      replacedCount: orderedValidIds.length,
      check,
      record: structuredClone(updated),
    };
  }

  /**
   * Moves a single Gift ID from its current group to another target group.
   */
  public moveGiftId(
    giftIdInput: string | number,
    fromGroupId: string,
    toGroupId: string
  ): { ok: boolean; error?: string; mappings: GiftMappingConfig[] } {
    const idStr = String(giftIdInput).trim();
    if (!idStr || fromGroupId === toGroupId) {
      return { ok: false, error: 'Nhóm đích không hợp lệ.', mappings: this.getAll() };
    }
    const fromIdx = this.mappings.findIndex(m => m.id === fromGroupId);
    const toIdx = this.mappings.findIndex(m => m.id === toGroupId);
    if (fromIdx === -1 || toIdx === -1) {
      return { ok: false, error: 'Không tìm thấy nhóm nguồn hoặc nhóm đích.', mappings: this.getAll() };
    }

    const fromGroup = this.mappings[fromIdx];
    const toGroup = this.mappings[toIdx];
    const itemMeta = fromGroup.giftItems?.[idStr] || {
      giftId: idStr,
      giftName: toGroup.giftName,
      enabled: true,
    };

    const nextFromStrs = normalizeGiftIdStrings(
      fromGroup.giftIds,
      fromGroup.giftIdStrings,
      fromGroup.giftId
    ).filter(s => s !== idStr);
    const nextFromItems = { ...(fromGroup.giftItems || {}) };
    delete nextFromItems[idStr];

    const nextToStrs = Array.from(
      new Set([
        ...normalizeGiftIdStrings(toGroup.giftIds, toGroup.giftIdStrings, toGroup.giftId),
        idStr,
      ])
    );
    const nextToItems: Record<string, GiftItemMetadata> = {
      ...(toGroup.giftItems || {}),
      [idStr]: {
        giftId: idStr,
        giftName: itemMeta.giftName || toGroup.giftName,
        enabled: itemMeta.enabled !== false,
      },
    };

    this.mappings[fromIdx] = this.sanitizeMapping({
      ...fromGroup,
      giftIdStrings: nextFromStrs,
      giftIds: nextFromStrs,
      giftItems: nextFromItems,
      updatedAt: new Date().toISOString(),
    });
    this.mappings[toIdx] = this.sanitizeMapping({
      ...toGroup,
      giftIdStrings: nextToStrs,
      giftIds: nextToStrs,
      giftItems: nextToItems,
      updatedAt: new Date().toISOString(),
    });

    this.saveToDisk(this.mappings);
    return { ok: true, mappings: this.getAll() };
  }

  public create(
    input: GiftMappingInput
  ): { ok: true; record: GiftMappingConfig } | { ok: false; error: string } {
    const giftIdStrings = normalizeGiftIdStrings(input.giftIds, input.giftIdStrings, input.giftId);
    if (!input.giftName || !input.giftName.trim()) {
      return { ok: false, error: 'Tên quà / nhóm quà TikTok không được để trống.' };
    }
    const conflicts = this.findStringConflicts(giftIdStrings);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return {
        ok: false,
        error: `Gift ID ${c.giftId} đã được gán cho "${c.existingMapping.giftName}" (${c.existingMapping.coinValue} X). Không cho phép trùng Gift ID ở 2 nhóm khác nhau.`,
      };
    }

    const record = this.sanitizeMapping({
      ...input,
      id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      giftIdStrings,
      giftIds: giftIdStrings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.mappings.push(record);
    this.saveToDisk(this.mappings);
    return { ok: true, record: structuredClone(record) };
  }

  public update(
    id: string,
    input: Partial<GiftMappingInput>
  ): { ok: true; record: GiftMappingConfig } | { ok: false; error: string } {
    const idx = this.mappings.findIndex(m => m.id === id);
    if (idx === -1) {
      return { ok: false, error: `Không tìm thấy cấu hình quà có ID "${id}".` };
    }
    const existing = this.mappings[idx];
    const nextGiftIdStrings =
      input.giftIds !== undefined || input.giftIdStrings !== undefined || input.giftId !== undefined
        ? normalizeGiftIdStrings(input.giftIds, input.giftIdStrings, input.giftId)
        : normalizeGiftIdStrings(existing.giftIds, existing.giftIdStrings, existing.giftId);

    const conflicts = this.findStringConflicts(nextGiftIdStrings, id);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return {
        ok: false,
        error: `Gift ID ${c.giftId} đã thuộc về nhóm "${c.existingMapping.giftName}" (${c.existingMapping.coinValue} X).`,
      };
    }

    const updated = this.sanitizeMapping({
      ...existing,
      ...input,
      id: existing.id,
      giftIdStrings: nextGiftIdStrings,
      giftIds: nextGiftIdStrings,
      giftItems: input.giftItems ? { ...(existing.giftItems || {}), ...input.giftItems } : existing.giftItems,
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
    this.mappings = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS).map(m =>
      this.sanitizeMapping(m)
    );
    this.saveToDisk(this.mappings);
    return this.getAll();
  }

  public importJson(
    rawPayload: unknown,
    mode: 'replace' | 'merge' = 'merge'
  ): {
    ok: boolean;
    count: number;
    mappings: GiftMappingConfig[];
    error?: string;
  } {
    let arr: unknown[] | null = null;
    if (Array.isArray(rawPayload)) {
      arr = rawPayload;
    } else if (
      rawPayload &&
      typeof rawPayload === 'object' &&
      Array.isArray((rawPayload as { mappings?: unknown[] }).mappings)
    ) {
      arr = (rawPayload as { mappings: unknown[] }).mappings;
    }

    if (!arr || arr.length === 0) {
      return {
        ok: false,
        count: 0,
        mappings: this.getAll(),
        error: 'Dữ liệu JSON không chứa danh sách quà hợp lệ.',
      };
    }

    const sanitized = arr.map(item => this.sanitizeMapping(item as Partial<GiftMappingConfig>));

    if (mode === 'replace') {
      this.mappings = sanitized;
    } else {
      // Safe merge without overwriting existing IDs that belong to other groups
      const byId = new Map<string, GiftMappingConfig>();
      const usedGiftIds = new Set<string>();
      for (const m of this.mappings) {
        byId.set(m.id, m);
        for (const gid of normalizeGiftIdStrings(m.giftIds, m.giftIdStrings, m.giftId)) {
          usedGiftIds.add(gid);
        }
      }
      for (const incoming of sanitized) {
        const existing = byId.get(incoming.id);
        const incomingIds = normalizeGiftIdStrings(
          incoming.giftIds,
          incoming.giftIdStrings,
          incoming.giftId
        );
        if (existing) {
          const existingIds = normalizeGiftIdStrings(
            existing.giftIds,
            existing.giftIdStrings,
            existing.giftId
          );
          const nonConflicting = incomingIds.filter(
            id => existingIds.includes(id) || !usedGiftIds.has(id)
          );
          for (const id of nonConflicting) usedGiftIds.add(id);
          const mergedStrs = Array.from(new Set([...existingIds, ...nonConflicting]));
          byId.set(
            existing.id,
            this.sanitizeMapping({
              ...existing,
              ...incoming,
              giftIdStrings: mergedStrs,
              giftIds: mergedStrs,
              giftItems: { ...(existing.giftItems || {}), ...(incoming.giftItems || {}) },
            })
          );
        } else {
          const nonConflicting = incomingIds.filter(id => !usedGiftIds.has(id));
          for (const id of nonConflicting) usedGiftIds.add(id);
          byId.set(
            incoming.id,
            this.sanitizeMapping({
              ...incoming,
              giftIdStrings: nonConflicting,
              giftIds: nonConflicting,
            })
          );
        }
      }
      this.mappings = Array.from(byId.values());
    }

    this.saveToDisk(this.mappings);
    return { ok: true, count: this.mappings.length, mappings: this.getAll() };
  }
}
