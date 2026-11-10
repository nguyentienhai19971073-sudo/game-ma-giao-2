import {
  BulkGiftIdCheckResult,
  GiftItemMetadata,
  GiftMappingConfig,
  GiftMappingInput,
  UnknownGiftLog,
} from '../types/magiao';
import {
  DEFAULT_MAGIAO_GIFT_MAPPINGS,
  DEFAULT_MAGIAO_GIFT_PRESETS,
} from '../data/sectDefaults';

export function normalizeClientGiftIdStrings(
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

export function tokenizeClientBulkGiftIds(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return [];
  return rawText
    .split(/[\n,;|\s]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

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

  public getGroupGiftIdStrings(m: GiftMappingConfig): string[] {
    return normalizeClientGiftIdStrings(m.giftIds, m.giftIdStrings, m.giftId);
  }

  /**
   * Inspects a bulk list of Gift IDs before adding to a target group.
   * Detects invalid tokens, duplicates within the pasted batch, IDs already in the same group,
   * and IDs conflicting with another value group.
   */
  public inspectBulkGiftIds(
    rawInput: string | (string | number)[],
    targetGroupId?: string
  ): BulkGiftIdCheckResult {
    const tokens = Array.isArray(rawInput)
      ? rawInput.map(x => String(x).trim()).filter(Boolean)
      : tokenizeClientBulkGiftIds(rawInput);

    const targetGroup = targetGroupId
      ? this.mappings.find(m => m.id === targetGroupId)
      : undefined;
    const sameGroupSet = new Set(
      targetGroup ? this.getGroupGiftIdStrings(targetGroup) : []
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

      const conflictingGroup = this.mappings.find(
        m => m.id !== targetGroupId && this.getGroupGiftIdStrings(m).includes(cleanId)
      );
      if (conflictingGroup) {
        conflictOtherGroups.push({
          giftId: cleanId,
          groupId: conflictingGroup.id,
          groupName:
            conflictingGroup.groupName ||
            `NHÓM ${conflictingGroup.coinValue.toLocaleString('vi-VN')} X`,
          coinValue: conflictingGroup.coinValue,
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
   * Resolves a TikTok gift event by Gift ID first (string or number), then by exact/partial Gift Name,
   * or falls back to coinValue calculation. Respects per-ID enabled status.
   */
  public resolveGift(params: {
    giftId?: number | string;
    giftName?: string;
    coinValue?: number;
  }): { matched: GiftMappingConfig | null; resolvedGiftName?: string; isUnknown: boolean } {
    const enabledList = this.mappings.filter(m => m.enabled);

    if (params.giftId !== undefined && params.giftId !== null && String(params.giftId).trim() !== '') {
      const idStr = String(params.giftId).trim().replace(/^0+/, '');
      const idNum = Number(idStr);
      if (idStr) {
        const byId = enabledList.find(m => {
          const strs = this.getGroupGiftIdStrings(m);
          const hasId =
            strs.includes(idStr) ||
            (Number.isFinite(idNum) &&
              ((Array.isArray(m.giftIds) && m.giftIds.includes(idNum)) || m.giftId === idNum));
          if (!hasId) return false;
          // Check individual item enabled state if configured
          const itemMeta = m.giftItems?.[idStr];
          if (itemMeta && itemMeta.enabled === false) {
            return false;
          }
          return true;
        });
        if (byId) {
          const itemMeta = byId.giftItems?.[idStr];
          return {
            matched: byId,
            resolvedGiftName: itemMeta?.giftName || byId.giftName,
            isUnknown: false,
          };
        }
      }
    }

    if (params.giftName) {
      const cleanName = params.giftName.trim().toLowerCase();
      const byName = enabledList.find(m => m.giftName.trim().toLowerCase() === cleanName);
      if (byName) {
        return { matched: byName, resolvedGiftName: byName.giftName, isUnknown: false };
      }
      const byPartial = enabledList.find(
        m =>
          cleanName.includes(m.giftName.trim().toLowerCase()) ||
          m.giftName.trim().toLowerCase().includes(cleanName)
      );
      if (byPartial) {
        return { matched: byPartial, resolvedGiftName: byPartial.giftName, isUnknown: false };
      }
    }

    if (params.coinValue && params.coinValue > 0) {
      const sortedByCoin = [...enabledList].sort((a, b) => b.coinValue - a.coinValue);
      const byCoin = sortedByCoin.find(m => m.coinValue === params.coinValue);
      if (byCoin) {
        return { matched: byCoin, resolvedGiftName: byCoin.giftName, isUnknown: false };
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

  public async bulkAddIdsToGroup(
    targetGroupId: string,
    rawInput: string | (string | number)[],
    defaultItemName?: string
  ): Promise<{
    ok: boolean;
    addedCount: number;
    check: BulkGiftIdCheckResult;
    error?: string;
  }> {
    const localCheck = this.inspectBulkGiftIds(rawInput, targetGroupId);
    if (localCheck.validNewIds.length === 0) {
      const reason =
        localCheck.conflictOtherGroups.length > 0
          ? `Phát hiện ${localCheck.conflictOtherGroups.length} ID đã tồn tại ở nhóm khác (VD: ID ${localCheck.conflictOtherGroups[0].giftId} thuộc ${localCheck.conflictOtherGroups[0].groupName}).`
          : localCheck.alreadyInSameGroupIds.length > 0
          ? 'Tất cả ID nhập vào đều đã có sẵn trong nhóm này.'
          : 'Không có Gift ID hợp lệ nào để thêm.';
      return { ok: false, addedCount: 0, check: localCheck, error: reason };
    }

    // Apply locally first for immediate responsiveness and Node test compatibility
    const idx = this.mappings.findIndex(m => m.id === targetGroupId);
    if (idx === -1) {
      return {
        ok: false,
        addedCount: 0,
        check: localCheck,
        error: `Không tìm thấy nhóm quà "${targetGroupId}".`,
      };
    }

    const group = this.mappings[idx];
    const currentStrs = this.getGroupGiftIdStrings(group);
    const mergedStrs = Array.from(new Set([...currentStrs, ...localCheck.validNewIds]));
    const mergedNums = mergedStrs.map(Number).filter(n => Number.isFinite(n) && n > 0);
    const nextItems: Record<string, GiftItemMetadata> = { ...(group.giftItems || {}) };
    for (const idStr of localCheck.validNewIds) {
      nextItems[idStr] = {
        giftId: idStr,
        giftName: (defaultItemName && defaultItemName.trim()) || group.giftName,
        enabled: true,
      };
    }

    this.mappings[idx] = {
      ...group,
      giftIdStrings: mergedStrs,
      giftIds: mergedNums,
      giftId: mergedNums[0],
      giftItems: nextItems,
      updatedAt: new Date().toISOString(),
    };
    this.notify();

    try {
      if (typeof fetch !== 'undefined') {
        const resp = await fetch(`/api/gifts/${targetGroupId}/bulk-add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawInput: localCheck.validNewIds, defaultItemName }),
        });
        const data = await resp.json();
        if (resp.ok && data.ok && Array.isArray(data.mappings)) {
          this.mappings = data.mappings;
          this.notify();
        }
      }
    } catch {
      // Node test environment fallback
    }

    return {
      ok: true,
      addedCount: localCheck.validNewIds.length,
      check: localCheck,
    };
  }

  public async bulkReplaceIdsInGroup(
    targetGroupId: string,
    rawInput: string | (string | number)[],
    defaultItemName?: string
  ): Promise<{
    ok: boolean;
    replacedCount: number;
    check: BulkGiftIdCheckResult;
    error?: string;
  }> {
    const localCheck = this.inspectBulkGiftIds(rawInput, targetGroupId);
    if (localCheck.conflictOtherGroups.length > 0) {
      const c = localCheck.conflictOtherGroups[0];
      return {
        ok: false,
        replacedCount: 0,
        check: localCheck,
        error: `Phát hiện ${localCheck.conflictOtherGroups.length} ID đã tồn tại ở nhóm khác (VD: ID ${c.giftId} thuộc ${c.groupName} - ${c.coinValue} X). Không để cùng một ID hoạt động ở nhiều nhóm giá trị khác nhau.`,
      };
    }

    const idx = this.mappings.findIndex(m => m.id === targetGroupId);
    if (idx === -1) {
      return {
        ok: false,
        replacedCount: 0,
        check: localCheck,
        error: `Không tìm thấy nhóm quà "${targetGroupId}".`,
      };
    }

    const tokens = Array.isArray(rawInput)
      ? rawInput.map(x => String(x).trim()).filter(Boolean)
      : tokenizeClientBulkGiftIds(rawInput);
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
        check: localCheck,
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
    const nextNums = orderedValidIds.map(Number).filter(n => Number.isFinite(n) && n > 0);

    this.mappings[idx] = {
      ...group,
      giftIdStrings: orderedValidIds,
      giftIds: nextNums,
      giftId: nextNums[0],
      giftItems: nextItems,
      updatedAt: new Date().toISOString(),
    };
    this.notify();

    try {
      if (typeof fetch !== 'undefined') {
        const resp = await fetch(`/api/gifts/${targetGroupId}/bulk-replace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawInput: orderedValidIds, defaultItemName }),
        });
        const data = await resp.json();
        if (resp.ok && data.ok && Array.isArray(data.mappings)) {
          this.mappings = data.mappings;
          this.notify();
        }
      }
    } catch {
      // Node test environment fallback
    }

    return {
      ok: true,
      replacedCount: orderedValidIds.length,
      check: localCheck,
    };
  }

  public async moveGiftIdBetweenGroups(
    giftIdInput: string | number,
    fromGroupId: string,
    toGroupId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const idStr = String(giftIdInput).trim();
    if (!idStr || fromGroupId === toGroupId) {
      return { ok: false, error: 'Nhóm đích không hợp lệ.' };
    }
    const fromIdx = this.mappings.findIndex(m => m.id === fromGroupId);
    const toIdx = this.mappings.findIndex(m => m.id === toGroupId);
    if (fromIdx === -1 || toIdx === -1) {
      return { ok: false, error: 'Không tìm thấy nhóm nguồn hoặc nhóm đích.' };
    }

    const fromGroup = this.mappings[fromIdx];
    const toGroup = this.mappings[toIdx];
    const prevMeta = fromGroup.giftItems?.[idStr];

    const nextFromStrs = this.getGroupGiftIdStrings(fromGroup).filter(s => s !== idStr);
    const nextFromNums = nextFromStrs.map(Number).filter(n => Number.isFinite(n) && n > 0);
    const nextFromItems = { ...(fromGroup.giftItems || {}) };
    delete nextFromItems[idStr];

    const nextToStrs = Array.from(new Set([...this.getGroupGiftIdStrings(toGroup), idStr]));
    const nextToNums = nextToStrs.map(Number).filter(n => Number.isFinite(n) && n > 0);
    const nextToItems: Record<string, GiftItemMetadata> = {
      ...(toGroup.giftItems || {}),
      [idStr]: {
        giftId: idStr,
        giftName: prevMeta?.giftName || toGroup.giftName,
        enabled: prevMeta ? prevMeta.enabled !== false : true,
      },
    };

    this.mappings[fromIdx] = {
      ...fromGroup,
      giftIdStrings: nextFromStrs,
      giftIds: nextFromNums,
      giftId: nextFromNums[0],
      giftItems: nextFromItems,
    };
    this.mappings[toIdx] = {
      ...toGroup,
      giftIdStrings: nextToStrs,
      giftIds: nextToNums,
      giftId: nextToNums[0],
      giftItems: nextToItems,
    };
    this.notify();

    try {
      if (typeof fetch !== 'undefined') {
        const resp = await fetch('/api/gifts/move-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giftId: idStr, fromGroupId, toGroupId }),
        });
        const data = await resp.json();
        if (resp.ok && data.ok && Array.isArray(data.mappings)) {
          this.mappings = data.mappings;
          this.notify();
        }
      }
    } catch {
      // Fallback
    }

    return { ok: true };
  }

  public async createGift(input: GiftMappingInput): Promise<{ ok: boolean; error?: string; record?: GiftMappingConfig }> {
    const check = this.inspectBulkGiftIds(
      input.giftIdStrings || input.giftIds || (input.giftId ? [input.giftId] : [])
    );
    if (check.conflictOtherGroups.length > 0) {
      const c = check.conflictOtherGroups[0];
      return {
        ok: false,
        error: `Gift ID ${c.giftId} đã tồn tại ở ${c.groupName} (${c.coinValue} X). Không cho phép một ID hoạt động ở hai nhóm giá trị khác nhau.`,
      };
    }

    try {
      const resp = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        return { ok: false, error: data.error || 'Không thể thêm nhóm quà mới.' };
      }
      if (Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
      }
      return { ok: true, record: data.record };
    } catch {
      // Local fallback when running without HTTP server
      const idStrs = check.validNewIds;
      const idNums = idStrs.map(Number).filter(n => Number.isFinite(n) && n > 0);
      const coinValue = Math.max(1, Number(input.coinValue || 1));
      const newRec: GiftMappingConfig = {
        id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        groupName: input.groupName || `NHÓM ${coinValue.toLocaleString('vi-VN')} X`,
        giftIds: idNums,
        giftIdStrings: idStrs,
        giftId: idNums[0],
        giftName: input.giftName || `Bảo Vật ${coinValue.toLocaleString('vi-VN')} X`,
        coinValue,
        rankGranted: input.rankGranted,
        inGameEffect: input.inGameEffect || 'Tăng công trạng Ma Giáo',
        visualAura: input.visualAura || '#D4AF37',
        soundEffect: input.soundEffect || 'gong',
        priorityLevel: input.priorityLevel || 3,
        grantsThrone: Boolean(input.grantsThrone),
        grantsCoLeader: Boolean(input.grantsCoLeader),
        icon: input.icon || '🜂',
        enabled: input.enabled !== false,
      };
      this.mappings.push(newRec);
      this.notify();
      return { ok: true, record: newRec };
    }
  }

  public async updateGift(id: string, input: Partial<GiftMappingInput>): Promise<{ ok: boolean; error?: string }> {
    const idx = this.mappings.findIndex(m => m.id === id);
    if (idx !== -1) {
      const existing = this.mappings[idx];
      const nextStrs =
        input.giftIds !== undefined || input.giftIdStrings !== undefined
          ? normalizeClientGiftIdStrings(input.giftIds, input.giftIdStrings, input.giftId)
          : this.getGroupGiftIdStrings(existing);

      // Check cross-group conflicts locally first
      for (const idStr of nextStrs) {
        const conflict = this.mappings.find(
          m => m.id !== id && this.getGroupGiftIdStrings(m).includes(idStr)
        );
        if (conflict) {
          return {
            ok: false,
            error: `Gift ID ${idStr} đã thuộc về ${conflict.groupName || conflict.giftName} (${conflict.coinValue} X).`,
          };
        }
      }

      const nextNums = nextStrs.map(Number).filter(n => Number.isFinite(n) && n > 0);
      this.mappings[idx] = {
        ...existing,
        ...input,
        giftIdStrings: nextStrs,
        giftIds: nextNums,
        giftId: nextNums[0],
        giftItems: input.giftItems
          ? { ...(existing.giftItems || {}), ...input.giftItems }
          : existing.giftItems,
      };
      this.notify();
    }

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
    } catch {
      return { ok: true };
    }
  }

  public async deleteGift(id: string): Promise<boolean> {
    this.mappings = this.mappings.filter(m => m.id !== id);
    this.notify();
    try {
      const resp = await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (resp.ok && data.ok && Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
        return true;
      }
      return true;
    } catch {
      return true;
    }
  }

  public async resetToDefaults(): Promise<void> {
    try {
      const resp = await fetch('/api/gifts/reset', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.mappings)) {
        this.mappings = data.mappings;
        this.notify();
        return;
      }
    } catch {
      // Fallback
    }
    this.mappings = structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS);
    this.notify();
  }

  public getFlattenedGiftItems(): {
    groupId: string;
    groupName: string;
    giftId: string;
    giftName: string;
    coinValue: number;
    enabled: boolean;
  }[] {
    const rows: {
      groupId: string;
      groupName: string;
      giftId: string;
      giftName: string;
      coinValue: number;
      enabled: boolean;
    }[] = [];

    for (const m of this.mappings) {
      const groupName = m.groupName || `NHÓM ${m.coinValue.toLocaleString('vi-VN')} X`;
      const idStrs = this.getGroupGiftIdStrings(m);
      for (const idStr of idStrs) {
        const meta = m.giftItems?.[idStr];
        rows.push({
          groupId: m.id,
          groupName,
          giftId: idStr,
          giftName: meta?.giftName || m.giftName,
          coinValue: m.coinValue,
          enabled: meta ? meta.enabled !== false : m.enabled !== false,
        });
      }
    }
    return rows;
  }

  public async updateGiftItemMetadata(
    groupId: string,
    giftId: string | number,
    patch: { giftName?: string; enabled?: boolean }
  ): Promise<boolean> {
    const idStr = String(giftId).trim();
    const idx = this.mappings.findIndex(m => m.id === groupId);
    if (idx === -1) return false;
    const group = this.mappings[idx];
    const currentMeta = group.giftItems?.[idStr] || {
      giftId: idStr,
      giftName: group.giftName,
      enabled: true,
    };
    const nextItems: Record<string, GiftItemMetadata> = {
      ...(group.giftItems || {}),
      [idStr]: {
        ...currentMeta,
        ...patch,
      },
    };
    await this.updateGift(groupId, { giftItems: nextItems });
    return true;
  }

  public async removeGiftIdFromGroup(groupId: string, giftId: string | number): Promise<boolean> {
    const idStr = String(giftId).trim();
    const idx = this.mappings.findIndex(m => m.id === groupId);
    if (idx === -1) return false;
    const group = this.mappings[idx];
    const nextStrs = this.getGroupGiftIdStrings(group).filter(s => s !== idStr);
    const nextNums = nextStrs.map(Number).filter(n => Number.isFinite(n) && n > 0);
    const nextItems = { ...(group.giftItems || {}) };
    delete nextItems[idStr];
    await this.updateGift(groupId, {
      giftIds: nextNums,
      giftIdStrings: nextStrs,
      giftItems: nextItems,
    });
    return true;
  }

  public exportJson(): string {
    return JSON.stringify(this.mappings, null, 2);
  }

  public exportCsv(): string {
    const lines = ['giftId,giftName,coinValue,groupName,enabled'];
    for (const row of this.getFlattenedGiftItems()) {
      const safeName = `"${row.giftName.replace(/"/g, '""')}"`;
      const safeGroup = `"${row.groupName.replace(/"/g, '""')}"`;
      lines.push(`${row.giftId},${safeName},${row.coinValue},${safeGroup},${row.enabled}`);
    }
    return lines.join('\n');
  }

  public async importJson(rawJson: string | GiftMappingConfig[]): Promise<{ ok: boolean; error?: string }> {
    try {
      const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      const list: GiftMappingConfig[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.mappings)
        ? parsed.mappings
        : [];
      if (list.length === 0) {
        return { ok: false, error: 'Dữ liệu JSON không chứa danh sách quà hợp lệ.' };
      }
      for (const item of list) {
        const existingIdx = this.mappings.findIndex(
          m => m.id === item.id || m.coinValue === item.coinValue
        );
        const itemIds = this.getGroupGiftIdStrings(item);
        if (existingIdx !== -1) {
          await this.bulkAddIdsToGroup(this.mappings[existingIdx].id, itemIds, item.giftName);
        } else {
          await this.createGift({
            giftName: item.giftName,
            groupName: item.groupName,
            giftIds: itemIds,
            giftIdStrings: itemIds,
            coinValue: item.coinValue,
            rankGranted: item.rankGranted || 'de_tu',
            grantsThrone: item.grantsThrone,
            grantsCoLeader: item.grantsCoLeader,
          });
        }
      }
      this.notify();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Lỗi phân tích JSON danh sách quà.',
      };
    }
  }

  public async importCsv(rawCsv: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const lines = rawCsv
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        return { ok: false, error: 'Nội dung CSV trống.' };
      }
      for (const line of lines) {
        if (/^giftid\s*,/i.test(line)) continue;
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        const idStr = parts[0];
        const giftName = parts[1] || 'Quà TikTok';
        const coinValue = Math.max(1, Number(parts[2] || 1));
        if (!/^\d+$/.test(idStr)) continue;

        let group = this.mappings.find(m => m.coinValue === coinValue);
        if (!group) {
          const created = await this.createGift({
            giftName,
            groupName: `NHÓM ${coinValue.toLocaleString('vi-VN')} X`,
            giftIds: [idStr],
            giftIdStrings: [idStr],
            coinValue,
            rankGranted: 'de_tu',
          });
          if (created.record) group = created.record;
        } else {
          await this.bulkAddIdsToGroup(group.id, [idStr], giftName);
        }
      }
      this.notify();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Lỗi phân tích CSV danh sách quà.',
      };
    }
  }

  public async reportUnknownGift(payload: {
    giftId?: number | string;
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

