import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import {
  DiscipleStayDurationConfig,
  MaGiaoMasterConfig,
  OBSSyncSettings,
  OverlayConfig,
  SceneConfig,
  VoiceSystemConfig,
  SectLeaderConfig,
} from '../src/types/magiao';
import {
  createDefaultMasterConfig,
  DEFAULT_DIET_MON_CONFIG,
  DEFAULT_MAGIAO_GIFT_MAPPINGS,
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_RANKS,
  DEFAULT_RANK_ACCUMULATION_CONFIG,
  DEFAULT_SCENE_CONFIG,
  DEFAULT_STAY_DURATION_CONFIG,
  DEFAULT_VOICE_CONFIG,
  DEFAULT_SECT_LEADER_CONFIG,
  sanitizeStayDurationConfig,
} from '../src/data/sectDefaults';
import { DEFAULT_SECT_DIALOGUE_BANK } from '../src/data/sectDialogueBank';

const LEGACY_RANK_IDS = new Set([
  'ngoai_mon_do_de',
  'noi_mon_de_tu',
  'su_huynh_su_ty',
  'tinh_anh_de_tu',
  'ho_phap_ma_giao',
  'dai_truong_lao',
  'dong_ton_giao_chu',
  'tan_giao_chu',
]);

export function buildDefaultMasterConfig(): MaGiaoMasterConfig {
  return createDefaultMasterConfig(DEFAULT_SECT_DIALOGUE_BANK);
}

export function buildDefaultOBSSyncSettings(): OBSSyncSettings {
  return {
    overlayConfig: structuredClone(DEFAULT_OVERLAY_CONFIG),
    sceneConfig: structuredClone(DEFAULT_SCENE_CONFIG),
    voiceConfig: structuredClone(DEFAULT_VOICE_CONFIG),
    sectLeaderConfig: structuredClone(DEFAULT_SECT_LEADER_CONFIG),
    stayDurationConfig: structuredClone(DEFAULT_STAY_DURATION_CONFIG),
    updatedAt: Date.now(),
  };
}

export function normalizeIncomingMasterConfig(
  raw: unknown,
  current?: MaGiaoMasterConfig
): MaGiaoMasterConfig {
  const base = current ? structuredClone(current) : buildDefaultMasterConfig();
  if (!base.stayDurationConfig) {
    base.stayDurationConfig = structuredClone(DEFAULT_STAY_DURATION_CONFIG);
  }
  if (!base.rankAccumulation) {
    base.rankAccumulation = structuredClone(DEFAULT_RANK_ACCUMULATION_CONFIG);
  }
  if (!base.dietMonConfig) {
    base.dietMonConfig = structuredClone(DEFAULT_DIET_MON_CONFIG);
  }
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const obj = raw as Partial<MaGiaoMasterConfig>;

  if (obj.sectLeader && typeof obj.sectLeader === 'object') {
    base.sectLeader = { ...base.sectLeader, ...obj.sectLeader };
  }
  if (Array.isArray(obj.sectLeaderAnimations) && obj.sectLeaderAnimations.length > 0) {
    base.sectLeaderAnimations = obj.sectLeaderAnimations;
  }
  if (Array.isArray(obj.ranks) && obj.ranks.length > 0) {
    const hasLegacyRank = obj.ranks.some(r => LEGACY_RANK_IDS.has(r.id));
    base.ranks = hasLegacyRank ? structuredClone(DEFAULT_RANKS) : obj.ranks;
  }
  if (obj.rankAccumulation && typeof obj.rankAccumulation === 'object') {
    base.rankAccumulation = {
      ...base.rankAccumulation,
      ...obj.rankAccumulation,
    };
  }
  if (obj.dietMonConfig && typeof obj.dietMonConfig === 'object') {
    base.dietMonConfig = {
      ...DEFAULT_DIET_MON_CONFIG,
      ...base.dietMonConfig,
      ...obj.dietMonConfig,
      coinThreshold: Math.max(10, Number(obj.dietMonConfig.coinThreshold ?? base.dietMonConfig.coinThreshold ?? 1000)),
      durationSec: Math.max(5, Math.min(30, Number(obj.dietMonConfig.durationSec ?? base.dietMonConfig.durationSec ?? 15))),
    };
  }
  if (Array.isArray(obj.giftMappings) && obj.giftMappings.length > 0) {
    const hasLegacyGiftRank = obj.giftMappings.some(
      g => g.rankGranted && LEGACY_RANK_IDS.has(g.rankGranted)
    );
    base.giftMappings = hasLegacyGiftRank
      ? structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS)
      : obj.giftMappings;
  }
  if (Array.isArray(obj.commentCommands) && obj.commentCommands.length > 0) {
    base.commentCommands = obj.commentCommands;
  }
  if (obj.commentSettings && typeof obj.commentSettings === 'object') {
    base.commentSettings = { ...base.commentSettings, ...obj.commentSettings };
  }
  if (Array.isArray(obj.dialogues) && obj.dialogues.length > 0) {
    const hasDietMonLines = obj.dialogues.some(d => d.category === 'diet_mon');
    base.dialogues = hasDietMonLines
      ? obj.dialogues
      : [
          ...obj.dialogues,
          ...DEFAULT_SECT_DIALOGUE_BANK.filter(d => d.category === 'diet_mon'),
        ];
  }
  if (obj.voiceConfig && typeof obj.voiceConfig === 'object') {
    base.voiceConfig = { ...base.voiceConfig, ...obj.voiceConfig };
  }
  if (obj.sceneConfig && typeof obj.sceneConfig === 'object') {
    base.sceneConfig = {
      ...base.sceneConfig,
      ...obj.sceneConfig,
      freeRoamBounds: {
        ...base.sceneConfig.freeRoamBounds,
        ...(obj.sceneConfig.freeRoamBounds || {}),
      },
      throneReservedZone: {
        ...base.sceneConfig.throneReservedZone,
        ...(obj.sceneConfig.throneReservedZone || {}),
      },
      zones: {
        ...base.sceneConfig.zones,
        ...(obj.sceneConfig.zones || {}),
      },
    };
  }
  if (obj.playerAnimationConfig && typeof obj.playerAnimationConfig === 'object') {
    base.playerAnimationConfig = { ...base.playerAnimationConfig, ...obj.playerAnimationConfig };
  }
  if (obj.stayDurationConfig && typeof obj.stayDurationConfig === 'object') {
    base.stayDurationConfig = sanitizeStayDurationConfig(
      obj.stayDurationConfig,
      base.stayDurationConfig
    );
    base.playerAnimationConfig.idleTimeoutSec = base.stayDurationConfig.inactivityTimeoutSec;
  } else if (
    obj.playerAnimationConfig &&
    typeof obj.playerAnimationConfig.idleTimeoutSec === 'number'
  ) {
    base.stayDurationConfig = sanitizeStayDurationConfig(
      { inactivityTimeoutSec: obj.playerAnimationConfig.idleTimeoutSec },
      base.stayDurationConfig
    );
    base.playerAnimationConfig.idleTimeoutSec = base.stayDurationConfig.inactivityTimeoutSec;
  }
  if (Array.isArray(obj.miniGames) && obj.miniGames.length > 0) {
    base.miniGames = obj.miniGames;
  }
  if (obj.sceneTransition && typeof obj.sceneTransition === 'object') {
    base.sceneTransition = { ...base.sceneTransition, ...obj.sceneTransition };
  }
  if (Array.isArray(obj.noticePanels) && obj.noticePanels.length > 0) {
    base.noticePanels = obj.noticePanels;
  }
  if (obj.overlayConfig && typeof obj.overlayConfig === 'object') {
    const incomingOverlay = obj.overlayConfig as Partial<OverlayConfig>;
    const isLegacyBeforeLayoutV2 = incomingOverlay.panelBgOpacity === undefined;
    base.overlayConfig = {
      ...DEFAULT_OVERLAY_CONFIG,
      ...base.overlayConfig,
      ...incomingOverlay,
      panelBgOpacity:
        typeof incomingOverlay.panelBgOpacity === 'number'
          ? Math.max(0.05, Math.min(0.95, incomingOverlay.panelBgOpacity))
          : base.overlayConfig.panelBgOpacity ?? 0.4,
      popupDurationMs:
        typeof incomingOverlay.popupDurationMs === 'number'
          ? Math.max(1000, Math.min(15000, incomingOverlay.popupDurationMs))
          : base.overlayConfig.popupDurationMs ?? 4000,
      popupFadeOutMs:
        typeof incomingOverlay.popupFadeOutMs === 'number'
          ? Math.max(100, Math.min(3000, incomingOverlay.popupFadeOutMs))
          : base.overlayConfig.popupFadeOutMs ?? 700,
      autoHidePopups:
        incomingOverlay.autoHidePopups !== undefined
          ? Boolean(incomingOverlay.autoHidePopups)
          : base.overlayConfig.autoHidePopups ?? true,
    };

    // Migrate legacy pre-V2 coordinates (Throne y=19 -> 22.13, Sweeping Courtyard yMin=88 -> 85.4)
    if (isLegacyBeforeLayoutV2) {
      if (base.sectLeader.thronePosition?.y === 19) {
        base.sectLeader.thronePosition = { x: base.sectLeader.thronePosition.x || 50, y: 22.13 };
      }
      if (base.sceneConfig.throneReservedZone?.yMax === 29.5) {
        base.sceneConfig.throneReservedZone = structuredClone(DEFAULT_SCENE_CONFIG.throneReservedZone);
      }
      if (base.sceneConfig.freeRoamBounds?.yMin === 31) {
        base.sceneConfig.freeRoamBounds = structuredClone(DEFAULT_SCENE_CONFIG.freeRoamBounds);
      }
      if (base.sceneConfig.zones?.sweeping_courtyard?.yMin === 88) {
        base.sceneConfig.zones.sweeping_courtyard = structuredClone(
          DEFAULT_SCENE_CONFIG.zones.sweeping_courtyard
        );
      }
    }
  }
  base.updatedAt = Date.now();
  return base;
}

export function normalizeIncomingOBSSyncSettings(
  raw: unknown,
  current?: OBSSyncSettings
): OBSSyncSettings {
  const base = current ? structuredClone(current) : buildDefaultOBSSyncSettings();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const obj = raw as Record<string, unknown>;
  const incomingOverlay = (obj.overlayConfig || {}) as Partial<OverlayConfig>;
  const isLegacyBeforeLayoutV2 =
    obj.overlayConfig !== undefined && incomingOverlay.panelBgOpacity === undefined;

  if (obj.overlayConfig && typeof obj.overlayConfig === 'object') {
    base.overlayConfig = {
      ...DEFAULT_OVERLAY_CONFIG,
      ...base.overlayConfig,
      ...incomingOverlay,
      panelBgOpacity:
        typeof incomingOverlay.panelBgOpacity === 'number'
          ? Math.max(0.05, Math.min(0.95, incomingOverlay.panelBgOpacity))
          : base.overlayConfig.panelBgOpacity ?? 0.4,
      popupDurationMs:
        typeof incomingOverlay.popupDurationMs === 'number'
          ? Math.max(1000, Math.min(15000, incomingOverlay.popupDurationMs))
          : base.overlayConfig.popupDurationMs ?? 4000,
      popupFadeOutMs:
        typeof incomingOverlay.popupFadeOutMs === 'number'
          ? Math.max(100, Math.min(3000, incomingOverlay.popupFadeOutMs))
          : base.overlayConfig.popupFadeOutMs ?? 700,
      autoHidePopups:
        incomingOverlay.autoHidePopups !== undefined
          ? Boolean(incomingOverlay.autoHidePopups)
          : base.overlayConfig.autoHidePopups ?? true,
    };
  }
  if (obj.sceneConfig && typeof obj.sceneConfig === 'object') {
    base.sceneConfig = {
      ...base.sceneConfig,
      ...(obj.sceneConfig as Partial<SceneConfig>),
    };
    if (isLegacyBeforeLayoutV2 && base.sceneConfig.zones?.sweeping_courtyard?.yMin === 88) {
      base.sceneConfig.zones.sweeping_courtyard = structuredClone(
        DEFAULT_SCENE_CONFIG.zones.sweeping_courtyard
      );
    }
  }
  if (obj.voiceConfig && typeof obj.voiceConfig === 'object') {
    base.voiceConfig = {
      ...base.voiceConfig,
      ...(obj.voiceConfig as Partial<VoiceSystemConfig>),
    };
  }
  if (obj.sectLeaderConfig && typeof obj.sectLeaderConfig === 'object') {
    base.sectLeaderConfig = {
      ...base.sectLeaderConfig,
      ...(obj.sectLeaderConfig as Partial<SectLeaderConfig>),
    };
    if (isLegacyBeforeLayoutV2 && base.sectLeaderConfig.thronePosition?.y === 19) {
      base.sectLeaderConfig.thronePosition = {
        x: base.sectLeaderConfig.thronePosition.x || 50,
        y: 22.13,
      };
    }
  }
  if (obj.stayDurationConfig && typeof obj.stayDurationConfig === 'object') {
    base.stayDurationConfig = sanitizeStayDurationConfig(
      obj.stayDurationConfig as Partial<DiscipleStayDurationConfig>,
      base.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG
    );
  }
  base.updatedAt = Date.now();
  return base;
}

export class PersistentOBSSyncStore {
  private readonly obsFilePath: string;
  private readonly masterFilePath: string;
  private obsSettings: OBSSyncSettings;
  private masterConfig: MaGiaoMasterConfig;

  constructor(
    obsFilePath = path.resolve(process.cwd(), 'data', 'magiao_obs_sync.json'),
    masterFilePath = path.resolve(process.cwd(), 'data', 'magiao_master_config.json')
  ) {
    this.obsFilePath = obsFilePath;
    this.masterFilePath = masterFilePath;
    this.masterConfig = this.loadMasterFromDisk();
    this.obsSettings = this.loadOBSFromDisk();
  }

  private loadMasterFromDisk(): MaGiaoMasterConfig {
    try {
      if (fs.existsSync(this.masterFilePath)) {
        const raw = fs.readFileSync(this.masterFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return normalizeIncomingMasterConfig(parsed);
      }
    } catch (err) {
      console.warn('[MasterConfigStore] Failed to load master config from disk, using defaults:', err);
    }
    const defaults = buildDefaultMasterConfig();
    this.saveMasterToDisk(defaults);
    return defaults;
  }

  private saveMasterToDisk(config: MaGiaoMasterConfig) {
    try {
      const dir = path.dirname(this.masterFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpFile = `${this.masterFilePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(config, null, 2), 'utf8');
      fs.renameSync(tmpFile, this.masterFilePath);
    } catch (err) {
      console.error('[MasterConfigStore] Failed to persist master config to disk:', err);
    }
  }

  private loadOBSFromDisk(): OBSSyncSettings {
    try {
      if (fs.existsSync(this.obsFilePath)) {
        const raw = fs.readFileSync(this.obsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return normalizeIncomingOBSSyncSettings(parsed);
      }
    } catch (err) {
      console.warn('[OBSSyncStore] Failed to load OBS sync settings from disk, using defaults:', err);
    }
    const defaults: OBSSyncSettings = {
      overlayConfig: structuredClone(this.masterConfig.overlayConfig),
      sceneConfig: structuredClone(this.masterConfig.sceneConfig),
      voiceConfig: structuredClone(this.masterConfig.voiceConfig),
      sectLeaderConfig: structuredClone(this.masterConfig.sectLeader),
      stayDurationConfig: structuredClone(
        this.masterConfig.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG
      ),
      updatedAt: Date.now(),
    };
    this.saveOBSToDisk(defaults);
    return defaults;
  }

  private saveOBSToDisk(settings: OBSSyncSettings) {
    try {
      const dir = path.dirname(this.obsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpFile = `${this.obsFilePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(settings, null, 2), 'utf8');
      fs.renameSync(tmpFile, this.obsFilePath);
    } catch (err) {
      console.error('[OBSSyncStore] Failed to persist OBS sync settings to disk:', err);
    }
  }

  public getSettings(): OBSSyncSettings {
    return structuredClone(this.obsSettings);
  }

  public updateSettings(incoming: unknown): OBSSyncSettings {
    this.obsSettings = normalizeIncomingOBSSyncSettings(incoming, this.obsSettings);
    this.saveOBSToDisk(this.obsSettings);

    // Keep masterConfig in sync with OBS settings
    this.masterConfig = {
      ...this.masterConfig,
      overlayConfig: structuredClone(this.obsSettings.overlayConfig),
      sceneConfig: structuredClone(this.obsSettings.sceneConfig),
      voiceConfig: structuredClone(this.obsSettings.voiceConfig),
      sectLeader: structuredClone(this.obsSettings.sectLeaderConfig),
      stayDurationConfig: structuredClone(
        this.obsSettings.stayDurationConfig ||
          this.masterConfig.stayDurationConfig ||
          DEFAULT_STAY_DURATION_CONFIG
      ),
      updatedAt: this.obsSettings.updatedAt,
    };
    this.saveMasterToDisk(this.masterConfig);
    return this.getSettings();
  }

  public getMasterConfig(): MaGiaoMasterConfig {
    return structuredClone(this.masterConfig);
  }

  public updateMasterConfig(incoming: unknown): MaGiaoMasterConfig {
    this.masterConfig = normalizeIncomingMasterConfig(incoming, this.masterConfig);
    this.saveMasterToDisk(this.masterConfig);

    // Sync OBS subset automatically
    this.obsSettings = {
      overlayConfig: structuredClone(this.masterConfig.overlayConfig),
      sceneConfig: structuredClone(this.masterConfig.sceneConfig),
      voiceConfig: structuredClone(this.masterConfig.voiceConfig),
      sectLeaderConfig: structuredClone(this.masterConfig.sectLeader),
      stayDurationConfig: structuredClone(this.masterConfig.stayDurationConfig),
      updatedAt: this.masterConfig.updatedAt,
    };
    this.saveOBSToDisk(this.obsSettings);
    return this.getMasterConfig();
  }

  public updateStayDurationConfig(incoming: unknown): MaGiaoMasterConfig {
    const sanitized = sanitizeStayDurationConfig(
      incoming as Partial<DiscipleStayDurationConfig>,
      this.masterConfig.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG
    );
    return this.updateMasterConfig({
      ...this.masterConfig,
      stayDurationConfig: sanitized,
      playerAnimationConfig: {
        ...this.masterConfig.playerAnimationConfig,
        idleTimeoutSec: sanitized.inactivityTimeoutSec,
      },
    });
  }

  public resetStayDurationConfig(): MaGiaoMasterConfig {
    return this.updateStayDurationConfig(structuredClone(DEFAULT_STAY_DURATION_CONFIG));
  }

  public resetMasterConfig(): MaGiaoMasterConfig {
    this.masterConfig = buildDefaultMasterConfig();
    this.saveMasterToDisk(this.masterConfig);
    this.obsSettings = {
      overlayConfig: structuredClone(this.masterConfig.overlayConfig),
      sceneConfig: structuredClone(this.masterConfig.sceneConfig),
      voiceConfig: structuredClone(this.masterConfig.voiceConfig),
      sectLeaderConfig: structuredClone(this.masterConfig.sectLeader),
      stayDurationConfig: structuredClone(this.masterConfig.stayDurationConfig),
      updatedAt: this.masterConfig.updatedAt,
    };
    this.saveOBSToDisk(this.obsSettings);
    return this.getMasterConfig();
  }
}

export function isAuthorizedAdminRequest(req: Request): boolean {
  const configuredToken = (process.env.ADMIN_ACCESS_TOKEN || '').trim();
  if (!configuredToken) {
    return true;
  }
  const headerToken = (
    req.header('x-admin-token') ||
    req.header('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  ).trim();
  return headerToken === configuredToken;
}
