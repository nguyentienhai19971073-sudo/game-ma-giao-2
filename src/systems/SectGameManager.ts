import {
  ActiveSceneType,
  AccumulationMode,
  CommentCommandConfig,
  DiagnosticLogEntry,
  DialogueCategory,
  DiscipleFSMState,
  DiscipleStayDurationConfig,
  DiscipleStayStatus,
  ElementType,
  GiftHistoryEntry,
  HallZoneId,
  MaGiaoMasterConfig,
  MiniGameActiveState,
  MiniGameId,
  PlayerAnimationState,
  PlayerLedgerRecord,
  PromotionAnnouncement,
  RankAccumulationConfig,
  RankTierConfig,
  RankTierId,
  SectDisciple,
  SectLeaderAnimationId,
  SectLeaderRuntimeState,
  TikTokLiveEvent,
} from '../types/magiao';
import {
  createDefaultMasterConfig,
  DEFAULT_RANK_ACCUMULATION_CONFIG,
  DEFAULT_RANKS,
  DEFAULT_STAY_DURATION_CONFIG,
  sanitizeStayDurationConfig,
} from '../data/sectDefaults';
import {
  DEFAULT_SECT_DIALOGUE_BANK,
  interpolateDialogueTemplate,
  selectNonRepeatingDialogue,
} from '../data/sectDialogueBank';
import { formatCompactPlayerName, sanitizeCommentForBubble } from '../utils/compactPlayerName';
import { giftRegistry } from './GiftRegistry';
import { voiceManager } from './VoiceManager';
import { soundSynthesizer } from './SoundSynthesizer';

export interface GameStateSnapshot {
  config: MaGiaoMasterConfig;
  activeScene: ActiveSceneType;
  isTransitioningScene: boolean;
  nextSceneCountdownSec: number;
  sectLeader: SectLeaderRuntimeState;
  disciples: SectDisciple[];
  waitingQueue: SectDisciple[];
  sweepingDisciples: SectDisciple[];
  elderLeaderboard: SectDisciple[];
  promotions: PromotionAnnouncement[];
  giftHistory: GiftHistoryEntry[];
  playerLedger: PlayerLedgerRecord[];
  miniGame: MiniGameActiveState;
  logs: DiagnosticLogEntry[];
  fps: number;
}

interface PersistentLedgerStorePayload {
  records: Record<string, PlayerLedgerRecord>;
  giftHistory: GiftHistoryEntry[];
  promotions: PromotionAnnouncement[];
  processedEventIds: string[];
  streakTotals: Record<string, number>;
  updatedAt: number;
}

const PERSISTENT_LEDGER_STORAGE_KEY = 'magiao_persistent_ledger_v1';
let memoryPersistentLedger: PersistentLedgerStorePayload | null = null;

type GameStateListener = (snapshot: GameStateSnapshot) => void;

const ELEMENT_COUNTER_MAP: Record<ElementType, ElementType> = {
  // LỬA thắng BĂNG -> Khi Giáo Chủ tung BĂNG, đệ tử dùng LỬA khắc chế
  BANG: 'LUA',
  // BĂNG thắng GIÓ -> Khi Giáo Chủ tung GIÓ, đệ tử dùng BĂNG khắc chế
  GIO: 'BANG',
  // GIÓ thắng LỬA -> Khi Giáo Chủ tung LỬA, đệ tử dùng GIÓ khắc chế
  LUA: 'GIO',
};

export class SectGameManager {
  private config: MaGiaoMasterConfig;
  private activeScene: ActiveSceneType = 'main_hall';
  private isTransitioningScene = false;
  private nextSceneSwitchAt = 0;

  private sectLeader: SectLeaderRuntimeState;
  private disciples = new Map<string, SectDisciple>();
  private waitingQueue: SectDisciple[] = [];
  private promotions: PromotionAnnouncement[] = [];
  private giftHistory: GiftHistoryEntry[] = [];
  private playerLedger = new Map<string, PlayerLedgerRecord>();
  private processedGiftEventIds = new Set<string>();
  private processedStreakTotals = new Map<string, number>();
  private logs: DiagnosticLogEntry[] = [];
  private recentDialogueIds: string[] = [];

  private miniGame: MiniGameActiveState = {
    isActive: false,
    gameId: null,
    title: '',
    phase: 'intro',
    currentRound: 1,
    totalRounds: 3,
    remainingSec: 0,
    startedAt: 0,
    participantUserIds: [],
    completedUserIds: [],
    failedUserIds: [],
    completionPct: 0,
    winThresholdPct: 60,
    sweepingPenaltyNames: [],
  };

  private listeners = new Set<GameStateListener>();
  private tickInterval: number | null = null;
  private lastTickAt = Date.now();
  private nextLeaderIdleAt = Date.now() + 18000;
  private fps = 60;
  private frameCounter = 0;
  private lastFpsMeasureAt = Date.now();

  constructor(initialConfig?: MaGiaoMasterConfig) {
    this.config = initialConfig
      ? structuredClone(initialConfig)
      : createDefaultMasterConfig(DEFAULT_SECT_DIALOGUE_BANK);
    if (!this.config.rankAccumulation) {
      this.config.rankAccumulation = structuredClone(DEFAULT_RANK_ACCUMULATION_CONFIG);
    }
    this.config.stayDurationConfig = sanitizeStayDurationConfig(this.config.stayDurationConfig);
    this.config.playerAnimationConfig.idleTimeoutSec =
      this.config.stayDurationConfig.inactivityTimeoutSec;

    this.sectLeader = {
      currentLeaderName: this.config.sectLeader.title,
      formerLeaderName: this.config.sectLeader.formerLeaderTitle,
      hasCustomPlayerLeader: false,
      currentAnimation: 'idle_throne',
      animationStartedAt: Date.now(),
      animationDurationMs: 4000,
      expression: 'arrogant',
      isSpeaking: false,
      mouthOpenness: 0,
      x: this.config.sectLeader.thronePosition.x,
      y: this.config.sectLeader.thronePosition.y,
      targetX: this.config.sectLeader.thronePosition.x,
      targetY: this.config.sectLeader.thronePosition.y,
      direction: 'front',
      personality: this.config.sectLeader.personality,
    };

    if (this.config.rankAccumulation.mode === 'persistent') {
      this.loadPersistentLedgerIfAvailable();
    }

    this.scheduleNextSceneCycle();

    voiceManager.subscribe(vSnap => {
      const nextText = vSnap.currentItem?.text || undefined;
      const changed =
        this.sectLeader.isSpeaking !== vSnap.isSpeaking ||
        Math.abs(this.sectLeader.mouthOpenness - vSnap.mouthOpenness) > 0.04 ||
        this.sectLeader.currentSpeechText !== nextText;

      if (nextText && this.sectLeader.currentSpeechText !== nextText) {
        this.sectLeader.speechStartedAt = Date.now();
      }
      this.sectLeader.isSpeaking = vSnap.isSpeaking;
      this.sectLeader.mouthOpenness = vSnap.mouthOpenness;
      this.sectLeader.currentSpeechText = nextText;

      if (vSnap.currentItem?.animationId && this.sectLeader.currentAnimation !== vSnap.currentItem.animationId) {
        this.triggerSectLeaderAnimation(vSnap.currentItem.animationId);
      }
      if (changed) {
        this.notify();
      }
    });
  }

  public startLoop() {
    if (this.tickInterval !== null || typeof window === 'undefined') return;
    this.lastTickAt = Date.now();
    this.tickInterval = window.setInterval(() => {
      this.tick();
    }, 100); // 10 Hz logic tick (rendering runs at 60 FPS requestAnimationFrame)
  }

  public stopLoop() {
    if (this.tickInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach(fn => fn(snap));
  }

  public addLog(
    type: DiagnosticLogEntry['type'],
    title: string,
    detail: string,
    level: DiagnosticLogEntry['level'] = 'info'
  ) {
    const entry: DiagnosticLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type,
      level,
      title,
      detail,
    };
    this.logs = [entry, ...this.logs].slice(0, 200);
  }

  public updateMasterConfig(next: MaGiaoMasterConfig) {
    const prevMode = this.config.rankAccumulation?.mode || 'session';
    this.config = structuredClone(next);
    if (!this.config.rankAccumulation) {
      this.config.rankAccumulation = structuredClone(DEFAULT_RANK_ACCUMULATION_CONFIG);
    }
    this.config.stayDurationConfig = sanitizeStayDurationConfig(this.config.stayDurationConfig);
    this.config.playerAnimationConfig.idleTimeoutSec =
      this.config.stayDurationConfig.inactivityTimeoutSec;

    this.sectLeader.personality = this.config.sectLeader.personality;
    if (!this.sectLeader.hasCustomPlayerLeader) {
      this.sectLeader.currentLeaderName = this.config.sectLeader.title;
    }
    this.sectLeader.formerLeaderName = this.config.sectLeader.formerLeaderTitle;

    // Synchronize Sect Leader position & reserved zone when thronePosition changes in Admin
    const thronePos = this.config.sectLeader.thronePosition || { x: 50, y: 22.13 };
    if (
      this.sectLeader.currentAnimation !== 'walk_down_steps' &&
      this.sectLeader.currentAnimation !== 'patrol_hall'
    ) {
      this.sectLeader.x = thronePos.x;
      this.sectLeader.y = thronePos.y;
      this.sectLeader.targetX = thronePos.x;
      this.sectLeader.targetY = thronePos.y;
    }
    this.config.sceneConfig.throneReservedZone = {
      xMin: Math.max(10, thronePos.x - 22),
      xMax: Math.min(90, thronePos.x + 22),
      yMin: Math.max(6, thronePos.y - 9),
      yMax: Math.min(48, thronePos.y + 10.5),
      label: 'Vùng Bảo Vệ Ngai Vàng Giáo Chủ',
    };
    this.config.sceneConfig.zones.throne_zone = {
      xMin: Math.max(20, thronePos.x - 10),
      xMax: Math.min(80, thronePos.x + 10),
      yMin: Math.max(10, thronePos.y - 4),
      yMax: Math.min(42, thronePos.y + 5),
      label: 'Ngai Vàng Chính Điện',
    };
    this.config.sceneConfig.zones.co_leader_dais = {
      xMin: Math.max(58, Math.min(82, thronePos.x + 22)),
      xMax: Math.max(74, Math.min(94, thronePos.x + 38)),
      yMin: Math.max(12, thronePos.y),
      yMax: Math.min(44, thronePos.y + 7),
      label: 'Đài Đồng Tôn Giáo Chủ (199 Xu)',
    };

    voiceManager.updateConfig(this.config.voiceConfig);
    soundSynthesizer.setVolumes(
      this.config.voiceConfig.sfxVolume,
      this.config.voiceConfig.ambientVolume,
      this.config.voiceConfig.isMuted
    );

    const now = Date.now();
    const sweepRect = this.config.sceneConfig.zones.sweeping_courtyard;
    // Re-evaluate existing disciples' ranks, positions, and apply stay duration mode
    for (const d of this.disciples.values()) {
      if (this.config.stayDurationConfig.applyMode === 'immediate') {
        d.assignedTimeoutSec = this.config.stayDurationConfig.inactivityTimeoutSec;
      }
      this.computeDiscipleStayMetrics(d, now);

      if (d.isSectLeader) {
        d.x = thronePos.x;
        d.y = thronePos.y;
        d.targetX = thronePos.x;
        d.targetY = thronePos.y;
      } else {
        const expected = this.computeRankForCoins(d.totalCoins);
        if (expected.id !== d.rankId) {
          this.applyRankToDisciple(d, expected.id);
        } else {
          const rankDef = this.config.ranks.find(r => r.id === d.rankId);
          if (rankDef) {
            d.rankName = rankDef.name;
            d.scale = rankDef.scaleMultiplier;
            d.auraColor = rankDef.auraColor;
            d.primaryColor = rankDef.primaryColor;
            d.secondaryColor = rankDef.secondaryColor;
          }
        }
        // Keep sweeping disciples synchronized with the Sweeping Courtyard coordinates
        if (d.isSweepingPenalty && sweepRect) {
          const coords = this.computeZoneCoordinates('sweeping_courtyard');
          d.targetX = coords.x;
          d.targetY = coords.y;
          if (
            d.x < sweepRect.xMin ||
            d.x > sweepRect.xMax ||
            d.y < sweepRect.yMin ||
            d.y > sweepRect.yMax
          ) {
            d.x = coords.x;
            d.y = coords.y;
          }
        } else if (d.isCoLeader) {
          const daisCoords = this.computeZoneCoordinates('co_leader_dais');
          d.targetX = daisCoords.x;
          d.targetY = daisCoords.y;
        } else if (this.isInsideThroneReservedZone(d.x, d.y, 0.8)) {
          const clamped = this.clampToWalkableHall(d.x, d.y, false);
          d.x = clamped.x;
          d.y = clamped.y;
          d.targetX = clamped.x;
          d.targetY = clamped.y;
        }
        this.syncDiscipleToLedger(d);
      }
    }

    for (const w of this.waitingQueue) {
      if (this.config.stayDurationConfig.applyMode === 'immediate') {
        w.assignedTimeoutSec = this.config.stayDurationConfig.inactivityTimeoutSec;
      }
      this.computeDiscipleStayMetrics(w, now);
    }

    if (this.config.rankAccumulation.mode === 'persistent') {
      if (prevMode !== 'persistent' && this.playerLedger.size === 0) {
        this.loadPersistentLedgerIfAvailable();
      }
      this.savePersistentLedger();
    }

    this.notify();
  }

  public getConfig(): MaGiaoMasterConfig {
    return structuredClone(this.config);
  }

  private scheduleNextSceneCycle() {
    const [minSec, maxSec] = this.config.sceneTransition.cycleIntervalRangeSec || [150, 180];
    const span = Math.max(10, maxSec - minSec);
    const delaySec = minSec + Math.floor(Math.random() * (span + 1));
    this.nextSceneSwitchAt = Date.now() + delaySec * 1000;
  }

  // ==========================================================================
  // SECT LEADER ANIMATION & DIALOGUE CONTROLLER (35 ANIMATIONS + 400+ LINES)
  // ==========================================================================
  public triggerSectLeaderAnimation(animId: SectLeaderAnimationId): boolean {
    const animDef = this.config.sectLeaderAnimations.find(a => a.id === animId);
    const durationMs = animDef ? animDef.durationMs : 3500;

    this.sectLeader.currentAnimation = animId;
    this.sectLeader.animationStartedAt = Date.now();
    this.sectLeader.animationDurationMs = durationMs;
    this.sectLeader.expression = animDef?.expression || 'arrogant';

    const thronePos = this.config.sectLeader.thronePosition || { x: 50, y: 22.13 };
    if (animId === 'walk_down_steps' || animId === 'patrol_hall') {
      this.sectLeader.targetX = thronePos.x + (Math.random() * 14 - 7);
      this.sectLeader.targetY = Math.min(42, thronePos.y + 8.5);
    } else if (animId === 'return_to_throne' || animId === 'sit_throne_pose' || animId === 'idle_throne') {
      this.sectLeader.targetX = thronePos.x;
      this.sectLeader.targetY = thronePos.y;
    }

    this.addLog('leader', `Giáo Chủ thi triển: ${animDef?.name || animId}`, `Nhóm ${animDef?.group || 'A'} (${durationMs}ms)`);
    this.notify();
    return true;
  }

  public triggerSectLeaderSpeech(
    category: DialogueCategory,
    context: {
      playerName?: string;
      rankName?: string;
      giftName?: string;
      leaderName?: string;
      gameName?: string;
    } = {},
    priority: 'throne_transfer' | 'high_gift' | 'minigame' | 'promotion' | 'welcome' | 'boast_idle' = 'boast_idle',
    preferredAnimation?: SectLeaderAnimationId
  ): string {
    const bank =
      Array.isArray(this.config.dialogues) && this.config.dialogues.length > 0
        ? this.config.dialogues
        : DEFAULT_SECT_DIALOGUE_BANK;

    const { line, updatedRecentIds } = selectNonRepeatingDialogue(
      bank,
      category,
      this.recentDialogueIds,
      this.config.sectLeader.personality
    );
    this.recentDialogueIds = updatedRecentIds;

    const spokenText = interpolateDialogueTemplate(line.text, {
      playerName: context.playerName,
      rankName: context.rankName,
      giftName: context.giftName,
      leaderName: context.leaderName || this.sectLeader.currentLeaderName,
      gameName: context.gameName,
    });

    const animToPlay =
      preferredAnimation ||
      line.linkedAnimation ||
      this.pickDefaultAnimationForCategory(category);

    this.sectLeader.currentSpeechText = spokenText;
    this.sectLeader.speechStartedAt = Date.now();
    this.triggerSectLeaderAnimation(animToPlay);

    voiceManager.enqueue({
      text: spokenText,
      priority,
      category,
      animationId: animToPlay,
      interruptIfHigher: priority === 'throne_transfer',
    });

    this.addLog('tts', `Giáo Chủ phát ngôn [${category}]`, spokenText);
    return spokenText;
  }

  private pickDefaultAnimationForCategory(category: DialogueCategory): SectLeaderAnimationId {
    switch (category) {
      case 'silly_evil_boast': {
        const boasts: SectLeaderAnimationId[] = [
          'evil_laugh',
          'drink_tea',
          'fan_self',
          'stroke_beard',
          'smug_nod',
          'comical_rage',
          'read_scroll',
        ];
        return boasts[Math.floor(Math.random() * boasts.length)];
      }
      case 'welcome_new':
        return 'point_at_player';
      case 'promotion':
        return 'promote_disciple';
      case 'disciple_interact':
        return 'praise_disciple';
      case 'minigame_host':
        return 'start_minigame';
      case 'minigame_win':
        return 'victory_fanfare';
      case 'minigame_lose':
        return 'punish_sweep';
      case 'elder_coleader':
        return 'salute_coleader';
      case 'quiet_hall':
        return 'sleepy_yawn';
      case 'throne_transfer':
        return 'throne_handover';
    }
  }

  // ==========================================================================
  // FREE ROAM SPATIAL DISTRIBUTION & OBSTACLE AVOIDANCE ENGINE
  // ==========================================================================
  private getFreeRoamBounds() {
    const b = this.config.sceneConfig.freeRoamBounds || {
      xMin: 10,
      xMax: 90,
      yMin: 31,
      yMax: 90,
    };
    return {
      xMin: Math.max(6, Math.min(40, b.xMin)),
      xMax: Math.max(60, Math.min(94, b.xMax)),
      yMin: Math.max(26, Math.min(55, b.yMin)),
      yMax: Math.max(65, Math.min(93, b.yMax)),
    };
  }

  private getThroneReservedZone() {
    return (
      this.config.sceneConfig.throneReservedZone || {
        xMin: 28,
        xMax: 72,
        yMin: 10,
        yMax: 29.5,
      }
    );
  }

  public isInsideThroneReservedZone(x: number, y: number, pad = 1.2): boolean {
    const t = this.getThroneReservedZone();
    return (
      x >= t.xMin - pad &&
      x <= t.xMax + pad &&
      y >= t.yMin - pad &&
      y <= t.yMax + pad
    );
  }

  public clampToWalkableHall(
    x: number,
    y: number,
    allowSpecialZone = false
  ): { x: number; y: number } {
    if (allowSpecialZone) {
      return {
        x: Math.max(6, Math.min(94, x)),
        y: Math.max(14, Math.min(95, y)),
      };
    }

    const bounds = this.getFreeRoamBounds();
    let cx = Math.max(bounds.xMin, Math.min(bounds.xMax, x));
    let cy = Math.max(bounds.yMin, Math.min(bounds.yMax, y));

    const throne = this.getThroneReservedZone();
    if (this.isInsideThroneReservedZone(cx, cy, 1.0)) {
      // Push smoothly below the Throne steps or to the side
      const distBottom = Math.abs(throne.yMax + 1.5 - cy);
      const distLeft = Math.abs(cx - (throne.xMin - 1.5));
      const distRight = Math.abs(throne.xMax + 1.5 - cx);
      if (distBottom <= distLeft && distBottom <= distRight) {
        cy = Math.max(bounds.yMin, throne.yMax + 1.5);
      } else if (distLeft < distRight) {
        cx = Math.max(bounds.xMin, throne.xMin - 1.5);
      } else {
        cx = Math.min(bounds.xMax, throne.xMax + 1.5);
      }
    }

    return { x: cx, y: cy };
  }

  private determineHallZoneFromCoords(x: number, y: number): HallZoneId {
    if (x >= 32 && x <= 68) {
      return 'central_aisle';
    }
    if (x < 32) {
      return y > 74 ? 'meditation_area' : 'left_disciple_wing';
    }
    return y > 74 ? 'martial_practice_area' : 'right_disciple_wing';
  }

  /**
   * Stratified Best-Candidate Poisson-Disk Sampler across the entire Đại Điện floor.
   * Ensures central aisle (`LỐI ĐI CHÍNH GIỮA`, x: 32..68) is actively populated while
   * spreading 1..80 disciples across all 16 floor sectors without clustering or overlapping.
   */
  public sampleFreeRoamPosition(options?: {
    excludeUserId?: string;
    mode?: 'any' | 'central_aisle' | 'greet_leader' | 'cross_aisle';
    fromX?: number;
  }): { zone: HallZoneId; x: number; y: number } {
    const bounds = this.getFreeRoamBounds();
    const mode = options?.mode || 'any';
    const existing = Array.from(this.disciples.values()).filter(
      d => d.userId !== options?.excludeUserId && !d.isSweepingPenalty && !d.isSectLeader
    );

    // Build 4x4 sector occupancy grid across FreeRoamBounds so under-populated sectors get a bonus
    const gridCols = 4;
    const gridRows = 4;
    const sectorCounts = new Array(gridCols * gridRows).fill(0);
    const width = Math.max(10, bounds.xMax - bounds.xMin);
    const height = Math.max(10, bounds.yMax - bounds.yMin);

    for (const other of existing) {
      const refX = (other.x + other.targetX) * 0.5;
      const refY = (other.y + other.targetY) * 0.5;
      const col = Math.max(0, Math.min(gridCols - 1, Math.floor(((refX - bounds.xMin) / width) * gridCols)));
      const row = Math.max(0, Math.min(gridRows - 1, Math.floor(((refY - bounds.yMin) / height) * gridRows)));
      sectorCounts[row * gridCols + col] += 1;
    }

    let bestX = 50;
    let bestY = 58;
    let bestScore = -9999;

    const candidateCount = 28;
    for (let i = 0; i < candidateCount; i++) {
      let cx: number;
      let cy: number;

      if (mode === 'greet_leader') {
        // Upper central aisle in front of the Sect Leader's Throne steps
        cx = 36 + Math.random() * 28; // x: 36..64
        cy = Math.max(bounds.yMin + 0.5, 31.5 + Math.random() * 7.5); // y: 31.5..39
      } else if (mode === 'cross_aisle') {
        const startX = options?.fromX ?? 50;
        if (startX < 46) {
          // Cross from left across central aisle to center-right
          cx = 46 + Math.random() * Math.max(10, bounds.xMax - 48);
        } else if (startX > 54) {
          // Cross from right across central aisle to center-left
          cx = bounds.xMin + 2 + Math.random() * Math.max(10, 54 - bounds.xMin - 2);
        } else {
          cx = bounds.xMin + 4 + Math.random() * (width - 8);
        }
        cy = bounds.yMin + 2 + Math.random() * (height - 5);
      } else if (mode === 'central_aisle' || (mode === 'any' && i < 12)) {
        // Central aisle & middle hall focus (x: 28..72, y: 32..86)
        const cMinX = Math.max(bounds.xMin, 28);
        const cMaxX = Math.min(bounds.xMax, 72);
        cx = cMinX + Math.random() * Math.max(8, cMaxX - cMinX);
        cy = bounds.yMin + 1 + Math.random() * Math.max(8, height - 3);
      } else {
        // Full floor coverage across FreeRoamArea
        cx = bounds.xMin + 1.5 + Math.random() * Math.max(8, width - 3);
        cy = bounds.yMin + 1.5 + Math.random() * Math.max(8, height - 3);
      }

      // Avoid sweeping penalty corner (bottom-left x < 24, y > 82) for normal free roam
      if (cx < 24 && cy > 82) {
        cy = 34 + Math.random() * 44;
      }

      const clamped = this.clampToWalkableHall(cx, cy, false);
      cx = clamped.x;
      cy = clamped.y;

      let minDist = 999;
      for (const other of existing) {
        const dCurr = Math.hypot(other.x - cx, other.y - cy);
        const dTarg = Math.hypot(other.targetX - cx, other.targetY - cy);
        const dMin = Math.min(dCurr, dTarg);
        if (dMin < minDist) {
          minDist = dMin;
        }
      }

      const col = Math.max(0, Math.min(gridCols - 1, Math.floor(((cx - bounds.xMin) / width) * gridCols)));
      const row = Math.max(0, Math.min(gridRows - 1, Math.floor(((cy - bounds.yMin) / height) * gridRows)));
      const sectorOccupancy = sectorCounts[row * gridCols + col];

      // Favor central aisle slightly so center hall is always vibrant
      const isCenterAisle = cx >= 32 && cx <= 68 && cy >= 33 && cy <= 85;
      const centerBonus = isCenterAisle ? 1.35 : 0;

      const score = Math.min(minDist, 22) - sectorOccupancy * 1.45 + centerBonus;
      if (score > bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = cy;
      }
    }

    return {
      zone: this.determineHallZoneFromCoords(bestX, bestY),
      x: Number(bestX.toFixed(2)),
      y: Number(bestY.toFixed(2)),
    };
  }

  /**
   * Assigns an independent timed behavior to a disciple in Main Hall Free Roam.
   */
  private assignNextAutonomousAction(
    disciple: SectDisciple,
    now: number,
    preferMovement = false
  ) {
    if (
      disciple.isSweepingPenalty ||
      disciple.isSectLeader ||
      disciple.fsmState === 'departing_gate'
    ) {
      return;
    }

    const cfg = this.config.playerAnimationConfig;
    const [minIntervalSec, maxIntervalSec] = cfg.decisionIntervalRangeSec || [3, 8];
    const randomIntervalMs =
      (minIntervalSec + Math.random() * Math.max(1, maxIntervalSec - minIntervalSec)) * 1000;

    // Co-Leader (199 xu) mostly presides on the Co-Leader Dais or strolls near the upper hall
    if (disciple.isCoLeader) {
      const dais = this.config.sceneConfig.zones.co_leader_dais;
      disciple.zone = 'co_leader_dais';
      disciple.targetX = (dais.xMin + dais.xMax) / 2 + (Math.random() * 4 - 2);
      disciple.targetY = (dais.yMin + dais.yMax) / 2 + (Math.random() * 3 - 1.5);
      disciple.fsmState = 'idle_hall';
      disciple.animation = Math.random() < 0.35 ? 'clap' : 'idle';
      disciple.direction = 'front';
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = randomIntervalMs;
      disciple.nextDecisionAt = now + randomIntervalMs;
      return;
    }

    // If disciple was sitting in meditation, smoothly play `stand_up` before moving on
    if (disciple.animation === 'meditate' && disciple.meditationPhase === 'seated') {
      disciple.animation = 'stand_up';
      disciple.meditationPhase = 'standing_up';
      disciple.fsmState = 'idle_hall';
      disciple.targetX = disciple.x;
      disciple.targetY = disciple.y;
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = 1100;
      disciple.nextDecisionAt = now + 1100;
      return;
    }
    disciple.meditationPhase = 'none';

    const strollW = Math.max(5, cfg.strollWeight ?? 34);
    const kungfuW = Math.max(5, cfg.kungfuWeight ?? 28);
    const meditateW = Math.max(5, cfg.meditateWeight ?? 16);
    const greetW = Math.max(2, cfg.greetLeaderWeight ?? 10);
    const socialW = Math.max(2, cfg.socialWeight ?? 12);

    const totalW = strollW + kungfuW + meditateW + greetW + socialW;
    let roll = Math.random() * totalW;

    if (preferMovement) {
      // Bias strongly toward strolling / crossing the aisle / greeting leader
      roll = Math.random() * (strollW + greetW);
    }

    if (roll < strollW) {
      // 1. Stroll around the hall or cross the central aisle
      const crossAisle = Math.random() < 0.45;
      const sample = this.sampleFreeRoamPosition({
        excludeUserId: disciple.userId,
        mode: crossAisle ? 'cross_aisle' : Math.random() < 0.55 ? 'central_aisle' : 'any',
        fromX: disciple.x,
      });
      disciple.zone = sample.zone;
      disciple.targetX = sample.x;
      disciple.targetY = sample.y;
      disciple.fsmState = crossAisle ? 'free_roam_cross_aisle' : 'free_roam_stroll';
      disciple.animation = Math.random() < 0.22 ? 'run' : 'walk';
      const dur = 3500 + Math.random() * 4500;
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = dur;
      disciple.nextDecisionAt = now + dur;
      return;
    }

    roll -= strollW;
    if (roll < greetW) {
      // 2. Walk up the central aisle toward the Sect Leader to bow, or if already near, walk back to mid-hall
      if (disciple.y > 39) {
        const greetPos = this.sampleFreeRoamPosition({
          excludeUserId: disciple.userId,
          mode: 'greet_leader',
        });
        disciple.zone = 'central_aisle';
        disciple.targetX = greetPos.x;
        disciple.targetY = greetPos.y;
        disciple.fsmState = 'bow_sect_leader';
        disciple.animation = 'walk';
        const dur = 3800 + Math.random() * 2500;
        disciple.actionStartedAt = now;
        disciple.actionDurationMs = dur;
        disciple.nextDecisionAt = now + dur;
      } else {
        // Already bowed near Throne -> walk back to mid central hall
        const midSample = this.sampleFreeRoamPosition({
          excludeUserId: disciple.userId,
          mode: 'central_aisle',
        });
        disciple.zone = midSample.zone;
        disciple.targetX = midSample.x;
        disciple.targetY = Math.max(46, midSample.y);
        disciple.fsmState = 'free_roam_stroll';
        disciple.animation = 'walk';
        const dur = 3500 + Math.random() * 3000;
        disciple.actionStartedAt = now;
        disciple.actionDurationMs = dur;
        disciple.nextDecisionAt = now + dur;
      }
      return;
    }

    roll -= greetW;
    if (roll < kungfuW) {
      // 3. Practice martial arts or jump warmup right at current floor position
      disciple.targetX = disciple.x;
      disciple.targetY = disciple.y;
      const moveRoll = Math.random();
      if (moveRoll < 0.32) {
        disciple.animation = 'combo_kungfu';
        disciple.fsmState = 'free_roam_kungfu';
      } else if (moveRoll < 0.58) {
        disciple.animation = 'punch';
        disciple.fsmState = 'free_roam_kungfu';
      } else if (moveRoll < 0.82) {
        disciple.animation = 'kick';
        disciple.fsmState = 'free_roam_kungfu';
      } else {
        disciple.animation = 'jump';
        disciple.fsmState = 'free_roam_jump';
      }
      const dur = 3200 + Math.random() * 3200;
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = dur;
      disciple.nextDecisionAt = now + dur;
      return;
    }

    roll -= kungfuW;
    if (roll < meditateW) {
      // 4. Sit down in lotus meditation at current position
      disciple.targetX = disciple.x;
      disciple.targetY = disciple.y;
      disciple.fsmState = 'free_roam_meditate';
      disciple.animation = 'meditate';
      disciple.meditationPhase = 'sitting_down';
      disciple.direction = 'front';
      const dur = 5500 + Math.random() * 4500;
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = dur;
      disciple.nextDecisionAt = now + dur;
      return;
    }

    // 5. Socialize / Spectate another practicing disciple / Stand & rest
    const practitioners = Array.from(this.disciples.values()).filter(
      other =>
        other.userId !== disciple.userId &&
        !other.isSweepingPenalty &&
        (other.animation === 'combo_kungfu' ||
          other.animation === 'punch' ||
          other.animation === 'kick' ||
          other.animation === 'jump')
    );

    if (practitioners.length > 0 && Math.random() < 0.55) {
      const target = practitioners[Math.floor(Math.random() * practitioners.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = (cfg.minSeparationDist || 5.2) + 1.5;
      const watchPos = this.clampToWalkableHall(
        target.x + Math.cos(angle) * dist,
        target.y + Math.sin(angle) * dist,
        false
      );
      disciple.spectateTargetId = target.userId;
      disciple.targetX = watchPos.x;
      disciple.targetY = watchPos.y;
      disciple.fsmState = 'free_roam_social';
      disciple.animation = Math.hypot(watchPos.x - disciple.x, watchPos.y - disciple.y) > 2.5 ? 'walk' : 'clap';
      const dur = 3500 + Math.random() * 3000;
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = dur;
      disciple.nextDecisionAt = now + dur;
    } else {
      // Stand & rest or clap in place
      disciple.targetX = disciple.x;
      disciple.targetY = disciple.y;
      disciple.fsmState = 'idle_hall';
      disciple.animation = Math.random() < 0.35 ? 'clap' : 'idle';
      disciple.direction = Math.random() < 0.65 ? 'rear' : 'front';
      const dur = 2400 + Math.random() * 2800;
      disciple.actionStartedAt = now;
      disciple.actionDurationMs = dur;
      disciple.nextDecisionAt = now + dur;
    }
  }

  // ==========================================================================
  // PLAYER SPAWN, DEDUPLICATION, 80-CAP, & COMMENT COMMANDS
  // ==========================================================================
  public handleIncomingEvent(event: TikTokLiveEvent) {
    if (event.type === 'comment') {
      this.handleCommentEvent(event);
    } else if (event.type === 'gift') {
      this.handleGiftEvent(event);
    } else if (event.type === 'like') {
      this.handleLikeEvent(event);
    }
  }

  /**
   * Refreshes a disciple's inactivity countdown ONLY on valid user interaction
   * (valid comment or valid TikTok gift). Also cancels gate departure if the user
   * interacts while walking out.
   */
  private refreshDiscipleInteraction(disciple: SectDisciple, now = Date.now()) {
    const timeoutSec =
      this.config.stayDurationConfig?.inactivityTimeoutSec ||
      DEFAULT_STAY_DURATION_CONFIG.inactivityTimeoutSec;
    disciple.lastActiveAt = now;
    disciple.lastInteractionAt = now;
    disciple.assignedTimeoutSec = timeoutSec;
    disciple.extraExtendedSec = 0;
    disciple.stayStatus = 'active';
    disciple.remainingStaySec = timeoutSec;

    if (disciple.fsmState === 'departing_gate') {
      disciple.departStartedAt = undefined;
      disciple.departDurationMs = undefined;
      this.assignHallSlotAndWalkIn(disciple);
      this.addLog(
        'comment',
        `${disciple.displayName} tương tác kịp thời và quay lại Đại Điện!`,
        `Đã làm mới bộ đếm thời gian ở lại (${timeoutSec}s).`
      );
    }
  }

  public handleCommentEvent(event: TikTokLiveEvent): {
    disciple: SectDisciple | null;
    isNewSpawn: boolean;
    matchedCommand: CommentCommandConfig | null;
    releasedFromSweep: boolean;
  } {
    const userId = String(event.userId || event.uniqueId || '').trim();
    if (!userId) {
      return { disciple: null, isNewSpawn: false, matchedCommand: null, releasedFromSweep: false };
    }

    const rawComment = String(event.comment || '').trim();
    const bubbleText = sanitizeCommentForBubble(
      rawComment,
      this.config.commentSettings.maxBubbleChars || 64
    );

    let disciple = this.disciples.get(userId) || this.waitingQueue.find(d => d.userId === userId) || null;
    let isNewSpawn = false;
    let releasedFromSweep = false;

    if (!disciple) {
      // Spawn new disciple (or restore returning disciple from ledger) at Gate
      const hadSavedLedger = this.playerLedger.has(userId);
      disciple = this.createNewDisciple(event);
      isNewSpawn = true;

      const maxCap = Math.max(1, Math.min(80, this.config.sceneConfig.maxConcurrentPlayers || 80));
      if (this.disciples.size < maxCap) {
        this.disciples.set(userId, disciple);
        this.assignHallSlotAndWalkIn(disciple);
        this.syncDiscipleToLedger(disciple);
        this.addLog(
          'comment',
          hadSavedLedger
            ? `${disciple.displayName} tái xuất Đại Điện [${disciple.rankName}]`
            : `Tân đệ tử nhập môn: ${disciple.displayName}`,
          hadSavedLedger
            ? `Khôi phục ${disciple.totalCoins} xu & cấp ${disciple.rankName}, đi từ Cổng vào Đại Điện: "${bubbleText || 'Chào Giáo Chủ'}"`
            : `Bình luận đầu tiên: "${bubbleText || 'Chào Giáo Chủ'}"`
        );

        if (this.disciples.size <= 15 || Math.random() < 0.35) {
          this.triggerSectLeaderSpeech(
            'welcome_new',
            { playerName: disciple.displayName, rankName: disciple.rankName },
            'welcome',
            'point_at_player'
          );
        }
      } else {
        // Put in overflow waiting queue
        this.waitingQueue.push(disciple);
        this.syncDiscipleToLedger(disciple);
        this.addLog(
          'comment',
          `Hàng chờ Đại Điện (${this.waitingQueue.length}): ${disciple.displayName}`,
          `Sảnh đã đủ ${maxCap} đệ tử hiển thị.`
        );
      }
    } else {
      // Existing disciple: update name/avatar if changed, never duplicate!
      if (event.nickname && event.nickname.trim()) {
        disciple.displayName = event.nickname.trim();
        disciple.compactName = formatCompactPlayerName(disciple.displayName, 5);
      }
      if (event.avatarUrl) {
        disciple.avatarUrl = event.avatarUrl;
      }
      disciple.commentCount += 1;
      this.refreshDiscipleInteraction(disciple, Date.now());
      this.syncDiscipleToLedger(disciple);

      // Check if disciple was in Sweeping Courtyard penalty -> immediately restore to Main Hall on ANY comment!
      if (disciple.isSweepingPenalty) {
        disciple.isSweepingPenalty = false;
        disciple.fsmState = 'return_from_sweep';
        disciple.animation = 'celebrate';
        const slot = this.sampleFreeRoamPosition({ excludeUserId: disciple.userId });
        disciple.zone = slot.zone;
        disciple.targetX = slot.x;
        disciple.targetY = slot.y;
        disciple.actionStartedAt = Date.now();
        disciple.actionDurationMs = 3500;
        disciple.nextDecisionAt = Date.now() + 3500;
        releasedFromSweep = true;
        this.addLog(
          'minigame',
          `${disciple.displayName} hoàn thành quét sân!`,
          `Đã bình luận trở lại và quay về Đại Điện ngay lập tức.`
        );
      }
    }

    // Attach comment bubble above head
    if (bubbleText && this.config.commentSettings.showCommentBubble) {
      disciple.lastComment = bubbleText;
      disciple.commentBubbleExpiresAt =
        Date.now() + (this.config.commentSettings.bubbleDurationMs || 5500);
    }

    // Check if Mini-Game is active and process mini-game comment keyword
    if (this.miniGame.isActive && rawComment) {
      this.evaluateMiniGameComment(disciple, rawComment);
    }

    // Check 10 comment commands (đi, chạy, võ, múa, đấm, đá, nhảy, thiền, đứng, chào)
    let matchedCommand: CommentCommandConfig | null = null;
    if (rawComment) {
      matchedCommand = this.matchAndExecuteCommentCommand(
        disciple,
        rawComment,
        isNewSpawn,
        Boolean(event.isDemo)
      );
    }

    this.notify();
    return { disciple, isNewSpawn, matchedCommand, releasedFromSweep };
  }

  private createNewDisciple(event: TikTokLiveEvent): SectDisciple {
    const userId = String(event.userId || event.uniqueId);
    const displayName = String(event.nickname || event.uniqueId || userId).trim();
    // Always preserve and restore player's accumulated coins, rank, and costume from ledger
    const savedLedger = this.playerLedger.get(userId);

    const initialCoins = savedLedger ? savedLedger.totalCoins : 0;
    const initialGiftCount = savedLedger ? savedLedger.giftCount : 0;
    const resolvedRank = savedLedger
      ? this.config.ranks.find(r => r.id === savedLedger.rankId) ||
        this.computeRankForCoins(initialCoins)
      : this.config.ranks[0];

    const gateZone = this.config.sceneConfig.zones.entry_gate;
    const spawnX = (gateZone.xMin + gateZone.xMax) / 2 + (Math.random() * 14 - 7);
    const spawnY = Math.min(93, gateZone.yMax - 2);

    const hash = Array.from(userId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const gender: 'nam' | 'nu' = hash % 2 === 0 ? 'nam' : 'nu';
    const now = Date.now();
    const timeoutSec =
      this.config.stayDurationConfig?.inactivityTimeoutSec ||
      DEFAULT_STAY_DURATION_CONFIG.inactivityTimeoutSec;

    return {
      userId,
      uniqueId: event.uniqueId || userId,
      displayName,
      compactName: formatCompactPlayerName(displayName, 5),
      avatarUrl: event.avatarUrl,
      gender,
      rankId: resolvedRank.id,
      rankName: resolvedRank.name,
      totalCoins: initialCoins,
      commentCount: 1,
      giftCount: initialGiftCount,
      likeCount: 0,
      joinedAt: now,
      lastActiveAt: now,
      lastInteractionAt: now,
      assignedTimeoutSec: timeoutSec,
      extraExtendedSec: 0,
      stayStatus: 'active',
      remainingStaySec: timeoutSec,
      lastCommandAt: 0,
      x: spawnX,
      y: spawnY,
      targetX: 50,
      targetY: 58,
      direction: 'rear',
      fsmState: 'gate_entry',
      animation: 'walk',
      zone: resolvedRank.id === 'dong_ton_giao_chu' ? 'co_leader_dais' : 'entry_gate',
      isSweepingPenalty: false,
      isCoLeader: resolvedRank.id === 'dong_ton_giao_chu',
      isSectLeader: resolvedRank.id === 'tan_giao_chu',
      isDemo: Boolean(event.isDemo),
      scale: resolvedRank.scaleMultiplier || 1.0,
      auraColor: resolvedRank.auraColor,
      primaryColor: resolvedRank.primaryColor,
      secondaryColor: resolvedRank.secondaryColor,
      actionStartedAt: now,
      actionDurationMs: 4000,
      nextDecisionAt: now + 4000,
      stepPhase: Math.random() * Math.PI * 2,
      meditationPhase: 'none',
    };
  }

  private assignHallSlotAndWalkIn(disciple: SectDisciple) {
    const coords = this.sampleFreeRoamPosition({ excludeUserId: disciple.userId });
    const now = Date.now();
    disciple.zone = coords.zone;
    disciple.fsmState = 'walk_in_hall';
    disciple.animation = 'walk';
    disciple.direction = 'rear';
    disciple.targetX = coords.x;
    disciple.targetY = coords.y;
    disciple.actionStartedAt = now;
    disciple.actionDurationMs = 4500;
    disciple.nextDecisionAt = now + 4500;
  }

  private computeZoneCoordinates(zoneId: HallZoneId): { zone: HallZoneId; x: number; y: number } {
    if (
      zoneId === 'central_aisle' ||
      zoneId === 'left_disciple_wing' ||
      zoneId === 'right_disciple_wing' ||
      zoneId === 'martial_practice_area' ||
      zoneId === 'meditation_area'
    ) {
      return this.sampleFreeRoamPosition({
        mode: zoneId === 'central_aisle' ? 'central_aisle' : 'any',
      });
    }

    const rect = this.config.sceneConfig.zones[zoneId] || this.config.sceneConfig.zones.central_aisle;
    const padX = Math.min(2.5, (rect.xMax - rect.xMin) * 0.15);
    const padY = Math.min(2.5, (rect.yMax - rect.yMin) * 0.15);

    let bestX = rect.xMin + padX + Math.random() * Math.max(1, rect.xMax - rect.xMin - padX * 2);
    let bestY = rect.yMin + padY + Math.random() * Math.max(1, rect.yMax - rect.yMin - padY * 2);
    let bestMinDist = -1;

    const existing = Array.from(this.disciples.values());
    for (let attempt = 0; attempt < 12; attempt++) {
      const cx = rect.xMin + padX + Math.random() * Math.max(1, rect.xMax - rect.xMin - padX * 2);
      const cy = rect.yMin + padY + Math.random() * Math.max(1, rect.yMax - rect.yMin - padY * 2);
      let minDist = 999;
      for (const other of existing) {
        const d = Math.hypot(other.targetX - cx, other.targetY - cy);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = cx;
        bestY = cy;
      }
    }

    return { zone: zoneId, x: bestX, y: bestY };
  }

  private matchAndExecuteCommentCommand(
    disciple: SectDisciple,
    rawComment: string,
    isNewSpawn = false,
    bypassCooldown = false
  ): CommentCommandConfig | null {
    const normalized = rawComment.toLowerCase().trim();
    const now = Date.now();

    for (const cmd of this.config.commentCommands) {
      if (!cmd.enabled) continue;
      const matched = cmd.keywords.some(kw => {
        const k = kw.toLowerCase().trim();
        return normalized === k || normalized.startsWith(`${k} `) || normalized.endsWith(` ${k}`);
      });

      if (matched) {
        const cooldownMs = Math.max(500, cmd.cooldownMs || this.config.commentSettings.globalUserCooldownMs || 2500);
        if (!isNewSpawn && !bypassCooldown && now - disciple.lastCommandAt < cooldownMs) {
          return null;
        }

        disciple.lastCommandAt = now;

        // If this was a brand new spawn at the gate, place them inside their sampled FreeRoam hall position
        // so stationary commands (võ, múa, đấm, đá, nhảy, thiền, đứng) happen inside the Đại Điện floor, not at the gate!
        if (isNewSpawn && disciple.y > 88) {
          disciple.x = disciple.targetX;
          disciple.y = disciple.targetY;
        }

        disciple.animation = cmd.animation;
        disciple.meditationPhase = 'none';

        if (cmd.id === 'cmd_di' || cmd.id === 'cmd_chay') {
          disciple.fsmState = cmd.id === 'cmd_chay' ? 'running_command' : 'free_roam_stroll';
          const dest = this.sampleFreeRoamPosition({
            excludeUserId: disciple.userId,
            mode: Math.random() < 0.5 ? 'cross_aisle' : 'any',
            fromX: disciple.x,
          });
          disciple.zone = dest.zone;
          disciple.targetX = dest.x;
          disciple.targetY = dest.y;
          disciple.actionStartedAt = now;
          disciple.actionDurationMs = cmd.id === 'cmd_chay' ? 3600 : 4800;
          disciple.nextDecisionAt = now + disciple.actionDurationMs;
        } else if (cmd.id === 'cmd_thien') {
          disciple.fsmState = 'free_roam_meditate';
          disciple.animation = 'meditate';
          disciple.meditationPhase = 'sitting_down';
          // Find a valid nearby or current open spot in Free Roam (never force all meditators into one corner!)
          const clamped = this.clampToWalkableHall(disciple.x, disciple.y, false);
          disciple.targetX = clamped.x;
          disciple.targetY = clamped.y;
          disciple.direction = 'front';
          disciple.actionStartedAt = now;
          disciple.actionDurationMs = 7000;
          disciple.nextDecisionAt = now + 7000;
        } else if (cmd.id === 'cmd_dung') {
          disciple.fsmState = 'idle_hall';
          disciple.animation = 'stand_up';
          disciple.meditationPhase = 'standing_up';
          disciple.targetX = disciple.x;
          disciple.targetY = disciple.y;
          disciple.direction = 'rear';
          disciple.actionStartedAt = now;
          disciple.actionDurationMs = 1500;
          disciple.nextDecisionAt = now + 1500;
        } else if (cmd.id === 'cmd_chao') {
          const greetSpot = this.sampleFreeRoamPosition({
            excludeUserId: disciple.userId,
            mode: 'greet_leader',
          });
          disciple.zone = 'central_aisle';
          disciple.targetX = greetSpot.x;
          disciple.targetY = greetSpot.y;
          disciple.fsmState = 'bow_sect_leader';
          disciple.animation = 'bow';
          disciple.direction = 'rear';
          disciple.actionStartedAt = now;
          disciple.actionDurationMs = 4500;
          disciple.nextDecisionAt = now + 4500;
        } else if (cmd.id === 'cmd_nhay') {
          disciple.fsmState = 'free_roam_jump';
          disciple.animation = 'jump';
          disciple.targetX = disciple.x;
          disciple.targetY = disciple.y;
          disciple.actionStartedAt = now;
          disciple.actionDurationMs = 3500;
          disciple.nextDecisionAt = now + 3500;
        } else {
          // múa, võ, đấm, đá
          disciple.fsmState = 'practice_kungfu';
          disciple.targetX = disciple.x;
          disciple.targetY = disciple.y;
          disciple.actionStartedAt = now;
          disciple.actionDurationMs = 4500;
          disciple.nextDecisionAt = now + 4500;
          soundSynthesizer.playSwordSlash();
        }

        this.addLog(
          'comment',
          `Lệnh võ học [${cmd.label}]: ${disciple.displayName}`,
          `Thực hiện hoạt ảnh: ${cmd.animation}`
        );
        return cmd;
      }
    }
    return null;
  }

  // ==========================================================================
  // GIFT PROCESSING, CUMULATIVE COIN LEDGER, 9 RANKS, 199 XU CO-LEADER, & THRONE
  // ==========================================================================
  private syncDiscipleToLedger(disciple: SectDisciple) {
    const record: PlayerLedgerRecord = {
      userId: disciple.userId,
      uniqueId: disciple.uniqueId,
      displayName: disciple.displayName,
      totalCoins: disciple.totalCoins,
      giftCount: disciple.giftCount,
      rankId: disciple.rankId,
      rankName: disciple.rankName,
      isCoLeader: disciple.isCoLeader,
      isSectLeader: disciple.isSectLeader,
      isDemo: disciple.isDemo,
      updatedAt: Date.now(),
    };
    this.playerLedger.set(disciple.userId, record);
    if (this.config.rankAccumulation?.mode === 'persistent') {
      this.savePersistentLedger();
    }
  }

  private savePersistentLedger() {
    const recordsObj: Record<string, PlayerLedgerRecord> = {};
    for (const [k, v] of this.playerLedger.entries()) {
      recordsObj[k] = { ...v };
    }
    const streakObj: Record<string, number> = {};
    for (const [k, v] of this.processedStreakTotals.entries()) {
      streakObj[k] = v;
    }

    const payload: PersistentLedgerStorePayload = {
      records: recordsObj,
      giftHistory: this.giftHistory.slice(0, 200),
      promotions: this.promotions.slice(0, 50),
      processedEventIds: Array.from(this.processedGiftEventIds).slice(-2500),
      streakTotals: streakObj,
      updatedAt: Date.now(),
    };

    memoryPersistentLedger = structuredClone(payload);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(PERSISTENT_LEDGER_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage quota errors
      }
    }
  }

  private loadPersistentLedgerIfAvailable() {
    let payload: PersistentLedgerStorePayload | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(PERSISTENT_LEDGER_STORAGE_KEY);
        if (raw) {
          payload = JSON.parse(raw) as PersistentLedgerStorePayload;
        }
      } catch {
        // Ignore parse errors
      }
    }
    if (!payload && memoryPersistentLedger) {
      payload = structuredClone(memoryPersistentLedger);
    }
    if (!payload) return;

    this.playerLedger.clear();
    for (const [uid, rec] of Object.entries(payload.records || {})) {
      this.playerLedger.set(uid, { ...rec });
    }
    this.giftHistory = Array.isArray(payload.giftHistory) ? [...payload.giftHistory] : [];
    this.promotions = Array.isArray(payload.promotions) ? [...payload.promotions] : [];
    this.processedGiftEventIds = new Set(Array.isArray(payload.processedEventIds) ? payload.processedEventIds : []);
    this.processedStreakTotals.clear();
    for (const [sk, val] of Object.entries(payload.streakTotals || {})) {
      this.processedStreakTotals.set(sk, Number(val) || 0);
    }

    // Apply restored ledger records to any already-present disciples in hall
    for (const d of this.disciples.values()) {
      const rec = this.playerLedger.get(d.userId);
      if (rec) {
        d.totalCoins = rec.totalCoins;
        d.giftCount = rec.giftCount;
        this.applyRankToDisciple(d, rec.rankId);
      }
    }
  }

  public handleGiftEvent(event: TikTokLiveEvent): {
    disciple: SectDisciple;
    promoted: boolean;
    throneTransferred: boolean;
    newRankName: string;
    duplicateIgnored?: boolean;
    addedCoins?: number;
  } {
    const userId = String(event.userId || event.uniqueId || `gifter_${Date.now()}`).trim();
    const eventId = String(event.id || '').trim();
    const preventDuplicates = this.config.rankAccumulation?.preventDuplicateEvents !== false;

    // 1. Check duplicate gift event ID before mutating coins
    if (preventDuplicates && eventId && this.processedGiftEventIds.has(eventId)) {
      const existing =
        this.disciples.get(userId) ||
        this.waitingQueue.find(d => d.userId === userId) ||
        this.createNewDisciple(event);
      this.addLog(
        'gift',
        `Bỏ qua sự kiện quà trùng lặp (${eventId})`,
        `Người chơi: ${existing.displayName} — Tổng xu giữ nguyên: ${existing.totalCoins} xu.`
      );
      return {
        disciple: existing,
        promoted: false,
        throneTransferred: false,
        newRankName: existing.rankName,
        duplicateIgnored: true,
        addedCoins: 0,
      };
    }

    // 2. Check gift combo / streak deduplication if groupId or giftType === 1 is provided
    const rawRepeatCount = Math.max(1, Number(event.giftCount || 1));
    let deltaRepeatCount = rawRepeatCount;
    if (preventDuplicates && (event.giftType === 1 || event.groupId)) {
      const streakKey = `${userId}:${event.giftId || 0}:${event.groupId || 'default'}`;
      const prevCount = this.processedStreakTotals.get(streakKey) || 0;
      if (rawRepeatCount <= prevCount) {
        const existing =
          this.disciples.get(userId) ||
          this.waitingQueue.find(d => d.userId === userId) ||
          this.createNewDisciple(event);
        return {
          disciple: existing,
          promoted: false,
          throneTransferred: false,
          newRankName: existing.rankName,
          duplicateIgnored: true,
          addedCoins: 0,
        };
      }
      deltaRepeatCount = rawRepeatCount - prevCount;
      this.processedStreakTotals.set(streakKey, rawRepeatCount);
    }

    if (eventId) {
      this.processedGiftEventIds.add(eventId);
      if (this.processedGiftEventIds.size > 5000) {
        const oldest = this.processedGiftEventIds.values().next().value;
        if (oldest) this.processedGiftEventIds.delete(oldest);
      }
    }

    let disciple = this.disciples.get(userId) || this.waitingQueue.find(d => d.userId === userId);

    if (!disciple) {
      disciple = this.createNewDisciple(event);
      this.disciples.set(userId, disciple);
      this.assignHallSlotAndWalkIn(disciple);
    } else {
      if (event.nickname && event.nickname.trim()) {
        disciple.displayName = event.nickname.trim();
        disciple.compactName = formatCompactPlayerName(disciple.displayName, 5);
      }
      if (!this.disciples.has(userId)) {
        // Promote from waiting queue immediately on gift!
        this.waitingQueue = this.waitingQueue.filter(d => d.userId !== userId);
        this.disciples.set(userId, disciple);
        this.assignHallSlotAndWalkIn(disciple);
      }
    }

    // Clear sweeping penalty if they send a gift too
    if (disciple.isSweepingPenalty) {
      disciple.isSweepingPenalty = false;
    }

    const hasExplicitGiftId = typeof event.giftId === 'number' && event.giftId > 0;
    const { matched, isUnknown } = giftRegistry.resolveGift({
      giftId: event.giftId,
      giftName: event.giftName,
      coinValue: event.coinValue,
    });

    const matchedById =
      hasExplicitGiftId &&
      matched !== null &&
      ((Array.isArray(matched.giftIds) && matched.giftIds.includes(event.giftId!)) ||
        matched.giftId === event.giftId);

    let addedCoins = 0;
    if (typeof event.unitCoinValue === 'number' && event.unitCoinValue > 0) {
      addedCoins = event.unitCoinValue * deltaRepeatCount;
    } else if (matchedById && matched) {
      addedCoins =
        deltaRepeatCount === 1 && typeof event.coinValue === 'number' && event.coinValue > matched.coinValue
          ? event.coinValue
          : matched.coinValue * deltaRepeatCount;
    } else if (typeof event.coinValue === 'number' && event.coinValue > 0) {
      addedCoins =
        event.giftType === 1 || event.groupId
          ? Math.max(1, Math.round(event.coinValue / rawRepeatCount)) * deltaRepeatCount
          : event.coinValue;
    } else if (matched) {
      addedCoins = matched.coinValue * deltaRepeatCount;
    } else {
      addedCoins = deltaRepeatCount;
    }

    const giftDisplayName = matchedById && matched
      ? matched.giftName
      : event.giftName || (matched ? matched.giftName : `Quà ${addedCoins} Xu`);

    if (isUnknown && event.giftId) {
      giftRegistry.reportUnknownGift({
        giftId: event.giftId,
        giftName: event.giftName,
        senderName: disciple.displayName,
        repeatCount: deltaRepeatCount,
        diamondCount: addedCoins,
      });
    }

    const totalCoinsBefore = disciple.totalCoins;
    const prevRankId = disciple.rankId;
    const prevRankName = disciple.rankName;

    const accumulationEnabled = this.config.rankAccumulation?.enabled !== false;
    if (accumulationEnabled) {
      disciple.totalCoins += addedCoins;
    } else {
      disciple.totalCoins = addedCoins;
    }
    disciple.giftCount += deltaRepeatCount;
    this.refreshDiscipleInteraction(disciple, Date.now());

    const throneRankConfig = this.config.ranks.find(r => r.id === 'tan_giao_chu');
    const supremeMinCoins = throneRankConfig?.minCoins || 1000;

    // Supreme Throne Gift is handled separately from normal cumulative ranks (0 -> 199 xu)
    const isSupremeGift =
      Boolean(matchedById && matched?.grantsThrone) ||
      (hasExplicitGiftId &&
        Boolean(throneRankConfig?.supremeGiftIds?.includes(Number(event.giftId)))) ||
      (!hasExplicitGiftId && Boolean(matched?.grantsThrone) && addedCoins >= supremeMinCoins) ||
      addedCoins >= supremeMinCoins;

    let throneTransferred = false;

    if (isSupremeGift) {
      throneTransferred = true;
      this.executeThroneTransfer(disciple, giftDisplayName);
    } else {
      // Evaluate cumulative rank progression (0 -> 1 -> 5 -> 10 -> 20 -> 50 -> 99 -> 199 xu Đồng Tôn Giáo Chủ)
      // When crossing multiple thresholds in a single event, only apply the highest newly reached rank once!
      const coinsToEvaluate = accumulationEnabled ? disciple.totalCoins : addedCoins;
      const explicitRankFromGift = !accumulationEnabled ? matched?.rankGranted : undefined;
      const nextRank = this.computeRankForCoins(coinsToEvaluate, explicitRankFromGift);
      const currentRankOrder = this.getRankOrder(disciple.rankId);
      const nextRankOrder = this.getRankOrder(nextRank.id);

      if (nextRankOrder > currentRankOrder) {
        this.applyRankToDisciple(disciple, nextRank.id);
      }
    }

    // Do not repeat promotion ceremony if player remains at the exact same rank
    const promoted = disciple.rankId !== prevRankId;

    // Record into Gift History & Player Ledger
    const historyEntry: GiftHistoryEntry = {
      id: `gh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      eventId: eventId || `evt_${Date.now()}`,
      timestamp: Date.now(),
      userId: disciple.userId,
      uniqueId: disciple.uniqueId,
      displayName: disciple.displayName,
      giftId: event.giftId,
      giftName: giftDisplayName,
      repeatCount: deltaRepeatCount,
      addedCoins,
      totalCoinsBefore,
      totalCoinsAfter: disciple.totalCoins,
      oldRankId: prevRankId,
      oldRankName: prevRankName,
      newRankId: disciple.rankId,
      newRankName: disciple.rankName,
      promoted,
      isThroneTakeover: throneTransferred,
      isDemo: Boolean(event.isDemo || disciple.isDemo),
    };
    this.giftHistory = [historyEntry, ...this.giftHistory].slice(0, 200);
    this.syncDiscipleToLedger(disciple);

    if (matched?.soundEffect) {
      soundSynthesizer.playBySoundType(matched.soundEffect);
    } else if (promoted) {
      soundSynthesizer.playGong(1.0);
    }

    if (promoted && !throneTransferred) {
      const promo: PromotionAnnouncement = {
        id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        userId: disciple.userId,
        displayName: disciple.displayName,
        oldRankName: prevRankName,
        newRankId: disciple.rankId,
        newRankName: disciple.rankName,
        giftName: giftDisplayName,
        coinValue: disciple.totalCoins,
        isThroneTakeover: false,
        isCoLeader: disciple.rankId === 'dong_ton_giao_chu',
      };
      this.promotions = [promo, ...this.promotions].slice(0, 50);
      if (this.config.rankAccumulation?.mode === 'persistent') {
        this.savePersistentLedger();
      }

      const category: DialogueCategory =
        disciple.rankId === 'dong_ton_giao_chu' || disciple.rankId === 'dai_truong_lao'
          ? 'elder_coleader'
          : 'promotion';

      this.triggerSectLeaderSpeech(
        category,
        {
          playerName: disciple.displayName,
          rankName: disciple.rankName,
          giftName: giftDisplayName,
        },
        disciple.totalCoins >= 50 ? 'high_gift' : 'promotion',
        disciple.rankId === 'dong_ton_giao_chu' ? 'salute_coleader' : 'promote_disciple'
      );
    } else if (!promoted) {
      this.triggerSectLeaderAnimation('gift_small_react');
    }

    this.addLog(
      'gift',
      `${disciple.displayName} tặng ${giftDisplayName} (+${addedCoins} xu)`,
      `Cộng dồn: ${totalCoinsBefore} + ${addedCoins} = ${disciple.totalCoins} xu | Cấp bậc: ${disciple.rankName}${
        promoted ? ` (Thăng cấp từ ${prevRankName})` : ''
      }`
    );

    this.notify();
    return {
      disciple,
      promoted,
      throneTransferred,
      newRankName: disciple.rankName,
      duplicateIgnored: false,
      addedCoins,
    };
  }

  private executeThroneTransfer(newLeader: SectDisciple, giftDisplayName: string) {
    const now = Date.now();
    // Demote any previous player who held tan_giao_chu down to dong_ton_giao_chu
    for (const d of this.disciples.values()) {
      if (d.isSectLeader && d.userId !== newLeader.userId) {
        d.isSectLeader = false;
        this.applyRankToDisciple(d, 'dong_ton_giao_chu');
        this.syncDiscipleToLedger(d);
      }
    }

    const prevLeaderTitle = this.sectLeader.currentLeaderName;
    const prevPlayerRankName = newLeader.rankName || 'Hào Kiệt';
    this.sectLeader.formerLeaderName = `${this.config.sectLeader.formerLeaderTitle} (${prevLeaderTitle})`;
    this.sectLeader.currentLeaderName = `Tân Giáo Chủ ${newLeader.displayName}`;
    this.sectLeader.currentLeaderUserId = newLeader.userId;
    this.sectLeader.hasCustomPlayerLeader = true;

    this.applyRankToDisciple(newLeader, 'tan_giao_chu');
    newLeader.isSectLeader = true;
    newLeader.isCoLeader = false;
    newLeader.zone = 'throne_zone';
    newLeader.targetX = this.config.sectLeader.thronePosition.x;
    newLeader.targetY = this.config.sectLeader.thronePosition.y + 2;
    newLeader.direction = 'front';
    newLeader.animation = 'celebrate';
    newLeader.actionStartedAt = now;
    newLeader.actionDurationMs = 6000;
    newLeader.nextDecisionAt = now + 6000;

    // All other disciples bow to the new Sect Leader!
    for (const d of this.disciples.values()) {
      if (d.userId !== newLeader.userId && !d.isSweepingPenalty) {
        d.animation = 'bow';
        d.direction = 'rear';
        d.actionStartedAt = now;
        d.actionDurationMs = 4000;
        d.nextDecisionAt = now + 4000;
      }
    }

    soundSynthesizer.playThroneFanfare();

    const promo: PromotionAnnouncement = {
      id: `throne_${Date.now()}`,
      timestamp: Date.now(),
      userId: newLeader.userId,
      displayName: newLeader.displayName,
      oldRankName: prevPlayerRankName,
      newRankId: 'tan_giao_chu',
      newRankName: 'Tân Giáo Chủ',
      giftName: giftDisplayName,
      coinValue: newLeader.totalCoins,
      isThroneTakeover: true,
      isCoLeader: false,
    };
    this.promotions = [promo, ...this.promotions].slice(0, 50);

    this.triggerSectLeaderSpeech(
      'throne_transfer',
      {
        playerName: newLeader.displayName,
        leaderName: newLeader.displayName,
        giftName: giftDisplayName,
        rankName: 'Tân Giáo Chủ',
      },
      'throne_transfer',
      'throne_handover'
    );

    this.addLog(
      'promotion',
      `SOÁN NGÔI GIÁO CHỦ: ${newLeader.displayName}`,
      `Dâng ${giftDisplayName} đăng cơ Tân Giáo Chủ! Cựu Giáo Chủ lui về làm Thái Thượng Giáo Chủ.`
    );
  }

  private getRankOrder(rankId: RankTierId): number {
    const order: RankTierId[] = [
      'dan_den',
      'ngoai_mon_do_de',
      'noi_mon_de_tu',
      'su_huynh_su_ty',
      'tinh_anh_de_tu',
      'ho_phap_ma_giao',
      'dai_truong_lao',
      'dong_ton_giao_chu',
      'tan_giao_chu',
    ];
    return order.indexOf(rankId);
  }

  public computeRankForCoins(totalCoins: number, explicitRank?: RankTierId): RankTierConfig {
    const standardRanks = this.config.ranks.filter(r => !r.isThroneRank);
    const sortedDesc = [...standardRanks].sort((a, b) => b.minCoins - a.minCoins);
    const byCoins = sortedDesc.find(r => totalCoins >= r.minCoins) || standardRanks[0];

    if (
      explicitRank &&
      explicitRank !== 'tan_giao_chu' &&
      this.getRankOrder(explicitRank) > this.getRankOrder(byCoins.id)
    ) {
      return this.config.ranks.find(r => r.id === explicitRank) || byCoins;
    }
    return byCoins;
  }

  public applyRankToDisciple(disciple: SectDisciple, rankId: RankTierId) {
    const rankDef = this.config.ranks.find(r => r.id === rankId) || this.config.ranks[0];
    const now = Date.now();
    disciple.rankId = rankDef.id;
    disciple.rankName = rankDef.name;
    disciple.scale = rankDef.scaleMultiplier;
    disciple.auraColor = rankDef.auraColor;
    disciple.primaryColor = rankDef.primaryColor;
    disciple.secondaryColor = rankDef.secondaryColor;
    disciple.isCoLeader = rankDef.id === 'dong_ton_giao_chu';
    disciple.isSectLeader = rankDef.id === 'tan_giao_chu';
    disciple.animation = 'celebrate';
    disciple.actionStartedAt = now;
    disciple.actionDurationMs = 3500;
    disciple.nextDecisionAt = now + 3500;

    if (rankDef.id === 'dong_ton_giao_chu') {
      const dais = this.computeZoneCoordinates('co_leader_dais');
      disciple.zone = 'co_leader_dais';
      disciple.targetX = dais.x;
      disciple.targetY = dais.y;
      disciple.direction = 'front';
    } else if (rankDef.id === 'dai_truong_lao' || rankDef.id === 'ho_phap_ma_giao') {
      // Elders & Guardians can roam prominently in the upper-middle hall and central aisle
      const spot = this.sampleFreeRoamPosition({
        excludeUserId: disciple.userId,
        mode: 'central_aisle',
      });
      disciple.zone = spot.zone;
      disciple.targetX = spot.x;
      disciple.targetY = Math.min(58, Math.max(33, spot.y));
      disciple.direction = 'rear';
    }
    this.syncDiscipleToLedger(disciple);
  }

  public handleLikeEvent(event: TikTokLiveEvent) {
    const userId = String(event.userId || event.uniqueId || '');
    const disciple = this.disciples.get(userId);
    if (disciple) {
      disciple.likeCount += Math.max(1, Number(event.likeCount || 1));
      // Likes do NOT reset inactivity stay duration timer (only valid comments & gifts do)
      this.notify();
    }
  }

  // ==========================================================================
  // 3 RANDOM MARTIAL ARTS MINI-GAMES & SCENE TRANSITION (150–180s CYCLE)
  // ==========================================================================
  public startMiniGame(forcedGameId?: MiniGameId) {
    const enabledGames = this.config.miniGames.filter(g => g.enabled);
    const pool = enabledGames.length > 0 ? enabledGames : this.config.miniGames;
    const chosen = forcedGameId
      ? this.config.miniGames.find(g => g.id === forcedGameId) || pool[0]
      : pool[Math.floor(Math.random() * pool.length)];

    this.activeScene = 'training_ground';
    this.isTransitioningScene = false;

    const participants = Array.from(this.disciples.values())
      .filter(d => !d.isSweepingPenalty && !d.isSectLeader && d.fsmState !== 'departing_gate')
      .map(d => d.userId);

    // Gather active disciples into neat martial formation ONLY while in the mini-game
    const activeList = Array.from(this.disciples.values()).filter(
      d => !d.isSweepingPenalty && !d.isSectLeader && d.fsmState !== 'departing_gate'
    );
    const cols = Math.max(4, Math.min(10, Math.ceil(Math.sqrt(activeList.length * 1.3))));
    const rows = Math.max(1, Math.ceil(activeList.length / cols));

    activeList.forEach((d, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const xSpan = 74;
      const ySpan = 48;
      const formX = 13 + ((col + 0.5) / cols) * xSpan + (row % 2 === 1 ? 1.5 : -1.5);
      const formY = 36 + ((row + 0.5) / rows) * ySpan;
      d.fsmState = 'minigame_active';
      d.animation = 'idle';
      d.meditationPhase = 'none';
      d.direction = 'rear';
      d.targetX = Math.max(10, Math.min(90, formX));
      d.targetY = Math.max(33, Math.min(88, formY));
    });

    const baseState: MiniGameActiveState = {
      isActive: true,
      gameId: chosen.id,
      title: chosen.name,
      phase: 'playing',
      currentRound: 1,
      totalRounds: chosen.id === 'ma_quyen_loan_vu' ? 1 : 3,
      remainingSec: chosen.durationSec || 30,
      startedAt: Date.now(),
      participantUserIds: participants,
      completedUserIds: [],
      failedUserIds: [],
      completionPct: 0,
      winThresholdPct: chosen.winThresholdPct || 60,
      sweepingPenaltyNames: [],
    };

    if (chosen.id === 'ma_anh_than_phap') {
      const dirs: ('TRAI' | 'PHAI' | 'NHAY')[] = ['TRAI', 'PHAI', 'NHAY'];
      baseState.currentObstacleDirection = dirs[Math.floor(Math.random() * dirs.length)];
    } else if (chosen.id === 'tam_khi_ma_tran') {
      const elements: ElementType[] = ['LUA', 'BANG', 'GIO'];
      const leaderEl = elements[Math.floor(Math.random() * elements.length)];
      baseState.leaderElement = leaderEl;
      baseState.expectedCounterCommand = ELEMENT_COUNTER_MAP[leaderEl];
    }

    this.miniGame = baseState;
    soundSynthesizer.playWarDrum(3);

    this.triggerSectLeaderSpeech(
      'minigame_host',
      { gameName: chosen.name },
      'minigame',
      chosen.id === 'tam_khi_ma_tran' ? 'cast_dark_magic' : 'start_minigame'
    );

    this.addLog(
      'minigame',
      `Khai màn Mini Game: ${chosen.name}`,
      `Thời lượng: ${baseState.remainingSec}s | Ngưỡng thắng: ${baseState.winThresholdPct}%`
    );

    this.notify();
  }

  private evaluateMiniGameComment(disciple: SectDisciple, rawComment: string) {
    if (!this.miniGame.isActive || this.miniGame.phase !== 'playing') return;

    const upper = rawComment
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D')
      .trim();
    const rawUpper = rawComment.toUpperCase().trim();

    if (!this.miniGame.participantUserIds.includes(disciple.userId)) {
      this.miniGame.participantUserIds.push(disciple.userId);
    }

    let validMove = false;

    if (this.miniGame.gameId === 'ma_quyen_loan_vu') {
      if (
        rawUpper.includes('MÚA') ||
        upper.includes('MUA') ||
        rawUpper.includes('VÕ') ||
        upper.includes('VO') ||
        upper.includes('QUYEN')
      ) {
        validMove = true;
        disciple.animation = 'combo_kungfu';
      }
    } else if (this.miniGame.gameId === 'ma_anh_than_phap') {
      const target = this.miniGame.currentObstacleDirection || 'NHAY';
      if (
        (target === 'TRAI' && (upper.includes('TRAI') || rawUpper.includes('TRÁI'))) ||
        (target === 'PHAI' && (upper.includes('PHAI') || rawUpper.includes('PHẢI'))) ||
        (target === 'NHAY' && (upper.includes('NHAY') || rawUpper.includes('NHẢY'))) ||
        upper === 'TRAI' ||
        upper === 'PHAI' ||
        upper === 'NHAY'
      ) {
        validMove = true;
        disciple.animation = target === 'NHAY' ? 'jump' : 'dodge';
      }
    } else if (this.miniGame.gameId === 'tam_khi_ma_tran') {
      const expected = this.miniGame.expectedCounterCommand || 'LUA';
      if (
        (expected === 'LUA' && (upper.includes('LUA') || rawUpper.includes('LỬA'))) ||
        (expected === 'BANG' && (upper.includes('BANG') || rawUpper.includes('BĂNG'))) ||
        (expected === 'GIO' && (upper.includes('GIO') || rawUpper.includes('GIÓ')))
      ) {
        validMove = true;
        disciple.animation = 'cast_seal';
      }
    }

    if (validMove && !this.miniGame.completedUserIds.includes(disciple.userId)) {
      this.miniGame.completedUserIds.push(disciple.userId);
      const total = Math.max(1, this.miniGame.participantUserIds.length);
      this.miniGame.completionPct = Math.min(
        100,
        Math.round((this.miniGame.completedUserIds.length / total) * 100)
      );
      soundSynthesizer.playChime();
    }
  }

  public finishMiniGame(forceWin?: boolean) {
    if (!this.miniGame.isActive) return;

    const total = Math.max(1, this.miniGame.participantUserIds.length);
    const completedCount = this.miniGame.completedUserIds.length;
    const pct = Math.min(100, Math.round((completedCount / total) * 100));
    this.miniGame.completionPct = pct;

    const isVictory =
      forceWin !== undefined
        ? forceWin
        : total === 0 || pct >= this.miniGame.winThresholdPct;

    this.miniGame.isVictory = isVictory;
    this.miniGame.phase = 'result';
    this.miniGame.resultStartedAt = Date.now();

    const nonCompletedIds = this.miniGame.participantUserIds.filter(
      id => !this.miniGame.completedUserIds.includes(id)
    );
    this.miniGame.failedUserIds = nonCompletedIds;

    const maxSweeping = this.config.sceneTransition.maxSweepingDisciples || 5;
    const penalizedNames: string[] = [];

    if (isVictory) {
      soundSynthesizer.playThroneFanfare();
      for (const d of this.disciples.values()) {
        if (!d.isSweepingPenalty) {
          d.animation = 'celebrate';
        }
      }
      this.triggerSectLeaderSpeech(
        'minigame_win',
        { gameName: this.miniGame.title },
        'minigame',
        'victory_fanfare'
      );
    } else {
      soundSynthesizer.playGong(0.9);
      const candidatesForSweep = nonCompletedIds
        .map(id => this.disciples.get(id))
        .filter((d): d is SectDisciple => Boolean(d && !d.isSectLeader && !d.isCoLeader))
        .slice(0, maxSweeping);

      for (const d of candidatesForSweep) {
        d.isSweepingPenalty = true;
        d.fsmState = 'sweeping_penalty';
        d.animation = 'sweep_floor';
        const sweepCoord = this.computeZoneCoordinates('sweeping_courtyard');
        d.zone = 'sweeping_courtyard';
        d.targetX = sweepCoord.x;
        d.targetY = sweepCoord.y;
        penalizedNames.push(d.displayName);
      }

      this.miniGame.sweepingPenaltyNames = penalizedNames;
      this.triggerSectLeaderSpeech(
        'minigame_lose',
        { gameName: this.miniGame.title },
        'minigame',
        'punish_sweep'
      );
    }

    this.addLog(
      'minigame',
      `Kết thúc ${this.miniGame.title}: ${isVictory ? 'THẮNG LỢI' : 'CHƯA ĐẠT'} (${pct}%)`,
      penalizedNames.length > 0
        ? `5 Đệ tử đi quét sân: ${penalizedNames.join(', ')}`
        : 'Không có đệ tử nào bị phạt quét sân.'
    );

    // Return to Main Hall and dissolve formation into Free Roam after popupDurationMs (default 4000ms)
    this.scheduleNextSceneCycle();
    const popupDurMs = Math.max(1000, this.config.overlayConfig?.popupDurationMs || 4000);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        this.miniGame.isActive = false;
        this.activeScene = 'main_hall';
        this.disperseDisciplesToFreeRoam();
        this.notify();
      }, popupDurMs);
    } else {
      this.miniGame.isActive = false;
      this.activeScene = 'main_hall';
      this.disperseDisciplesToFreeRoam();
    }

    this.notify();
  }

  /**
   * Dissolves any mini-game formation and disperses all non-sweeping disciples
   * back across the entire FreeRoamArea of the Đại Điện.
   */
  public disperseDisciplesToFreeRoam() {
    const now = Date.now();
    for (const d of this.disciples.values()) {
      if (d.isSweepingPenalty || d.isSectLeader || d.fsmState === 'departing_gate') continue;
      if (d.isCoLeader) {
        const dais = this.computeZoneCoordinates('co_leader_dais');
        d.zone = 'co_leader_dais';
        d.targetX = dais.x;
        d.targetY = dais.y;
        d.fsmState = 'idle_hall';
        d.animation = 'idle';
        d.direction = 'front';
        continue;
      }
      const dest = this.sampleFreeRoamPosition({
        excludeUserId: d.userId,
        mode: Math.random() < 0.48 ? 'central_aisle' : 'any',
      });
      d.zone = dest.zone;
      d.targetX = dest.x;
      d.targetY = dest.y;
      d.fsmState = 'free_roam_stroll';
      d.animation = 'walk';
      const dur = 2500 + Math.random() * 3500;
      d.actionStartedAt = now;
      d.actionDurationMs = dur;
      d.nextDecisionAt = now + dur;
    }
  }

  public switchSceneNow(targetScene?: ActiveSceneType) {
    const next: ActiveSceneType =
      targetScene || (this.activeScene === 'main_hall' ? 'training_ground' : 'main_hall');
    this.activeScene = next;
    this.scheduleNextSceneCycle();

    if (next === 'training_ground' && !this.miniGame.isActive) {
      this.startMiniGame();
    } else if (next === 'main_hall') {
      this.miniGame.isActive = false;
      this.disperseDisciplesToFreeRoam();
    }

    this.addLog('scene', `Chuyển cảnh sang: ${next === 'main_hall' ? 'Đại Điện Ma Giáo' : 'Sân Luyện Võ'}`, 'Chuyển cảnh trực tiếp');
    this.notify();
  }

  // ==========================================================================
  // PLAYER STAY DURATION & AUTO-DEPARTURE LIFECYCLE
  // ==========================================================================

  /**
   * Computes remaining stay time and stayStatus ('active' | 'expiring_soon' | 'departing')
   * for a single disciple without resetting their interaction clock.
   */
  public computeDiscipleStayMetrics(d: SectDisciple, now: number = Date.now()) {
    const cfg = this.config.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG;
    if (d.fsmState === 'departing_gate' || d.stayStatus === 'departing') {
      d.stayStatus = 'departing';
      const elapsedDepartSec = d.departStartedAt ? Math.max(0, (now - d.departStartedAt) / 1000) : 0;
      const totalDepartSec = Math.max(1, (d.departDurationMs || cfg.departAnimationDurationSec * 1000) / 1000);
      d.remainingStaySec = Math.max(0, Math.ceil(totalDepartSec - elapsedDepartSec));
      return;
    }

    const baseTimeoutSec =
      cfg.applyMode === 'immediate'
        ? cfg.inactivityTimeoutSec
        : d.assignedTimeoutSec || cfg.inactivityTimeoutSec || 420;
    const effectiveTimeoutSec = Math.max(5, baseTimeoutSec + (d.extraExtendedSec || 0));
    const lastInteract = d.lastInteractionAt || d.joinedAt || now;
    const elapsedSec = Math.max(0, (now - lastInteract) / 1000);
    const remainingSec = Math.max(0, Math.ceil(effectiveTimeoutSec - elapsedSec));
    d.remainingStaySec = remainingSec;

    if (!cfg.autoDepartEnabled) {
      d.stayStatus = 'active';
      return;
    }

    if (
      cfg.warningBeforeDepartEnabled &&
      remainingSec > 0 &&
      remainingSec <= Math.min(cfg.warningBeforeDepartSec, Math.max(1, effectiveTimeoutSec - 1))
    ) {
      d.stayStatus = 'expiring_soon';
    } else {
      d.stayStatus = 'active';
    }
  }

  /**
   * Safely removes a departing player from any active mini-game participant/completed/failed lists
   * and recalculates completion percentage so the mini-game continues smoothly.
   */
  private removeDiscipleFromMiniGameSafely(userId: string) {
    if (!this.miniGame.isActive) return;
    const beforeLen = this.miniGame.participantUserIds.length;
    this.miniGame.participantUserIds = this.miniGame.participantUserIds.filter(id => id !== userId);
    this.miniGame.completedUserIds = this.miniGame.completedUserIds.filter(id => id !== userId);
    this.miniGame.failedUserIds = this.miniGame.failedUserIds.filter(id => id !== userId);
    if (this.miniGame.participantUserIds.length !== beforeLen) {
      const total = Math.max(1, this.miniGame.participantUserIds.length);
      this.miniGame.completionPct =
        this.miniGame.participantUserIds.length === 0
          ? 0
          : Math.round((this.miniGame.completedUserIds.length / total) * 100);
    }
  }

  /**
   * Initiates departure for a disciple whose inactivity timer has expired:
   * 1. Stops autonomous behavior
   * 2. Safely exits active mini-game if participating
   * 3. Runs walking-out-to-gate animation (or finalizes immediately if walkToGateOnDepart is disabled)
   */
  private initiateDiscipleDeparture(d: SectDisciple, now: number = Date.now()) {
    const cfg = this.config.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG;
    this.syncDiscipleToLedger(d);
    if (this.config.rankAccumulation?.mode === 'persistent') {
      this.savePersistentLedger();
    }

    // Remove safely from mini-game if active
    this.removeDiscipleFromMiniGameSafely(d.userId);

    if (!cfg.walkToGateOnDepart) {
      this.finalizeDiscipleDeparture(d, now);
      return;
    }

    const departDurationMs = Math.max(1000, Math.min(15000, (cfg.departAnimationDurationSec || 4) * 1000));
    d.fsmState = 'departing_gate';
    d.stayStatus = 'departing';
    d.animation = 'depart';
    d.direction = 'front';
    d.meditationPhase = 'none';
    d.isSweepingPenalty = false;
    d.zone = 'entry_gate';
    d.targetX = 50 + (Math.random() * 6 - 3);
    d.targetY = 94;
    d.departStartedAt = now;
    d.departDurationMs = departDurationMs;
    d.actionStartedAt = now;
    d.actionDurationMs = departDurationMs;
    d.nextDecisionAt = now + departDurationMs + 60000;
    d.remainingStaySec = Math.ceil(departDurationMs / 1000);

    this.addLog(
      'system',
      `${d.displayName} hết thời gian ở lại — đang đi ra cổng`,
      `Không tương tác trong ${Math.round((now - (d.lastInteractionAt || d.joinedAt)) / 1000)}s. Bảo lưu ${d.totalCoins} xu (${d.rankName}).`
    );
  }

  /**
   * Finalizes departure: removes character from active hall display and promotes next waiting player.
   * Never deletes cumulative coins or rank in playerLedger.
   */
  private finalizeDiscipleDeparture(d: SectDisciple, _now: number = Date.now()) {
    this.syncDiscipleToLedger(d);
    if (this.config.rankAccumulation?.mode === 'persistent') {
      this.savePersistentLedger();
    }
    this.removeDiscipleFromMiniGameSafely(d.userId);
    this.disciples.delete(d.userId);

    if (this.sectLeader.currentLeaderUserId === d.userId) {
      this.sectLeader.hasCustomPlayerLeader = false;
      this.sectLeader.currentLeaderName = this.config.sectLeader.title;
      this.sectLeader.currentLeaderUserId = undefined;
    }

    this.addLog(
      'system',
      `${d.displayName} đã rời Đại Điện`,
      `Giải phóng vị trí sảnh. Hồ sơ bảo lưu: ${d.totalCoins} xu • ${d.rankName}.`
    );

    // Promote waiting queue disciples into freed hall slots
    const maxCap = this.config.sceneConfig.maxConcurrentPlayers || 80;
    while (this.disciples.size < maxCap && this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift()!;
      const nowPromote = Date.now();
      next.lastInteractionAt = nowPromote;
      next.lastActiveAt = nowPromote;
      next.assignedTimeoutSec =
        this.config.stayDurationConfig?.inactivityTimeoutSec ||
        this.config.playerAnimationConfig.idleTimeoutSec ||
        420;
      next.extraExtendedSec = 0;
      next.stayStatus = 'active';
      next.remainingStaySec = next.assignedTimeoutSec;
      this.disciples.set(next.userId, next);
      this.assignHallSlotAndWalkIn(next);
      this.addLog(
        'comment',
        `${next.displayName} từ hàng chờ bước vào Đại Điện`,
        `Thay thế vị trí trống vừa giải phóng.`
      );
    }
  }

  /**
   * Centralized lifecycle check executed inside tick() for all active disciples.
   */
  private updateAllDisciplesStayLifecycle(now: number = Date.now()) {
    const cfg = this.config.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG;
    const all = Array.from(this.disciples.values());

    for (const d of all) {
      if (d.fsmState === 'departing_gate' || d.stayStatus === 'departing') {
        const started = d.departStartedAt || d.actionStartedAt || now;
        const dur = d.departDurationMs || Math.max(1000, (cfg.departAnimationDurationSec || 4) * 1000);
        const distToGate = Math.hypot((d.targetX || 50) - d.x, (d.targetY || 94) - d.y);
        if (now - started >= dur || (distToGate <= 1.2 && now - started >= Math.min(1200, dur * 0.5))) {
          this.finalizeDiscipleDeparture(d, now);
        } else {
          this.computeDiscipleStayMetrics(d, now);
        }
        continue;
      }

      this.computeDiscipleStayMetrics(d, now);

      if (cfg.autoDepartEnabled && (d.remainingStaySec ?? 1) <= 0) {
        this.initiateDiscipleDeparture(d, now);
      }
    }
  }

  /**
   * Updates stayDurationConfig from Admin or Test tools and applies immediately or to new players only.
   */
  public setStayDurationConfig(patch: Partial<DiscipleStayDurationConfig>): DiscipleStayDurationConfig {
    const merged = sanitizeStayDurationConfig(
      patch,
      this.config.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG
    );
    this.config.stayDurationConfig = merged;
    this.config.playerAnimationConfig.idleTimeoutSec = merged.inactivityTimeoutSec;

    const now = Date.now();
    if (merged.applyMode === 'immediate') {
      for (const d of this.disciples.values()) {
        if (d.fsmState !== 'departing_gate') {
          d.assignedTimeoutSec = merged.inactivityTimeoutSec;
        }
        this.computeDiscipleStayMetrics(d, now);
      }
      this.updateAllDisciplesStayLifecycle(now);
    } else {
      for (const d of this.disciples.values()) {
        this.computeDiscipleStayMetrics(d, now);
      }
    }

    this.addLog(
      'system',
      `Cập nhật Thời Gian Hoạt Động: ${merged.inactivityTimeoutMinutes} phút (${merged.inactivityTimeoutSec}s)`,
      `Tự rời sảnh: ${merged.autoDepartEnabled ? 'BẬT' : 'TẮT'} • Đi ra cổng: ${merged.walkToGateOnDepart ? `${merged.departAnimationDurationSec}s` : 'TẮT'} • Cảnh báo: ${merged.warningBeforeDepartEnabled ? `Trước ${merged.warningBeforeDepartSec}s` : 'TẮT'} • Áp dụng: ${merged.applyMode === 'immediate' ? 'Ngay cho người đang ở sảnh' : 'Chỉ người mới'}`
    );
    this.notify();
    return merged;
  }

  /**
   * Restores default stay duration config (7 minutes = 420 seconds).
   */
  public resetStayDurationConfig(): DiscipleStayDurationConfig {
    return this.setStayDurationConfig(structuredClone(DEFAULT_STAY_DURATION_CONFIG));
  }

  /**
   * Extends remaining stay time for a specific user (or all active users if userId omitted) in Admin/Demo mode.
   */
  public extendDiscipleStayTime(userId?: string, addSeconds: number = 120, reason: string = 'Admin gia hạn'): number {
    const now = Date.now();
    const deltaSec = Math.max(5, Math.min(3600, Math.round(addSeconds)));
    let affected = 0;

    for (const d of this.disciples.values()) {
      if (userId && d.userId !== userId) continue;
      if (d.fsmState === 'departing_gate') {
        // Cancel departure and return to hall free roam!
        d.fsmState = 'free_roam_stroll';
        d.stayStatus = 'active';
        d.departStartedAt = undefined;
        d.departDurationMs = undefined;
        const slot = this.sampleFreeRoamPosition({ excludeUserId: d.userId });
        d.zone = slot.zone;
        d.targetX = slot.x;
        d.targetY = slot.y;
        d.animation = 'walk';
        d.lastInteractionAt = now;
        d.extraExtendedSec = 0;
      } else {
        d.extraExtendedSec = (d.extraExtendedSec || 0) + deltaSec;
      }
      this.computeDiscipleStayMetrics(d, now);
      affected += 1;
    }

    if (affected > 0) {
      this.addLog(
        'system',
        userId
          ? `Gia hạn +${deltaSec}s cho ${this.disciples.get(userId)?.displayName || userId}`
          : `Gia hạn +${deltaSec}s cho toàn bộ ${affected} đệ tử`,
        `Lý do: ${reason}`
      );
      this.notify();
    }
    return affected;
  }

  /**
   * Fast-forwards inactivity time for testing (shifts lastInteractionAt backward by `seconds`)
   * and runs lifecycle checks immediately so Admin can test warning & departure in seconds.
   */
  public simulateTimeElapsed(seconds: number, targetUserId?: string) {
    const shiftMs = Math.max(1, Math.round(seconds)) * 1000;
    const now = Date.now();
    for (const d of this.disciples.values()) {
      if (targetUserId && d.userId !== targetUserId) continue;
      if (d.fsmState === 'departing_gate') {
        d.departStartedAt = (d.departStartedAt || now) - shiftMs;
      } else {
        d.lastInteractionAt = (d.lastInteractionAt || d.joinedAt || now) - shiftMs;
      }
    }
    this.updateAllDisciplesStayLifecycle(now);
    this.addLog(
      'system',
      `Giả lập trôi qua +${Math.round(seconds)} giây không tương tác`,
      targetUserId ? `Áp dụng cho ID: ${targetUserId}` : `Áp dụng cho toàn bộ đệ tử trong sảnh.`
    );
    this.notify();
  }

  /**
   * Returns a human-readable Vietnamese label for a disciple's current activity.
   */
  public describeDiscipleCurrentActivity(d: SectDisciple): string {
    if (d.fsmState === 'departing_gate' || d.animation === 'depart') return 'Đang đi ra cổng rời sảnh';
    if (d.isSweepingPenalty || d.animation === 'sweep_floor') return 'Bị phạt quét sân';
    if (d.fsmState === 'walk_in_hall') return 'Đi từ cổng vào đại điện';
    if (d.fsmState === 'bow_sect_leader' || d.animation === 'bow') return 'Chào bái kiến Giáo Chủ';
    if (d.animation === 'meditate') return 'Ngồi thiền vận công';
    if (d.animation === 'stand_up') return 'Đứng dậy sau thiền';
    if (d.animation === 'run') return 'Chạy khinh công';
    if (d.animation === 'walk') {
      return d.zone === 'central_aisle' ? 'Đi dạo lối chính giữa' : 'Đi dạo trong đại điện';
    }
    if (d.animation === 'combo_kungfu' || d.animation === 'cast_seal') return 'Múa võ / Luyện công';
    if (d.animation === 'punch' || d.animation === 'kick') return 'Luyện quyền cước';
    if (d.animation === 'jump' || d.animation === 'dodge') return 'Nhảy / Thân pháp';
    if (d.animation === 'clap' || d.animation === 'celebrate') return 'Hoan hô cổ vũ / Thụ lễ';
    return d.zone === 'central_aisle' ? 'Đứng giữa đại điện' : 'Đứng quan sát sảnh';
  }

  // ==========================================================================
  // MAIN GAME LOOP (MOVEMENT, RADIAL SEPARATION, AUTONOMOUS AI LIFECYCLE)
  // ==========================================================================
  public tick() {
    const now = Date.now();
    const dtSec = Math.min(0.25, Math.max(0.016, (now - this.lastTickAt) / 1000));
    this.lastTickAt = now;

    this.frameCounter += 1;
    if (now - this.lastFpsMeasureAt >= 1000) {
      this.fps = Math.min(60, Math.max(30, this.frameCounter * 6));
      this.frameCounter = 0;
      this.lastFpsMeasureAt = now;
    }

    // 1. Update Sect Leader position & animation revert to idle_throne
    const leaderDx = this.sectLeader.targetX - this.sectLeader.x;
    const leaderDy = this.sectLeader.targetY - this.sectLeader.y;
    if (Math.hypot(leaderDx, leaderDy) > 0.4) {
      this.sectLeader.x += leaderDx * Math.min(1, dtSec * 3.5);
      this.sectLeader.y += leaderDy * Math.min(1, dtSec * 3.5);
    }

    if (
      this.sectLeader.currentAnimation !== 'idle_throne' &&
      now - this.sectLeader.animationStartedAt > this.sectLeader.animationDurationMs
    ) {
      this.sectLeader.currentAnimation = 'idle_throne';
      this.sectLeader.expression = 'arrogant';
      this.sectLeader.targetX = this.config.sectLeader.thronePosition.x;
      this.sectLeader.targetY = this.config.sectLeader.thronePosition.y;
    }

    // 2. Sect Leader AI Director (auto boast / patrol / interact every 15-35s)
    if (this.config.sectLeader.autoIdleEnabled && now >= this.nextLeaderIdleAt && !this.miniGame.isActive) {
      const [minS, maxS] = this.config.sectLeader.idleActionIntervalRangeSec || [15, 35];
      this.nextLeaderIdleAt = now + (minS + Math.random() * Math.max(5, maxS - minS)) * 1000;

      if (this.disciples.size === 0) {
        this.triggerSectLeaderSpeech('quiet_hall', {}, 'boast_idle');
      } else {
        const r = Math.random();
        if (r < 0.62) {
          this.triggerSectLeaderSpeech('silly_evil_boast', {}, 'boast_idle');
        } else {
          const allDisciples = Array.from(this.disciples.values()).filter(
            d => d.fsmState !== 'departing_gate'
          );
          const pick = allDisciples[Math.floor(Math.random() * allDisciples.length)];
          if (pick) {
            this.triggerSectLeaderSpeech(
              'disciple_interact',
              { playerName: pick.displayName, rankName: pick.rankName },
              'boast_idle'
            );
          }
        }
      }
    }

    // 3. Scene Transition Cycle (150-180s)
    if (
      this.config.sceneTransition.autoCycleEnabled &&
      !this.config.sceneTransition.isPaused &&
      !this.miniGame.isActive &&
      now >= this.nextSceneSwitchAt
    ) {
      this.startMiniGame();
    }

    // 4. Active Mini-Game Timer & Multi-Round Progression
    if (this.miniGame.isActive && this.miniGame.phase === 'playing') {
      const elapsedSec = Math.floor((now - this.miniGame.startedAt) / 1000);
      const gameDef =
        this.config.miniGames.find(g => g.id === this.miniGame.gameId) || this.config.miniGames[0];
      const totalDur = gameDef.durationSec || 30;
      const rem = Math.max(0, totalDur - elapsedSec);
      this.miniGame.remainingSec = rem;

      if (this.miniGame.totalRounds > 1) {
        const roundDur = Math.max(5, Math.floor(totalDur / this.miniGame.totalRounds));
        const expectedRound = Math.min(
          this.miniGame.totalRounds,
          Math.floor(elapsedSec / roundDur) + 1
        );
        if (expectedRound !== this.miniGame.currentRound) {
          this.miniGame.currentRound = expectedRound;
          if (this.miniGame.gameId === 'ma_anh_than_phap') {
            const dirs: ('TRAI' | 'PHAI' | 'NHAY')[] = ['TRAI', 'PHAI', 'NHAY'];
            this.miniGame.currentObstacleDirection = dirs[expectedRound % dirs.length];
          } else if (this.miniGame.gameId === 'tam_khi_ma_tran') {
            const els: ElementType[] = ['LUA', 'BANG', 'GIO'];
            const nextEl = els[expectedRound % els.length];
            this.miniGame.leaderElement = nextEl;
            this.miniGame.expectedCounterCommand = ELEMENT_COUNTER_MAP[nextEl];
          }
          soundSynthesizer.playWarDrum(1);
        }
      }

      if (rem <= 0) {
        this.finishMiniGame();
      }
    }

    // 4b. Check & Update Player Stay Duration / Auto-Departure Lifecycle
    this.updateAllDisciplesStayLifecycle(now);

    // 5. Update Disciples Movement, Footstep Phase, & Arrival Transitions
    const animCfg = this.config.playerAnimationConfig;
    const walkSpeed = 13.5 * (animCfg.walkSpeedMultiplier || 1.0);
    const runSpeed = 23.5 * (animCfg.runSpeedMultiplier || 1.0);
    const freeRoamEnabled = this.config.sceneConfig.freeRoamEnabled !== false;
    const allDisciples = Array.from(this.disciples.values());

    let currentMovers = 0;

    for (const d of allDisciples) {
      const dx = d.targetX - d.x;
      const dy = d.targetY - d.y;
      const dist = Math.hypot(dx, dy);

      // Update meditation sitting phase progression
      if (d.animation === 'meditate') {
        if (d.meditationPhase === 'sitting_down' && now - (d.actionStartedAt || now) > 650) {
          d.meditationPhase = 'seated';
        } else if (!d.meditationPhase || d.meditationPhase === 'none') {
          d.meditationPhase = 'seated';
        }
      } else if (d.animation !== 'stand_up') {
        d.meditationPhase = 'none';
      }

      if (dist > 0.55) {
        currentMovers += 1;
        const speed = d.animation === 'run' ? runSpeed : walkSpeed;
        const step = Math.min(dist, speed * dtSec);
        d.x += (dx / dist) * step;
        d.y += (dy / dist) * step;

        // Advance articulated leg stride phase proportional to actual distance walked (no sliding!)
        d.stepPhase = ((d.stepPhase || 0) + step * 1.45) % (Math.PI * 2);

        if (d.fsmState === 'departing_gate') {
          d.animation = 'depart';
          d.direction = 'front';
        } else if (d.animation !== 'run' && d.animation !== 'walk' && !this.miniGame.isActive) {
          d.animation = 'walk';
        }

        // 4-directional facing based on movement vector:
        // Moving up toward Throne (dy < 0) -> 'rear'
        // Moving down toward Gate (dy > 0) -> 'front'
        // Moving horizontally -> 'left' / 'right'
        if (d.fsmState !== 'departing_gate') {
          if (Math.abs(dx) > Math.abs(dy) * 1.15) {
            d.direction = dx > 0 ? 'right' : 'left';
          } else {
            d.direction = dy < 0 ? 'rear' : 'front';
          }
        }
      } else {
        // Reached target coordinate -> sync target to current position so character NEVER snaps back
        d.targetX = d.x;
        d.targetY = d.y;

        if (d.fsmState === 'departing_gate') {
          this.finalizeDiscipleDeparture(d, now);
          continue;
        } else if (d.fsmState === 'walk_in_hall') {
          d.fsmState = 'bow_sect_leader';
          d.animation = 'bow';
          d.direction = 'rear';
          d.actionStartedAt = now;
          d.actionDurationMs = 2200;
          d.nextDecisionAt = now + 2200;
        } else if (d.fsmState === 'bow_sect_leader') {
          if (d.animation === 'walk' || d.animation === 'run') {
            d.animation = 'bow';
            d.direction = 'rear';
            d.actionStartedAt = now;
            d.actionDurationMs = 2600;
            d.nextDecisionAt = now + 2600;
          }
        } else if (d.fsmState === 'return_from_sweep') {
          d.fsmState = 'idle_hall';
          d.animation = 'idle';
          d.direction = 'rear';
          d.nextDecisionAt = now + 1500;
        } else if (
          d.fsmState === 'free_roam_stroll' ||
          d.fsmState === 'free_roam_cross_aisle' ||
          d.fsmState === 'patrol_hall' ||
          d.fsmState === 'running_command'
        ) {
          // Arrived at stroll destination -> transition to a natural stationary pose until next decision
          if (d.animation === 'walk' || d.animation === 'run') {
            d.animation = 'idle';
            if (d.y < 42) {
              d.direction = 'rear'; // Near Throne, look up at Sect Leader
            }
          }
        } else if (d.fsmState === 'free_roam_social') {
          if (d.animation === 'walk' || d.animation === 'run') {
            d.animation = 'clap';
            if (d.spectateTargetId) {
              const target = this.disciples.get(d.spectateTargetId);
              if (target) {
                const sdx = target.x - d.x;
                const sdy = target.y - d.y;
                if (Math.abs(sdx) > Math.abs(sdy)) {
                  d.direction = sdx > 0 ? 'right' : 'left';
                } else {
                  d.direction = sdy < 0 ? 'rear' : 'front';
                }
              }
            }
          }
        }
      }
    }

    // 6. Radial Anti-Overlap Separation & Obstacle Avoidance (in Main Hall)
    const remainingDisciples = Array.from(this.disciples.values());
    if (this.activeScene === 'main_hall' && !this.miniGame.isActive) {
      const minSep = Math.max(2.5, Math.min(10, animCfg.minSeparationDist || 5.2));
      for (let i = 0; i < remainingDisciples.length; i++) {
        const a = remainingDisciples[i];
        if (
          a.isSweepingPenalty ||
          a.isSectLeader ||
          a.fsmState === 'walk_in_hall' ||
          a.fsmState === 'departing_gate'
        )
          continue;

        for (let j = i + 1; j < remainingDisciples.length; j++) {
          const b = remainingDisciples[j];
          if (
            b.isSweepingPenalty ||
            b.isSectLeader ||
            b.fsmState === 'walk_in_hall' ||
            b.fsmState === 'departing_gate'
          )
            continue;

          const sdx = a.x - b.x;
          const sdy = a.y - b.y;
          const dist = Math.hypot(sdx, sdy);

          if (dist < minSep) {
            let ux = 0;
            let uy = 0;
            if (dist > 0.01) {
              ux = sdx / dist;
              uy = sdy / dist;
            } else {
              const angle = ((i * 137.5) % 360) * (Math.PI / 180);
              ux = Math.cos(angle);
              uy = Math.sin(angle);
            }

            const push = (minSep - dist) * 0.35 * Math.min(1, dtSec * 8);
            if (!a.isCoLeader) {
              const nextA = this.clampToWalkableHall(a.x + ux * push, a.y + uy * push, false);
              a.x = nextA.x;
              a.y = nextA.y;
              if (Math.hypot(a.targetX - a.x, a.targetY - a.y) < 1.2) {
                a.targetX = a.x;
                a.targetY = a.y;
              }
            }
            if (!b.isCoLeader) {
              const nextB = this.clampToWalkableHall(b.x - ux * push, b.y - uy * push, false);
              b.x = nextB.x;
              b.y = nextB.y;
              if (Math.hypot(b.targetX - b.x, b.targetY - b.y) < 1.2) {
                b.targetX = b.x;
                b.targetY = b.y;
              }
            }
          }
        }

        // Ensure disciple stays within walkable bounds and out of Throne Reserved Zone
        if (!a.isCoLeader) {
          const clamped = this.clampToWalkableHall(a.x, a.y, false);
          a.x = clamped.x;
          a.y = clamped.y;
        }
      }
    }

    // 7. Autonomous Per-Character Behavior Scheduling
    if (freeRoamEnabled && !this.miniGame.isActive && this.activeScene === 'main_hall') {
      const maxMovers = Math.max(
        2,
        Math.min(
          80,
          animCfg.maxConcurrentMovers ||
            Math.ceil(remainingDisciples.length * (animCfg.activeRatioTarget || 0.28))
        )
      );
      const minDesiredMovers = Math.min(
        maxMovers,
        Math.max(1, Math.floor(remainingDisciples.length * (animCfg.activeRatioTarget || 0.28) * 0.75))
      );

      for (const d of remainingDisciples) {
        if (d.isSweepingPenalty || d.isSectLeader || d.fsmState === 'departing_gate') continue;
        if (now >= (d.nextDecisionAt || 0)) {
          const canStartMove = currentMovers < maxMovers;
          const shouldPreferMove = currentMovers < minDesiredMovers;
          this.assignNextAutonomousAction(d, now, shouldPreferMove && canStartMove);
          if (d.animation === 'walk' || d.animation === 'run') {
            currentMovers += 1;
          }
        }
      }
    }

    this.notify();
  }

  // ==========================================================================
  // DEMO TOOLS, POPULATION PRESETS (1, 10, 30, 50, 80) & ADMIN MASS ACTIONS
  // ==========================================================================
  public spawnDemoPlayers(count: number) {
    const sampleNames = [
      'Lệnh Hồ Xung', 'Đông Phương', 'Nhậm Ngã Hành', 'Hướng Vấn Thiên', 'Nhậm Doanh Doanh',
      'Dương Tiêu', 'Phạm Dao', 'Vi Nhất Tiếu', 'Tạ Tốn', 'Ân Thiên Chính',
      'Tiêu Phong', 'Đoàn Dự', 'Hư Trúc', 'Mộ Dung Phục', 'Vương Ngữ Yên',
      'Dương Quá', 'Tiểu Long Nữ', 'Quách Tĩnh', 'Hoàng Dung', 'Chu Bá Thông',
      'Trương Vô Kỵ', 'Triệu Mẫn', 'Chu Chỉ Nhược', 'Tiểu Chiêu', 'Thành Côn',
      'Lý Tầm Hoan', 'A Phi', 'Kinh Vô Mệnh', 'Lục Tiểu Phụng', 'Tây Môn Xuyết Tuyết',
      'Diệp Cô Thành', 'Hoa Mãn Lầu', 'Sở Lưu Hương', 'Hồ Thiết Hoa', 'Vô Hoa',
      'Nhiếp Phong', 'Bộ Kinh Vân', 'Hùng Bá', 'Vô Danh', 'Kiếm Thánh',
    ];
    const sampleGreetings = [
      'Bái kiến Giáo Chủ vạn tuế!',
      'Đệ tử xin nhập môn Ma Giáo!',
      'Đại điện hôm nay uy nghiêm quá!',
      'Chúc Giáo Chủ thiên thu vạn đại!',
      'Thiên hạ đệ nhất tà phái!',
      'Giáo Chủ anh minh thần võ!',
      'Đệ tử xin lĩnh giáo võ học!',
      'Ma Giáo nhất thống giang hồ!',
    ];

    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const baseName = sampleNames[i % sampleNames.length];
      const suffix = this.disciples.size + 1 > sampleNames.length ? ` ${this.disciples.size + 1}` : '';
      const id = `demo_u_${now}_${i}_${Math.random().toString(36).slice(2, 5)}`;

      const res = this.handleCommentEvent({
        id: `demo_evt_${now}_${i}`,
        type: 'comment',
        timestamp: now,
        userId: id,
        uniqueId: id,
        nickname: `${baseName}${suffix}`,
        comment: sampleGreetings[i % sampleGreetings.length],
        isDemo: true,
      });

      // Place spawned demo disciples directly onto their sampled FreeRoam positions across the entire hall
      // and stagger their autonomous activities so the hall is immediately alive and distributed!
      if (res.disciple && this.disciples.has(res.disciple.userId)) {
        const d = res.disciple;
        const pos = this.sampleFreeRoamPosition({
          excludeUserId: d.userId,
          mode: i % 3 === 0 ? 'central_aisle' : 'any',
        });
        d.x = pos.x;
        d.y = pos.y;
        d.targetX = pos.x;
        d.targetY = pos.y;
        d.zone = pos.zone;
        // Give ~25% of them varied ranks for visual variety when spawning larger crowds
        if (i > 0 && i % 11 === 0) {
          this.applyRankToDisciple(d, 'dai_truong_lao');
          d.x = pos.x;
          d.y = pos.y;
        } else if (i > 0 && i % 7 === 0) {
          this.applyRankToDisciple(d, 'ho_phap_ma_giao');
          d.x = pos.x;
          d.y = pos.y;
        } else if (i > 0 && i % 5 === 0) {
          this.applyRankToDisciple(d, 'tinh_anh_de_tu');
        } else if (i > 0 && i % 3 === 0) {
          this.applyRankToDisciple(d, 'noi_mon_de_tu');
        }
        this.assignNextAutonomousAction(d, now + (i % 5) * 300, i % 3 === 0);
      }
    }
    this.notify();
  }

  /**
   * Sets the exact number of active disciples in the Đại Điện (e.g. 1, 10, 30, 50, 80)
   * for immediate visual verification and testing.
   */
  public setPopulationPreset(targetCount: number) {
    const clampedTarget = Math.max(0, Math.min(80, Math.round(targetCount)));
    this.clearAllPlayers();
    if (clampedTarget > 0) {
      this.spawnDemoPlayers(clampedTarget);
    }
    this.addLog(
      'system',
      `Thiết lập quân số Đại Điện: ${clampedTarget} đệ tử`,
      `Phân bố toàn bộ mặt sàn Free Roam & Lối Đi Chính Giữa.`
    );
    this.notify();
  }

  /**
   * Admin Action: Redistributes all existing disciples across the entire FreeRoamArea
   * including the Central Aisle, eliminating any clustering.
   */
  public redistributeAllDisciples() {
    const now = Date.now();
    const list = Array.from(this.disciples.values());
    list.forEach((d, idx) => {
      if (d.isSweepingPenalty || d.isSectLeader || d.fsmState === 'departing_gate') return;
      if (d.isCoLeader) {
        const dais = this.computeZoneCoordinates('co_leader_dais');
        d.zone = 'co_leader_dais';
        d.targetX = dais.x;
        d.targetY = dais.y;
        return;
      }
      const pos = this.sampleFreeRoamPosition({
        excludeUserId: d.userId,
        mode: idx % 2 === 0 ? 'central_aisle' : 'any',
      });
      d.zone = pos.zone;
      d.targetX = pos.x;
      d.targetY = pos.y;
      d.fsmState = 'free_roam_stroll';
      d.animation = 'walk';
      d.meditationPhase = 'none';
      const dur = 2800 + Math.random() * 3200;
      d.actionStartedAt = now;
      d.actionDurationMs = dur;
      d.nextDecisionAt = now + dur;
    });

    this.addLog(
      'system',
      `Phân bố lại toàn bộ ${list.length} nhân vật`,
      `Tất cả đệ tử di chuyển sang vị trí mới trên toàn mặt sàn và lối đi chính giữa.`
    );
    this.notify();
  }

  /**
   * Admin Action: Returns all disciples to autonomous Free Roam behavior immediately.
   */
  public resumeAllFreeRoam() {
    this.config.sceneConfig.freeRoamEnabled = true;
    const now = Date.now();
    let idx = 0;
    for (const d of this.disciples.values()) {
      if (d.isSweepingPenalty || d.isSectLeader || d.fsmState === 'departing_gate') continue;
      this.assignNextAutonomousAction(d, now, idx % 3 === 0);
      idx += 1;
    }
    this.addLog(
      'system',
      `Khôi phục sinh hoạt tự do (Free Roam)`,
      `Toàn bộ ${this.disciples.size} đệ tử tự động đi dạo, luyện võ, thiền và chào Giáo Chủ.`
    );
    this.notify();
  }

  public clearDemoData() {
    for (const [id, d] of this.disciples.entries()) {
      if (d.isDemo) {
        this.disciples.delete(id);
      }
    }
    this.waitingQueue = this.waitingQueue.filter(d => !d.isDemo);
    this.promotions = this.promotions.filter(p => !p.userId.startsWith('demo_'));
    if (this.sectLeader.currentLeaderUserId?.startsWith('demo_')) {
      this.sectLeader.hasCustomPlayerLeader = false;
      this.sectLeader.currentLeaderName = this.config.sectLeader.title;
      this.sectLeader.currentLeaderUserId = undefined;
    }
    const maxCap = this.config.sceneConfig.maxConcurrentPlayers || 80;
    while (this.disciples.size < maxCap && this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift()!;
      this.disciples.set(next.userId, next);
      this.assignHallSlotAndWalkIn(next);
    }
    this.addLog('system', 'Đã xóa dữ liệu Demo', 'Sẵn sàng cho dữ liệu TikTok LIVE thật.');
    this.notify();
  }

  /**
   * Removes a single disciple/test user by userId from the hall or waiting queue,
   * and promotes the next queued user if capacity opens up.
   */
  public removeDisciple(userId: string): boolean {
    const targetId = String(userId || '').trim();
    if (!targetId) return false;

    const existedInHall = this.disciples.get(targetId);
    const prevQueueLen = this.waitingQueue.length;
    this.disciples.delete(targetId);
    this.waitingQueue = this.waitingQueue.filter(d => d.userId !== targetId);
    this.promotions = this.promotions.filter(p => p.userId !== targetId);

    if (this.sectLeader.currentLeaderUserId === targetId) {
      this.sectLeader.hasCustomPlayerLeader = false;
      this.sectLeader.currentLeaderName = this.config.sectLeader.title;
      this.sectLeader.currentLeaderUserId = undefined;
    }

    const removed = Boolean(existedInHall) || this.waitingQueue.length < prevQueueLen;
    if (!removed) return false;

    const maxCap = this.config.sceneConfig.maxConcurrentPlayers || 80;
    while (this.disciples.size < maxCap && this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift()!;
      this.disciples.set(next.userId, next);
      this.assignHallSlotAndWalkIn(next);
    }

    this.addLog(
      'system',
      `Đã xóa nhân vật: ${existedInHall?.displayName || targetId}`,
      `ID: ${targetId} đã được xóa khỏi Đại Điện.`
    );
    this.notify();
    return true;
  }

  /**
   * Triggers simultaneous test comments across multiple users in the hall
   * (spawning new test users if the hall has fewer than `count` users).
   */
  public triggerMultiUserTestComments(count: number, customComment?: string): number {
    const targetCount = Math.max(1, Math.min(80, Math.round(count)));
    if (this.disciples.size < targetCount) {
      this.spawnDemoPlayers(targetCount - this.disciples.size);
    }

    const sampleComments = [
      'múa',
      'võ',
      'nhảy',
      'thiền',
      'đi',
      'chạy',
      'đấm',
      'đá',
      'chào',
      'đứng',
      'Giáo Chủ vạn tuế!',
      'Thiên Hạ Đệ Nhất Tà Phái!',
    ];

    const list = Array.from(this.disciples.values()).slice(0, targetCount);
    const now = Date.now();
    list.forEach((d, idx) => {
      const text =
        customComment && customComment.trim()
          ? customComment.trim()
          : sampleComments[idx % sampleComments.length];
      this.handleCommentEvent({
        id: `multi_test_${now}_${idx}`,
        type: 'comment',
        timestamp: now + idx,
        userId: d.userId,
        uniqueId: d.uniqueId,
        nickname: d.displayName,
        comment: text,
        isDemo: true,
      });
    });

    this.addLog(
      'comment',
      `Test ${list.length} User bình luận cùng lúc`,
      customComment?.trim()
        ? `Nội dung đồng loạt: "${customComment.trim()}"`
        : 'Thực hiện chuỗi bình luận & lệnh võ học đa dạng.'
    );
    this.notify();
    return list.length;
  }

  public clearAllPlayers() {
    this.disciples.clear();
    this.waitingQueue = [];
    this.promotions = [];
    this.giftHistory = [];
    this.processedGiftEventIds.clear();
    this.processedStreakTotals.clear();
    if (this.config.rankAccumulation?.mode !== 'persistent') {
      this.playerLedger.clear();
    }
    this.sectLeader.hasCustomPlayerLeader = false;
    this.sectLeader.currentLeaderName = this.config.sectLeader.title;
    this.sectLeader.currentLeaderUserId = undefined;
    this.addLog('system', 'Làm mới toàn bộ Đại Điện', 'Đã đưa danh sách đệ tử về 0.');
    this.notify();
  }

  /**
   * Resets coins and ranks of Demo/test players (or a specific userId) back to 0 xu (Dân Đen)
   * without removing the characters from the hall.
   */
  public resetDemoCoins(targetUserId?: string) {
    const baseRank = this.config.ranks[0];
    if (targetUserId) {
      const uid = targetUserId.trim();
      const d = this.disciples.get(uid) || this.waitingQueue.find(w => w.userId === uid);
      if (d) {
        d.totalCoins = 0;
        d.giftCount = 0;
        d.isCoLeader = false;
        d.isSectLeader = false;
        this.applyRankToDisciple(d, baseRank.id);
        const slot = this.sampleFreeRoamPosition({ excludeUserId: d.userId });
        d.zone = slot.zone;
        d.targetX = slot.x;
        d.targetY = slot.y;
        this.syncDiscipleToLedger(d);
      } else {
        this.playerLedger.delete(uid);
      }
      this.giftHistory = this.giftHistory.filter(g => g.userId !== uid);
      this.promotions = this.promotions.filter(p => p.userId !== uid);
      if (this.sectLeader.currentLeaderUserId === uid) {
        this.sectLeader.hasCustomPlayerLeader = false;
        this.sectLeader.currentLeaderName = this.config.sectLeader.title;
        this.sectLeader.currentLeaderUserId = undefined;
      }
      if (this.config.rankAccumulation?.mode === 'persistent') {
        this.savePersistentLedger();
      }
      this.addLog('system', `Đã đặt lại xu của ${uid} về 0`, `Cấp bậc trở về ${baseRank.name}.`);
      this.notify();
      return;
    }

    for (const d of this.disciples.values()) {
      d.totalCoins = 0;
      d.giftCount = 0;
      d.isCoLeader = false;
      d.isSectLeader = false;
      this.applyRankToDisciple(d, baseRank.id);
      const slot = this.sampleFreeRoamPosition({ excludeUserId: d.userId });
      d.zone = slot.zone;
      d.targetX = slot.x;
      d.targetY = slot.y;
    }
    this.giftHistory = [];
    this.promotions = [];
    this.playerLedger.clear();
    this.processedGiftEventIds.clear();
    this.processedStreakTotals.clear();
    this.sectLeader.hasCustomPlayerLeader = false;
    this.sectLeader.currentLeaderName = this.config.sectLeader.title;
    this.sectLeader.currentLeaderUserId = undefined;

    if (this.config.rankAccumulation?.mode === 'persistent') {
      this.savePersistentLedger();
    }

    this.addLog(
      'system',
      'Đã đặt lại toàn bộ Xu & Cấp Bậc về 0 (Dân Đen)',
      'Sẵn sàng kiểm thử các kịch bản cộng dồn xu mới.'
    );
    this.notify();
  }

  /**
   * Updates accumulation mode ('session' | 'persistent') and syncs persistent ledger.
   */
  public setAccumulationConfig(patch: Partial<RankAccumulationConfig>) {
    this.config.rankAccumulation = {
      ...(this.config.rankAccumulation || DEFAULT_RANK_ACCUMULATION_CONFIG),
      ...patch,
    };
    if (this.config.rankAccumulation.mode === 'persistent') {
      for (const d of this.disciples.values()) {
        this.syncDiscipleToLedger(d);
      }
      this.savePersistentLedger();
    }
    this.notify();
  }

  /**
   * Simulates a session/server restart while respecting the configured accumulation mode:
   * - 'session' mode: resets session coins, ranks, and history to 0.
   * - 'persistent' mode: preserves playerLedger, giftHistory, promotions, and processedEventIds across restarts.
   */
  public simulateSessionRestart() {
    if (this.config.rankAccumulation?.mode === 'persistent') {
      this.savePersistentLedger();
      this.disciples.clear();
      this.waitingQueue = [];
      this.playerLedger.clear();
      this.giftHistory = [];
      this.promotions = [];
      this.processedGiftEventIds.clear();
      this.processedStreakTotals.clear();
      this.loadPersistentLedgerIfAvailable();
      this.addLog(
        'system',
        'Khởi động lại phiên (Chế độ Đa Phiên - Persistent)',
        `Đã khôi phục dữ liệu tích lũy của ${this.playerLedger.size} tài khoản TikTok.`
      );
    } else {
      this.disciples.clear();
      this.waitingQueue = [];
      this.playerLedger.clear();
      this.giftHistory = [];
      this.promotions = [];
      this.processedGiftEventIds.clear();
      this.processedStreakTotals.clear();
      this.sectLeader.hasCustomPlayerLeader = false;
      this.sectLeader.currentLeaderName = this.config.sectLeader.title;
      this.sectLeader.currentLeaderUserId = undefined;
      this.addLog(
        'system',
        'Khởi động lại phiên (Chế độ Theo Phiên LIVE - Session)',
        'Đã đặt lại tổng xu về 0 cho phiên LIVE mới.'
      );
    }
    this.notify();
  }

  /**
   * Exports Rank Configuration + Accumulation Settings + Player Coin Ledger for backup.
   */
  public exportRankAndLedgerData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      ranks: structuredClone(this.config.ranks),
      rankAccumulation: structuredClone(this.config.rankAccumulation),
      playerLedger: Array.from(this.playerLedger.values()),
      giftHistory: structuredClone(this.giftHistory),
      promotions: structuredClone(this.promotions),
    };
  }

  /**
   * Restores Rank Configuration + Accumulation Settings + Player Coin Ledger from backup JSON.
   */
  public importRankAndLedgerData(data: Record<string, unknown>): boolean {
    if (!data || typeof data !== 'object') return false;

    if (Array.isArray(data.ranks) && data.ranks.length === 9) {
      this.config.ranks = structuredClone(data.ranks as RankTierConfig[]);
    }
    if (data.rankAccumulation && typeof data.rankAccumulation === 'object') {
      this.config.rankAccumulation = {
        ...DEFAULT_RANK_ACCUMULATION_CONFIG,
        ...(data.rankAccumulation as Partial<RankAccumulationConfig>),
      };
    }
    if (Array.isArray(data.playerLedger)) {
      this.playerLedger.clear();
      for (const item of data.playerLedger as PlayerLedgerRecord[]) {
        if (item && item.userId) {
          this.playerLedger.set(item.userId, { ...item });
        }
      }
    }
    if (Array.isArray(data.giftHistory)) {
      this.giftHistory = structuredClone(data.giftHistory as GiftHistoryEntry[]);
    }
    if (Array.isArray(data.promotions)) {
      this.promotions = structuredClone(data.promotions as PromotionAnnouncement[]);
    }

    // Apply updated ranks & ledger to active disciples in the hall
    for (const d of this.disciples.values()) {
      const rec = this.playerLedger.get(d.userId);
      if (rec) {
        d.totalCoins = rec.totalCoins;
        d.giftCount = rec.giftCount;
      }
      if (!d.isSectLeader) {
        const nextRank = this.computeRankForCoins(d.totalCoins);
        this.applyRankToDisciple(d, nextRank.id);
      }
      this.syncDiscipleToLedger(d);
    }

    if (this.config.rankAccumulation?.mode === 'persistent') {
      this.savePersistentLedger();
    }

    this.addLog(
      'system',
      'Đã khôi phục dữ liệu Cấp Bậc & Sổ Vàng Tích Lũy Xu',
      `Đã nạp ${this.config.ranks.length} cấp bậc và ${this.playerLedger.size} hồ sơ người chơi.`
    );
    this.notify();
    return true;
  }

  public resetRanksToDefault() {
    this.config.ranks = structuredClone(DEFAULT_RANKS);
    for (const d of this.disciples.values()) {
      if (!d.isSectLeader) {
        const nextRank = this.computeRankForCoins(d.totalCoins);
        this.applyRankToDisciple(d, nextRank.id);
      }
    }
    this.addLog('system', 'Đã khôi phục 9 mốc cấp bậc mặc định', '0 / 1 / 5 / 10 / 20 / 50 / 99 / 199 / Tân Giáo Chủ.');
    this.notify();
  }

  public triggerMassPlayerAnimation(anim: PlayerAnimationState) {
    const now = Date.now();
    for (const d of this.disciples.values()) {
      if (!d.isSweepingPenalty && !d.isSectLeader && d.fsmState !== 'departing_gate') {
        d.animation = anim;
        d.targetX = d.x;
        d.targetY = d.y;
        if (anim === 'meditate') {
          d.fsmState = 'free_roam_meditate';
          d.meditationPhase = 'sitting_down';
          d.direction = 'front';
        } else if (anim === 'walk' || anim === 'run') {
          const dest = this.sampleFreeRoamPosition({ excludeUserId: d.userId });
          d.targetX = dest.x;
          d.targetY = dest.y;
          d.fsmState = 'free_roam_stroll';
        } else {
          d.fsmState = 'practice_kungfu';
          d.meditationPhase = 'none';
        }
        d.actionStartedAt = now;
        d.actionDurationMs = 8000;
        d.nextDecisionAt = now + 8000;
      }
    }
    soundSynthesizer.playWarDrum(2);
    this.addLog('system', `Đồng diễn toàn giáo: ${anim}`, `Áp dụng cho ${this.disciples.size} đệ tử.`);
    this.notify();
  }

  public releaseSweepingDisciple(userId?: string) {
    const now = Date.now();
    for (const d of this.disciples.values()) {
      if (d.isSweepingPenalty && (!userId || d.userId === userId)) {
        d.isSweepingPenalty = false;
        d.fsmState = 'return_from_sweep';
        d.animation = 'celebrate';
        const coords = this.sampleFreeRoamPosition({ excludeUserId: d.userId });
        d.zone = coords.zone;
        d.targetX = coords.x;
        d.targetY = coords.y;
        d.actionStartedAt = now;
        d.actionDurationMs = 3500;
        d.nextDecisionAt = now + 3500;
      }
    }
    this.notify();
  }

  public getDiscipleCount(): number {
    return this.disciples.size;
  }

  public getWaitingQueueCount(): number {
    return this.waitingQueue.length;
  }

  public getSnapshot(): GameStateSnapshot {
    const now = Date.now();
    const allDisciples = Array.from(this.disciples.values());
    for (const d of allDisciples) {
      this.computeDiscipleStayMetrics(d, now);
    }

    const sweepingDisciples = allDisciples.filter(d => d.isSweepingPenalty).slice(0, 5);
    const elderLeaderboard = [...allDisciples]
      .filter(d => d.totalCoins > 0)
      .sort((a, b) => b.totalCoins - a.totalCoins)
      .slice(0, 4);

    // Combine active disciples and stored ledger records sorted by totalCoins descending
    const mergedLedgerMap = new Map<string, PlayerLedgerRecord>();
    for (const [uid, rec] of this.playerLedger.entries()) {
      mergedLedgerMap.set(uid, { ...rec });
    }
    for (const d of allDisciples) {
      mergedLedgerMap.set(d.userId, {
        userId: d.userId,
        uniqueId: d.uniqueId,
        displayName: d.displayName,
        totalCoins: d.totalCoins,
        giftCount: d.giftCount,
        rankId: d.rankId,
        rankName: d.rankName,
        isCoLeader: d.isCoLeader,
        isSectLeader: d.isSectLeader,
        isDemo: d.isDemo,
        updatedAt: d.lastActiveAt,
      });
    }
    const playerLedgerList = Array.from(mergedLedgerMap.values()).sort(
      (a, b) => b.totalCoins - a.totalCoins || b.updatedAt - a.updatedAt
    );

    const nextSceneCountdownSec = Math.max(
      0,
      Math.ceil((this.nextSceneSwitchAt - now) / 1000)
    );

    return {
      config: this.config,
      activeScene: this.activeScene,
      isTransitioningScene: this.isTransitioningScene,
      nextSceneCountdownSec,
      sectLeader: { ...this.sectLeader },
      disciples: allDisciples,
      waitingQueue: [...this.waitingQueue],
      sweepingDisciples,
      elderLeaderboard,
      promotions: [...this.promotions],
      giftHistory: [...this.giftHistory],
      playerLedger: playerLedgerList,
      miniGame: { ...this.miniGame },
      logs: [...this.logs],
      fps: this.fps,
    };
  }
}

export const sectGameManager = new SectGameManager();
