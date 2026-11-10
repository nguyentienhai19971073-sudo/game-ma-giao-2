// ============================================================================
// MA GIÁO ONLINE – THIÊN HẠ ĐỆ NHẤT TÀ PHÁI
// Unified TypeScript Definitions (Engine, 20-Category Admin, OBS Sync, TTS, Gifts)
// ============================================================================

export type ActiveSceneType = 'main_hall' | 'training_ground';

export type SectLeaderPersonality = 'ba_chu' | 'hai_huoc' | 'cuong_vo';

export type SectLeaderAnimationGroup = 'A' | 'B' | 'C' | 'D' | 'E';

export type SectLeaderAnimationId =
  // Group A: Throne Idle & Micro-Actions (8)
  | 'idle_throne'
  | 'cross_legs_swap'
  | 'stroke_beard'
  | 'play_jade_ring'
  | 'adjust_crown'
  | 'drink_tea'
  | 'fan_self'
  | 'rest_chin'
  // Group B: Throne Movement & Hall Patrol (8)
  | 'stand_up_throne'
  | 'sit_throne_pose'
  | 'walk_down_steps'
  | 'patrol_hall'
  | 'return_to_throne'
  | 'point_at_player'
  | 'wave_sleeve'
  | 'raise_command_token'
  // Group C: Martial Arts & Demon Techniques (8)
  | 'unleash_aura'
  | 'palm_strike'
  | 'summon_dark_dragon'
  | 'levitate_throne'
  | 'cast_dark_magic'
  | 'split_three_shadows'
  | 'shield_barrier'
  | 'sword_rain_summon'
  // Group D: Comedic & Expressive Reactions (7)
  | 'evil_laugh'
  | 'shocked_jump'
  | 'sleepy_yawn'
  | 'comical_rage'
  | 'choke_on_tea'
  | 'read_scroll'
  | 'smug_nod'
  // Group E: Ceremony, Mini-Game & Throne Transfer (4)
  | 'promote_disciple'
  | 'start_minigame'
  | 'punish_sweep'
  | 'salute_coleader'
  | 'throne_handover'
  | 'victory_fanfare'
  | 'praise_disciple'
  | 'gift_small_react';

export type SectLeaderExpression =
  | 'arrogant'
  | 'evil_grin'
  | 'shocked'
  | 'sleepy'
  | 'bored'
  | 'angry_comical'
  | 'proud'
  | 'laughing';

export interface SectLeaderAnimationDef {
  id: SectLeaderAnimationId;
  name: string;
  group: SectLeaderAnimationGroup;
  durationMs: number;
  expression: SectLeaderExpression;
  description: string;
  loop?: boolean;
}

export interface SectLeaderConfig {
  name: string;
  title: string;
  formerLeaderTitle: string;
  personality: SectLeaderPersonality;
  scale: number;
  thronePosition: { x: number; y: number };
  autoIdleEnabled: boolean;
  idleActionIntervalRangeSec: [number, number];
  patrolEnabled: boolean;
}

export interface SectLeaderRuntimeState {
  currentLeaderName: string;
  formerLeaderName: string;
  currentLeaderUserId?: string;
  hasCustomPlayerLeader: boolean;
  currentAnimation: SectLeaderAnimationId;
  animationStartedAt: number;
  animationDurationMs: number;
  expression: SectLeaderExpression;
  isSpeaking: boolean;
  mouthOpenness: number;
  currentSpeechText?: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: DiscipleDirection;
  personality: SectLeaderPersonality;
}

// ============================================================================
// 80 DISCIPLES & 15+ PLAYER ANIMATIONS (4 DIRECTIONAL VIEWS)
// ============================================================================

export type DiscipleDirection = 'rear' | 'front' | 'left' | 'right';

export type PlayerAnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'bow'
  | 'punch'
  | 'kick'
  | 'combo_kungfu'
  | 'jump'
  | 'dodge'
  | 'meditate'
  | 'stand_up'
  | 'clap'
  | 'celebrate'
  | 'stagger'
  | 'depart'
  | 'sweep_floor'
  | 'cast_seal';

export type DiscipleFSMState =
  | 'gate_entry'
  | 'walk_in_hall'
  | 'bow_sect_leader'
  | 'free_roam_stroll'
  | 'free_roam_cross_aisle'
  | 'free_roam_kungfu'
  | 'free_roam_meditate'
  | 'free_roam_jump'
  | 'free_roam_social'
  | 'idle_hall'
  | 'patrol_hall'
  | 'running_command'
  | 'practice_kungfu'
  | 'meditate_corner'
  | 'minigame_active'
  | 'sweeping_penalty'
  | 'return_from_sweep';

export type HallZoneId =
  | 'throne_zone'
  | 'co_leader_dais'
  | 'central_aisle'
  | 'left_disciple_wing'
  | 'right_disciple_wing'
  | 'meditation_area'
  | 'martial_practice_area'
  | 'sweeping_courtyard'
  | 'entry_gate';

export interface ZoneRect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  label: string;
}

// ============================================================================
// 9 SECT RANKS & TIKTOK GIFT REGISTRY
// ============================================================================

export type RankTierId =
  | 'dan_den'
  | 'ngoai_mon_do_de'
  | 'noi_mon_de_tu'
  | 'su_huynh_su_ty'
  | 'tinh_anh_de_tu'
  | 'ho_phap_ma_giao'
  | 'dai_truong_lao'
  | 'dong_ton_giao_chu'
  | 'tan_giao_chu';

export interface RankTierConfig {
  id: RankTierId;
  name: string;
  minCoins: number;
  isThroneRank?: boolean;
  supremeGiftIds?: number[];
  primaryColor: string;
  secondaryColor: string;
  auraColor: string;
  scaleMultiplier: number;
  costumeDescription: string;
  hallPrivilege: string;
}

export interface SectDisciple {
  userId: string;
  uniqueId: string;
  displayName: string;
  compactName: string; // Max 5 chars below feet
  avatarUrl?: string;
  gender: 'nam' | 'nu';
  rankId: RankTierId;
  rankName: string;
  totalCoins: number;
  commentCount: number;
  giftCount: number;
  likeCount: number;
  joinedAt: number;
  lastActiveAt: number;
  lastCommandAt: number;
  lastComment?: string;
  commentBubbleExpiresAt?: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: DiscipleDirection;
  fsmState: DiscipleFSMState;
  animation: PlayerAnimationState;
  zone: HallZoneId;
  isSweepingPenalty: boolean;
  isCoLeader: boolean;
  isSectLeader: boolean;
  isDemo: boolean;
  scale: number;
  auraColor: string;
  primaryColor: string;
  secondaryColor: string;
  // Lifecycle & realistic animation timing fields
  actionStartedAt?: number;
  actionDurationMs?: number;
  nextDecisionAt?: number;
  stepPhase?: number;
  meditationPhase?: 'none' | 'sitting_down' | 'seated' | 'standing_up';
  spectateTargetId?: string;
}

export interface GiftMappingConfig {
  id: string;
  giftIds: number[];
  giftId?: number;
  giftName: string;
  coinValue: number;
  rankGranted?: RankTierId;
  inGameEffect: string;
  visualAura: string;
  soundEffect: 'gong' | 'drum' | 'sword' | 'bell' | 'thunder' | 'fanfare';
  priorityLevel: number;
  grantsThrone: boolean;
  grantsCoLeader: boolean;
  icon: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GiftMappingInput {
  giftIds?: number[];
  giftId?: number;
  giftName: string;
  coinValue: number;
  rankGranted?: RankTierId;
  inGameEffect?: string;
  visualAura?: string;
  soundEffect?: GiftMappingConfig['soundEffect'];
  priorityLevel?: number;
  grantsThrone?: boolean;
  grantsCoLeader?: boolean;
  icon?: string;
  enabled?: boolean;
}

export interface UnknownGiftLog {
  id: string;
  timestamp: number;
  giftId?: number;
  giftName: string;
  senderName: string;
  repeatCount: number;
  diamondCount?: number;
}

export interface PromotionAnnouncement {
  id: string;
  timestamp: number;
  userId: string;
  displayName: string;
  oldRankName: string;
  newRankId: RankTierId;
  newRankName: string;
  giftName: string;
  coinValue: number;
  isThroneTakeover: boolean;
  isCoLeader: boolean;
}

export type AccumulationMode = 'session' | 'persistent';

export interface RankAccumulationConfig {
  enabled: boolean;
  mode: AccumulationMode;
  preventDuplicateEvents: boolean;
  singlePromotionPerEvent: boolean;
}

export interface GiftHistoryEntry {
  id: string;
  eventId: string;
  timestamp: number;
  userId: string;
  uniqueId: string;
  displayName: string;
  giftId?: number;
  giftName: string;
  repeatCount: number;
  addedCoins: number;
  totalCoinsBefore: number;
  totalCoinsAfter: number;
  oldRankId: RankTierId;
  oldRankName: string;
  newRankId: RankTierId;
  newRankName: string;
  promoted: boolean;
  isThroneTakeover: boolean;
  isDemo?: boolean;
}

export interface PlayerLedgerRecord {
  userId: string;
  uniqueId: string;
  displayName: string;
  totalCoins: number;
  giftCount: number;
  rankId: RankTierId;
  rankName: string;
  isCoLeader: boolean;
  isSectLeader: boolean;
  isDemo: boolean;
  updatedAt: number;
}

// ============================================================================
// 10 COMMENT COMMANDS & BUBBLE SETTINGS
// ============================================================================

export interface CommentCommandConfig {
  id: string;
  label: string;
  keywords: string[];
  animation: PlayerAnimationState;
  cooldownMs: number;
  enabled: boolean;
  description: string;
}

export interface CommentSystemSettings {
  showCommentBubble: boolean;
  bubbleDurationMs: number;
  maxBubbleChars: number;
  maxConcurrentBubbles: number;
  globalUserCooldownMs: number;
  bubbleBgColor: string;
  bubbleBorderColor: string;
  bubbleTextColor: string;
}

// ============================================================================
// 400+ DIALOGUE BANK
// ============================================================================

export type DialogueCategory =
  | 'silly_evil_boast'
  | 'welcome_new'
  | 'promotion'
  | 'disciple_interact'
  | 'minigame_host'
  | 'minigame_win'
  | 'minigame_lose'
  | 'elder_coleader'
  | 'quiet_hall'
  | 'throne_transfer';

export interface DialogueLineConfig {
  id: string;
  category: DialogueCategory;
  text: string;
  personality: SectLeaderPersonality | 'all';
  linkedAnimation?: SectLeaderAnimationId;
  enabled: boolean;
}

// ============================================================================
// VOICE & TTS SYSTEM (AZURE SPEECH NAM MINH / HOÀI MY + VIENEU + LIP-SYNC)
// ============================================================================

export type VoiceProviderType =
  | 'azure_speech'
  | 'vieneu_local'
  | 'vieneu'
  | 'gemini_tts'
  | 'elevenlabs'
  | 'openai'
  | 'web_speech';

export type VoicePriorityTier =
  | 'throne_transfer'
  | 'high_gift'
  | 'minigame'
  | 'promotion'
  | 'welcome'
  | 'boast_idle';

export interface VoiceOption {
  id: string;
  name: string;
  provider: VoiceProviderType;
  lang: string;
  gender: 'male' | 'female';
  description: string;
}

export interface VoiceQueueItem {
  id: string;
  text: string;
  priority: VoicePriorityTier;
  priorityScore: number;
  category: string;
  createdAt: number;
  animationId?: SectLeaderAnimationId;
}

export interface VoiceSystemConfig {
  enabled: boolean;
  isMuted: boolean;
  provider: VoiceProviderType;
  voiceId: string;
  speed: number;
  pitch: number;
  volume: number;
  sfxVolume: number;
  ambientVolume: number;
  autoFallbackToWebSpeech: boolean;
  maxQueueLength: number;
  cooldownBetweenLinesMs: number;
  vieneuLocalUrl?: string;
}

// ============================================================================
// 3 RANDOM MINI-GAMES & 150-180s SCENE TRANSITION
// ============================================================================

export type MiniGameId = 'ma_quyen_loan_vu' | 'ma_anh_than_phap' | 'tam_khi_ma_tran';

export type ElementType = 'LUA' | 'BANG' | 'GIO';

export interface MiniGameConfig {
  id: MiniGameId;
  name: string;
  subtitle: string;
  durationSec: number;
  winThresholdPct: number;
  keywords: string[];
  rulesText: string;
  enabled: boolean;
}

export interface MiniGameActiveState {
  isActive: boolean;
  gameId: MiniGameId | null;
  title: string;
  phase: 'intro' | 'playing' | 'result';
  currentRound: number;
  totalRounds: number;
  remainingSec: number;
  startedAt: number;
  participantUserIds: string[];
  completedUserIds: string[];
  failedUserIds: string[];
  completionPct: number;
  winThresholdPct: number;
  currentObstacleDirection?: 'TRAI' | 'PHAI' | 'NHAY';
  leaderElement?: ElementType;
  expectedCounterCommand?: ElementType;
  isVictory?: boolean;
  sweepingPenaltyNames: string[];
}

export interface SceneTransitionConfig {
  autoCycleEnabled: boolean;
  isPaused: boolean;
  cycleIntervalRangeSec: [number, number];
  transitionEffect: 'ink_wash' | 'dark_mist' | 'crimson_flash' | 'scroll_wipe';
  maxSweepingDisciples: number;
}

// ============================================================================
// SCENE, PLAYER ANIMATION, NOTICE PANELS & OVERLAY CONFIG
// ============================================================================

export interface SceneConfig {
  maxConcurrentPlayers: number;
  playerBaseScale: number;
  sectLeaderScale: number;
  mistIntensity: number;
  lightingWarmth: number;
  dragonPillars: boolean;
  redLanterns: boolean;
  sectBanners: boolean;
  freeRoamEnabled: boolean;
  showDebugZones: boolean;
  freeRoamBounds: ZoneRect;
  throneReservedZone: ZoneRect;
  zones: Record<HallZoneId, ZoneRect>;
}

export interface PlayerAnimationConfig {
  activeRatioTarget: number; // 0.30 (20-30%+ active simultaneously)
  maxConcurrentMovers: number; // e.g., 28 out of 80 moving/practicing simultaneously
  walkSpeedMultiplier: number;
  runSpeedMultiplier: number;
  minSeparationDist: number; // Minimum distance (%) between disciples to prevent overlap
  decisionIntervalRangeSec: [number, number]; // How often a disciple picks a new autonomous action
  strollWeight: number; // % weight for walking/crossing aisle
  kungfuWeight: number; // % weight for punching/kicking/combo/jump
  meditateWeight: number; // % weight for meditating
  greetLeaderWeight: number; // % weight for walking up to bow to Sect Leader
  socialWeight: number; // % weight for spectating/clapping/resting
  idleTimeoutSec: number;
}

export type NoticePanelId =
  | 'gift_rank_table'
  | 'elder_leaderboard'
  | 'promotion_banner'
  | 'throne_transfer_banner'
  | 'minigame_hud'
  | 'minigame_result'
  | 'sweeping_list'
  | 'sect_leader_speech';

export interface NoticePanelConfig {
  id: NoticePanelId;
  title: string;
  enabled: boolean;
  position: string;
  durationMs: number;
  priority: number;
}

export interface OverlayConfig {
  hudScale: number;
  avatarScale: number;
  sectLeaderScale: number;
  nameplateScale: number;
  bubbleScale: number;
  showHeaderBanner: boolean;
  showElderLeaderboard: boolean;
  showGiftRankTable: boolean;
  showMiniGameHUD: boolean;
  showSweepingPenaltyPanel: boolean;
  showSectLeaderSpeechBubble: boolean;
  clearDemoOnLiveConnect: boolean;
  customCss: string;
}

export interface MaGiaoMasterConfig {
  sectLeader: SectLeaderConfig;
  sectLeaderAnimations: SectLeaderAnimationDef[];
  ranks: RankTierConfig[];
  rankAccumulation: RankAccumulationConfig;
  giftMappings: GiftMappingConfig[];
  commentCommands: CommentCommandConfig[];
  commentSettings: CommentSystemSettings;
  dialogues: DialogueLineConfig[];
  voiceConfig: VoiceSystemConfig;
  sceneConfig: SceneConfig;
  playerAnimationConfig: PlayerAnimationConfig;
  miniGames: MiniGameConfig[];
  sceneTransition: SceneTransitionConfig;
  noticePanels: NoticePanelConfig[];
  overlayConfig: OverlayConfig;
  updatedAt: number;
}

export interface OBSSyncSettings {
  overlayConfig: OverlayConfig;
  sceneConfig: SceneConfig;
  voiceConfig: VoiceSystemConfig;
  sectLeaderConfig: SectLeaderConfig;
  updatedAt: number;
}

// ============================================================================
// TIKTOK LIVE CONNECTOR & DIAGNOSTICS
// ============================================================================

export interface LiveConnectionStatus {
  mode: 'demo' | 'tiktok_live';
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  uniqueId?: string;
  roomId?: string;
  viewerCount: number;
  eventCount: number;
  connectedAt?: number;
  lastEventAt?: number;
  errorMessage?: string;
}

export interface TikTokLiveEvent {
  id: string;
  type: 'comment' | 'gift' | 'like' | 'join';
  timestamp: number;
  userId: string;
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  comment?: string;
  giftId?: number;
  giftName?: string;
  giftCount?: number;
  coinValue?: number;
  unitCoinValue?: number;
  groupId?: string;
  giftType?: number;
  repeatEnd?: boolean;
  likeCount?: number;
  isDemo?: boolean;
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  type: 'system' | 'comment' | 'gift' | 'promotion' | 'minigame' | 'tts' | 'scene' | 'leader';
  level: 'info' | 'warn' | 'error';
  title: string;
  detail: string;
}

// ============================================================================
// 20 ADMIN CATEGORIES
// ============================================================================

export type AdminCategoryId =
  | 'overview'
  | 'live_control'
  | 'sect_leader'
  | 'leader_animations'
  | 'disciples'
  | 'ranks'
  | 'tiktok_gifts'
  | 'comments'
  | 'dialogues'
  | 'voice_tts'
  | 'hall_background'
  | 'player_animations'
  | 'minigames'
  | 'scene_transition'
  | 'notices_leaderboard'
  | 'layout_css'
  | 'obs_broadcast'
  | 'demo_testing'
  | 'backend_api'
  | 'logs_diagnostics';

export interface AdminCategoryDef {
  id: AdminCategoryId;
  shortLabel: string;
  label: string;
  icon: string;
}

export const ADMIN_CATEGORIES: AdminCategoryDef[] = [
  { id: 'overview', shortLabel: '1. Tổng quan', label: '1. Tổng quan hệ thống', icon: '📊' },
  { id: 'live_control', shortLabel: '2. TikTok LIVE', label: '2. Điều khiển LIVE', icon: '📡' },
  { id: 'sect_leader', shortLabel: '3. Giáo Chủ', label: '3. Quản lý Giáo Chủ', icon: '👑' },
  { id: 'leader_animations', shortLabel: '4. 35 Hoạt ảnh GC', label: '4. Hoạt ảnh Giáo Chủ (35)', icon: '🎬' },
  { id: 'disciples', shortLabel: '5. Đồ Đệ (80)', label: '5. Quản lý Đồ Đệ', icon: '🧘' },
  { id: 'ranks', shortLabel: '6. 9 Cấp bậc', label: '6. Hệ thống Cấp bậc', icon: '🎖️' },
  { id: 'tiktok_gifts', shortLabel: '7. Quà TikTok', label: '7. Quản lý Quà TikTok', icon: '🎁' },
  { id: 'comments', shortLabel: '8. 10 Lệnh Chat', label: '8. Quản lý Bình luận', icon: '💬' },
  { id: 'dialogues', shortLabel: '9. 400+ Lời thoại', label: '9. Lời thoại Giáo Chủ', icon: '📜' },
  { id: 'voice_tts', shortLabel: '10. Giọng đọc TTS', label: '10. Giọng đọc & TTS', icon: '🔊' },
  { id: 'hall_background', shortLabel: '11. Đại điện', label: '11. Đại điện & Background', icon: '🏛️' },
  { id: 'player_animations', shortLabel: '12. Hoạt ảnh Đệ tử', label: '12. Hoạt ảnh Nhân vật', icon: '🥋' },
  { id: 'minigames', shortLabel: '13. 3 Mini Game', label: '13. Mini Game Luyện Võ', icon: '⚔️' },
  { id: 'scene_transition', shortLabel: '14. Chuyển cảnh', label: '14. Chuyển cảnh (150-180s)', icon: '🌄' },
  { id: 'notices_leaderboard', shortLabel: '15. Bảng thông báo', label: '15. Thông báo & Bảng xếp hạng', icon: '🏆' },
  { id: 'layout_css', shortLabel: '16. Layout & CSS', label: '16. Layout & CSS 9:16', icon: '🎨' },
  { id: 'obs_broadcast', shortLabel: '17. OBS (?obs=1)', label: '17. OBS & Phát sóng', icon: '🎥' },
  { id: 'demo_testing', shortLabel: '18. Demo & Tải', label: '18. Demo & Kiểm thử', icon: '🧪' },
  { id: 'backend_api', shortLabel: '19. Backend & API', label: '19. Cấu hình Backend & API', icon: '⚙️' },
  { id: 'logs_diagnostics', shortLabel: '20. Nhật ký', label: '20. Nhật ký & Chẩn đoán', icon: '📋' },
];
