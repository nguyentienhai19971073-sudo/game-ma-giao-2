import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import {
  MaGiaoMasterConfig,
  OBSSyncSettings,
  OverlayConfig,
  SceneConfig,
  VoiceSystemConfig,
  SectLeaderConfig,
} from '../src/types/magiao';
import {
  createDefaultMasterConfig,
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_SCENE_CONFIG,
  DEFAULT_VOICE_CONFIG,
  DEFAULT_SECT_LEADER_CONFIG,
} from '../src/data/sectDefaults';
import { DEFAULT_SECT_DIALOGUE_BANK } from '../src/data/sectDialogueBank';

export function buildDefaultMasterConfig(): MaGiaoMasterConfig {
  return createDefaultMasterConfig(DEFAULT_SECT_DIALOGUE_BANK);
}

export function buildDefaultOBSSyncSettings(): OBSSyncSettings {
  return {
    overlayConfig: structuredClone(DEFAULT_OVERLAY_CONFIG),
    sceneConfig: structuredClone(DEFAULT_SCENE_CONFIG),
    voiceConfig: structuredClone(DEFAULT_VOICE_CONFIG),
    sectLeaderConfig: structuredClone(DEFAULT_SECT_LEADER_CONFIG),
    updatedAt: Date.now(),
  };
}

export function normalizeIncomingMasterConfig(
  raw: unknown,
  current?: MaGiaoMasterConfig
): MaGiaoMasterConfig {
  const base = current ? structuredClone(current) : buildDefaultMasterConfig();
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
    base.ranks = obj.ranks;
  }
  if (Array.isArray(obj.giftMappings) && obj.giftMappings.length > 0) {
    base.giftMappings = obj.giftMappings;
  }
  if (Array.isArray(obj.commentCommands) && obj.commentCommands.length > 0) {
    base.commentCommands = obj.commentCommands;
  }
  if (obj.commentSettings && typeof obj.commentSettings === 'object') {
    base.commentSettings = { ...base.commentSettings, ...obj.commentSettings };
  }
  if (Array.isArray(obj.dialogues) && obj.dialogues.length > 0) {
    base.dialogues = obj.dialogues;
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
    base.overlayConfig = { ...base.overlayConfig, ...obj.overlayConfig };
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

  if (obj.overlayConfig && typeof obj.overlayConfig === 'object') {
    base.overlayConfig = {
      ...base.overlayConfig,
      ...(obj.overlayConfig as Partial<OverlayConfig>),
    };
  }
  if (obj.sceneConfig && typeof obj.sceneConfig === 'object') {
    base.sceneConfig = {
      ...base.sceneConfig,
      ...(obj.sceneConfig as Partial<SceneConfig>),
    };
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
      updatedAt: this.masterConfig.updatedAt,
    };
    this.saveOBSToDisk(this.obsSettings);
    return this.getMasterConfig();
  }

  public resetMasterConfig(): MaGiaoMasterConfig {
    this.masterConfig = buildDefaultMasterConfig();
    this.saveMasterToDisk(this.masterConfig);
    this.obsSettings = {
      overlayConfig: structuredClone(this.masterConfig.overlayConfig),
      sceneConfig: structuredClone(this.masterConfig.sceneConfig),
      voiceConfig: structuredClone(this.masterConfig.voiceConfig),
      sectLeaderConfig: structuredClone(this.masterConfig.sectLeader),
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
