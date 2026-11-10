import {
  CommentCommandConfig,
  CommentSystemSettings,
  DialogueLineConfig,
  DietMonConfig,
  DiscipleStayDurationConfig,
  GiftMappingConfig,
  MaGiaoMasterConfig,
  MiniGameConfig,
  NoticePanelConfig,
  OverlayConfig,
  PlayerAnimationConfig,
  RankAccumulationConfig,
  RankTierConfig,
  SceneConfig,
  SceneTransitionConfig,
  SectLeaderAnimationDef,
  SectLeaderConfig,
  VoiceSystemConfig,
} from '../types/magiao';

export const DEFAULT_SECT_LEADER_CONFIG: SectLeaderConfig = {
  name: 'Dạ Thiên Minh',
  title: 'Giáo Chủ Dạ Thiên Minh',
  formerLeaderTitle: 'Thái Thượng Giáo Chủ',
  personality: 'hai_huoc',
  scale: 1.45,
  // Hạ ngai Giáo Chủ xuống 30px trên màn hình dọc 9:16 (540x960): 19% + (30/960)*100% = 22.13%
  thronePosition: { x: 50, y: 22.13 },
  autoIdleEnabled: true,
  idleActionIntervalRangeSec: [15, 35],
  patrolEnabled: true,
};

// ============================================================================
// ALL 35 SECT LEADER ANIMATIONS ACROSS 5 GROUPS (A, B, C, D, E)
// ============================================================================
export const DEFAULT_SECT_LEADER_ANIMATIONS: SectLeaderAnimationDef[] = [
  // Group A: Throne Idle & Micro-Actions (8)
  {
    id: 'idle_throne',
    name: 'Uy Nghiêm Tọa Ngai',
    group: 'A',
    durationMs: 4000,
    expression: 'arrogant',
    description: 'Ngồi uy nghiêm trên ngai Hắc Kim, tà áo khẽ bay theo nội lực.',
    loop: true,
  },
  {
    id: 'cross_legs_swap',
    name: 'Đổi Chân Bắt Chéo Bá Chủ',
    group: 'A',
    durationMs: 3200,
    expression: 'arrogant',
    description: 'Đổi tư thế gác chân trên ngai rồng đầy ngạo nghễ.',
  },
  {
    id: 'stroke_beard',
    name: 'Vuốt Cằm Trầm Tư',
    group: 'A',
    durationMs: 3600,
    expression: 'proud',
    description: 'Vuốt cằm suy tính kế hoạch thống lĩnh võ lâm.',
  },
  {
    id: 'adjust_crown',
    name: 'Chỉnh Mũ Cửu Long Quán',
    group: 'A',
    durationMs: 3000,
    expression: 'proud',
    description: 'Đưa tay chỉnh lại mũ miện Hắc Kim cho thật chuẩn soái ca.',
  },
  {
    id: 'drink_tea',
    name: 'Thưởng Trà Bích Loa Xuân',
    group: 'A',
    durationMs: 4200,
    expression: 'proud',
    description: 'Nâng chén trà sứ trắng thổi nhẹ rồi nhấp một ngụm.',
  },
  {
    id: 'fan_self',
    name: 'Phe Phẩy Quạt Hắc Kim',
    group: 'A',
    durationMs: 3800,
    expression: 'arrogant',
    description: 'Bung chiếc quạt xếp Hắc Kim phe phẩy phong lưu.',
  },
  {
    id: 'rest_chin',
    name: 'Chống Cằm Ngắm Giang Sơn',
    group: 'A',
    durationMs: 4000,
    expression: 'bored',
    description: 'Tựa tay lên thành ngai rồng chống cằm nhìn xuống đại sảnh.',
  },

  // Group B: Throne Movement & Hall Patrol (8)
  {
    id: 'stand_up_throne',
    name: 'Đứng Phắt Dậy Khỏi Ngai',
    group: 'B',
    durationMs: 3000,
    expression: 'arrogant',
    description: 'Đứng dậy khỏi ngai vàng, áo choàng tung bay.',
  },
  {
    id: 'sit_throne_pose',
    name: 'Phất Áo An Tọa Ngai Vàng',
    group: 'B',
    durationMs: 3200,
    expression: 'proud',
    description: 'Xoay người phất tà áo ngồi xuống ngai rồng.',
  },
  {
    id: 'walk_down_steps',
    name: 'Bước Xuống Thềm Đại Điện',
    group: 'B',
    durationMs: 4200,
    expression: 'arrogant',
    description: 'Chắp tay sau lưng bước xuống bậc thềm ngai vàng.',
  },
  {
    id: 'patrol_hall',
    name: 'Tuần Tra Duyệt Binh',
    group: 'B',
    durationMs: 5000,
    expression: 'proud',
    description: 'Đi dạo kiểm tra đội hình 80 đệ tử đang luyện công.',
  },
  {
    id: 'return_to_throne',
    name: 'Phi Thân Về Lại Ngai Rồng',
    group: 'B',
    durationMs: 3500,
    expression: 'arrogant',
    description: 'Thi triển khinh công lướt nhẹ về lại ngai chính.',
  },
  {
    id: 'point_at_player',
    name: 'Chỉ Tay Điểm Danh Đồ Đệ',
    group: 'B',
    durationMs: 3200,
    expression: 'proud',
    description: 'Chỉ tay xuống sảnh gọi tên đệ tử mới nhập môn.',
  },
  {
    id: 'wave_sleeve',
    name: 'Phất Tay Áo Kình Phong',
    group: 'B',
    durationMs: 3000,
    expression: 'arrogant',
    description: 'Vung tay áo tạo luồng gió cuốn bay bụi trần.',
  },
  {
    id: 'raise_command_token',
    name: 'Giơ Cao Thánh Hỏa Lệnh',
    group: 'B',
    durationMs: 3800,
    expression: 'proud',
    description: 'Giơ cao lệnh bài chí tôn hiệu triệu toàn bộ giáo chúng.',
  },

  // Group C: Martial Arts & Demon Techniques (8)
  {
    id: 'unleash_aura',
    name: 'Bùng Nổ Thiên Ma Bá Khí',
    group: 'C',
    durationMs: 4200,
    expression: 'evil_grin',
    description: 'Phóng thích luồng ma khí đỏ tím rực sáng quanh ngai vàng.',
  },
  {
    id: 'palm_strike',
    name: 'Thiên Ma Đoạt Mệnh Chưởng',
    group: 'C',
    durationMs: 3600,
    expression: 'angry_comical',
    description: 'Tung chưởng lực khổng lồ màu đỏ thẫm về phía trước.',
  },
  {
    id: 'summon_dark_dragon',
    name: 'Triệu Hồi Hắc Kim Ma Long',
    group: 'C',
    durationMs: 5000,
    expression: 'evil_grin',
    description: 'Triệu hồi rồng năng lượng Hắc Kim uốn lượn quanh đại điện.',
  },
  {
    id: 'levitate_throne',
    name: 'Lăng Không Hư Độ Trên Ngai',
    group: 'C',
    durationMs: 4500,
    expression: 'arrogant',
    description: 'Lơ lửng giữa không trung phía trên ngai rồng cùng tia chớp tím.',
  },
  {
    id: 'cast_dark_magic',
    name: 'Khai Mở Tam Khí Ma Trận',
    group: 'C',
    durationMs: 4200,
    expression: 'evil_grin',
    description: 'Kết ấn triệu hồi vòng trận pháp Lửa – Băng – Gió.',
  },
  {
    id: 'split_three_shadows',
    name: 'Phân Thân Tam Ảnh Ma Công',
    group: 'C',
    durationMs: 4600,
    expression: 'evil_grin',
    description: 'Tách ra làm 3 bóng phân thân cùng thi triển tuyệt kỹ.',
  },
  {
    id: 'shield_barrier',
    name: 'Hộ Thể Kim Chung Ma Khiên',
    group: 'C',
    durationMs: 3800,
    expression: 'proud',
    description: 'Dựng màn chắn kim quang bất khả xâm phạm quanh ngai vàng.',
  },
  {
    id: 'sword_rain_summon',
    name: 'Vạn Kiếm Quy Tông Ma Vũ',
    group: 'C',
    durationMs: 4400,
    expression: 'evil_grin',
    description: 'Triệu hồi mưa kiếm ánh sáng lao xuống trấn áp quần hùng.',
  },

  // Group D: Comedic & Expressive Reactions (7)
  {
    id: 'evil_laugh',
    name: 'Cuồng Tiếu Phản Diện Đắc Ý',
    group: 'D',
    durationMs: 4000,
    expression: 'laughing',
    description: 'Ngửa cổ cười ha hả cực kỳ sảng khoái sau khi khoe tội ác ngớ ngẩn.',
  },
  {
    id: 'shocked_jump',
    name: 'Giật Mình Rớt Cả Phong Độ',
    group: 'D',
    durationMs: 3200,
    expression: 'shocked',
    description: 'Giật bắn người ngạc nhiên khi thấy đệ tử tặng quà lớn.',
  },
  {
    id: 'sleepy_yawn',
    name: 'Thiên Ma Ngáp Dài Buồn Ngủ',
    group: 'D',
    durationMs: 4000,
    expression: 'sleepy',
    description: 'Che miệng ngáp dài khi đại điện yên ắng.',
  },
  {
    id: 'comical_rage',
    name: 'Nổi Giận Dậm Chân Đáng Yêu',
    group: 'D',
    durationMs: 3600,
    expression: 'angry_comical',
    description: 'Bốc khói trên đầu dậm chân hài hước khi đệ tử lười tập.',
  },
  {
    id: 'choke_on_tea',
    name: 'Sặc Trà Sữa Trân Châu',
    group: 'D',
    durationMs: 3400,
    expression: 'shocked',
    description: 'Đang uống trà ra vẻ ngầu thì bị sặc ho khụ khụ.',
  },
  {
    id: 'read_scroll',
    name: 'Đọc Mật Thư Ngược Đầu',
    group: 'D',
    durationMs: 4000,
    expression: 'proud',
    description: 'Mở cuộn thánh chỉ vàng ra đọc chăm chú.',
  },
  {
    id: 'smug_nod',
    name: 'Gật Gù Tự Khen Mình Đẹp',
    group: 'D',
    durationMs: 3200,
    expression: 'proud',
    description: 'Gật đầu liên tục tự thưởng thức nhan sắc của bản thân.',
  },

  // Group E: Ceremony, Mini-Game & Throne Transfer (8 total with aliases = 35 canonical)
  {
    id: 'promote_disciple',
    name: 'Sắc Phong Cấp Bậc Đồ Đệ',
    group: 'E',
    durationMs: 4200,
    expression: 'proud',
    description: 'Ban kim quang thăng chức và đổi y phục mới cho đệ tử.',
  },
  {
    id: 'start_minigame',
    name: 'Gióng Trống Khai Mở Sát Hạch',
    group: 'E',
    durationMs: 4000,
    expression: 'evil_grin',
    description: 'Ra hiệu lệnh chuyển toàn giáo sang Sân Luyện Võ thi tài.',
  },
  {
    id: 'punish_sweep',
    name: 'Phán Phạt Cầm Chổi Quét Sân',
    group: 'E',
    durationMs: 4000,
    expression: 'laughing',
    description: 'Chỉ tay trao chổi tre cho 5 đệ tử chưa hoàn thành mini game.',
  },
  {
    id: 'salute_coleader',
    name: 'Chào Đón Đồng Tôn Giáo Chủ',
    group: 'E',
    durationMs: 4200,
    expression: 'proud',
    description: 'Nâng chén chúc mừng Đồng Tôn (99 X) an tọa đài bên.',
  },
  {
    id: 'throne_handover',
    name: 'Đại Lễ Nhường Ngai Chí Tôn',
    group: 'E',
    durationMs: 5500,
    expression: 'shocked',
    description: 'Trao ngai vàng cho Tân Giáo Chủ và lui về làm Thái Thượng Giáo Chủ.',
  },
];

// ============================================================================
// 8 OFFICIAL SECT RANKS (0 -> 1 -> 5 -> 10 -> 20 -> 50 -> 99 -> 199 X)
// + 1.000 X ĐẠI SỰ KIỆN DIỆT MÔN (GIỮ CẤP GIÁO CHỦ)
// ============================================================================
export const DEFAULT_RANKS: RankTierConfig[] = [
  {
    id: 'dan_den',
    name: 'Dân Đen',
    minCoins: 0,
    primaryColor: '#4B5563',
    secondaryColor: '#9CA3AF',
    auraColor: 'transparent',
    scaleMultiplier: 0.92,
    costumeDescription: 'Áo vải thô sơ mới bước qua cổng núi',
    hallPrivilege: 'Sinh hoạt tự do hai bên cánh sảnh và lối đi chính giữa',
  },
  {
    id: 'de_tu',
    name: 'Đệ Tử',
    minCoins: 1,
    primaryColor: '#2E1065',
    secondaryColor: '#A855F7',
    auraColor: 'rgba(168, 85, 247, 0.30)',
    scaleMultiplier: 0.96,
    costumeDescription: 'Áo Ma Giáo Đệ Tử kèm làn khói tím nhẹ dưới chân',
    hallPrivilege: 'GIA NHẬP MA GIÁO – ĐỆ TỬ (Giáo Chủ giơ tay nhận lễ)',
  },
  {
    id: 'chan_truyen',
    name: 'Chân Truyền',
    minCoins: 5,
    primaryColor: '#3B0764',
    secondaryColor: '#C084FC',
    auraColor: 'rgba(192, 132, 252, 0.42)',
    scaleMultiplier: 1.01,
    costumeDescription: 'Y phục Chân Truyền cao cấp + Vòng Ma Ấn phát sáng dưới chân',
    hallPrivilege: 'Ma Ấn dưới chân & luồng khí tím xoay quanh người',
  },
  {
    id: 'tinh_anh',
    name: 'Tinh Anh',
    minCoins: 10,
    primaryColor: '#4C0519',
    secondaryColor: '#F43F5E',
    auraColor: 'rgba(244, 63, 94, 0.50)',
    scaleMultiplier: 1.06,
    costumeDescription: 'Chiến y Tinh Anh + Hào quang tím đỏ & tia năng lượng xoay quanh',
    hallPrivilege: 'Thi triển động tác vận nội công khi thăng cấp',
  },
  {
    id: 'ho_phap',
    name: 'Hộ Pháp',
    minCoins: 20,
    primaryColor: '#581C87',
    secondaryColor: '#E11D48',
    auraColor: 'rgba(225, 29, 72, 0.62)',
    scaleMultiplier: 1.14,
    costumeDescription: 'Giáp Hộ Pháp Võ Phục + Khí ma đỏ sẫm & vòng năng lượng bùng nổ',
    hallPrivilege: 'Trống trận vang rền – Giáo Chủ đứng dậy tuyên bố Hộ Pháp',
  },
  {
    id: 'truong_lao',
    name: 'Trưởng Lão',
    minCoins: 50,
    primaryColor: '#7F1D1D',
    secondaryColor: '#FBBF24',
    auraColor: 'rgba(251, 191, 36, 0.76)',
    scaleMultiplier: 1.22,
    costumeDescription: 'Long Bào Trưởng Lão + Cột sáng vàng tím giáng xuống',
    hallPrivilege: 'Bước lên khu vực phong chức trước ngai & Vinh danh Bảng Trưởng Lão',
  },
  {
    id: 'dong_ton',
    name: 'Đồng Tôn',
    minCoins: 99,
    isCoLeaderRank: true,
    primaryColor: '#3B0764',
    secondaryColor: '#FDE047',
    auraColor: 'rgba(253, 224, 71, 0.88)',
    scaleMultiplier: 1.32,
    costumeDescription: 'Hoàng Bào Đồng Tôn + Vòng Ma Ấn đặc biệt & danh hiệu ĐỒNG TÔN',
    hallPrivilege: 'An tọa Ghế Phụ / Đài Danh Dự bên cạnh Ngai Giáo Chủ',
  },
  {
    id: 'giao_chu',
    name: 'Giáo Chủ',
    minCoins: 199,
    isThroneRank: true,
    supremeGiftIds: [29201, 8913, 9999, 29900, 30001],
    primaryColor: '#111827',
    secondaryColor: '#F59E0B',
    auraColor: 'rgba(239, 68, 68, 0.96)',
    scaleMultiplier: 1.45,
    costumeDescription: 'Cửu Long Hắc Kim Hoàng Bào Giáo Chủ Chí Tôn',
    hallPrivilege: 'Đăng Cơ Ngai Chính – Giáo Chủ cũ lui về làm Thái Thượng Giáo Chủ',
  },
];

export const DEFAULT_RANK_ACCUMULATION_CONFIG: RankAccumulationConfig = {
  enabled: true,
  mode: 'session',
  preventDuplicateEvents: true,
  singlePromotionPerEvent: true,
};

export const DEFAULT_DIET_MON_CONFIG: DietMonConfig = {
  enabled: true,
  coinThreshold: 1000,
  durationSec: 15,
  shakeIntensity: 1.0,
  enableCollapseEffect: true,
  showCenterAvatar: true,
  avatarScale: 1.0,
  enableVortexEffect: true,
  suctionSpeed: 1.0,
  enableSoundAndTts: true,
  enableRebuildEffect: true,
  commentHandlingDuringEvent: 'queue_after',
  maxQueueSize: 3,
};

// ============================================================================
// DEFAULT TIKTOK GIFT MAPPINGS & PRESETS
// ============================================================================
export const DEFAULT_MAGIAO_GIFT_MAPPINGS: GiftMappingConfig[] = [
  {
    id: 'gift_tier_1',
    groupName: 'NHÓM 1 X',
    giftIds: [5655, 5656],
    giftIdStrings: ['5655', '5656'],
    giftItems: {
      '5655': { giftId: '5655', giftName: 'Ma Ấn Nhập Môn', enabled: true },
      '5656': { giftId: '5656', giftName: 'Hương Trầm Nhập Môn', enabled: true },
    },
    giftId: 5655,
    giftName: 'Ma Ấn Nhập Môn',
    coinValue: 1,
    rankGranted: 'de_tu',
    inGameEffect: 'GIA NHẬP MA GIÁO – ĐỆ TỬ + Khói tím dưới chân',
    visualAura: '#A855F7',
    soundEffect: 'bell',
    priorityLevel: 2,
    grantsThrone: false,
    grantsCoLeader: false,
    icon: '🜂',
    enabled: true,
  },
  {
    id: 'gift_tier_5',
    groupName: 'NHÓM 5 X',
    giftIds: [5658, 5269],
    giftIdStrings: ['5658', '5269'],
    giftItems: {
      '5658': { giftId: '5658', giftName: 'Lệnh Bài Chân Truyền', enabled: true },
      '5269': { giftId: '5269', giftName: 'Chén Trà Chân Truyền', enabled: true },
    },
    giftId: 5658,
    giftName: 'Lệnh Bài Chân Truyền',
    coinValue: 5,
    rankGranted: 'chan_truyen',
    inGameEffect: 'Thăng cấp Chân Truyền + Vòng Ma Ấn phát sáng dưới chân',
    visualAura: '#C084FC',
    soundEffect: 'bell',
    priorityLevel: 3,
    grantsThrone: false,
    grantsCoLeader: false,
    icon: '🜁',
    enabled: true,
  },
  {
    id: 'gift_tier_10',
    groupName: 'NHÓM 10 X',
    giftIds: [8910, 6064],
    giftIdStrings: ['8910', '6064'],
    giftItems: {
      '8910': { giftId: '8910', giftName: 'Huyết Ngọc Tinh Anh', enabled: true },
      '6064': { giftId: '6064', giftName: 'Bội Kiếm Tinh Anh', enabled: true },
    },
    giftId: 8910,
    giftName: 'Huyết Ngọc Tinh Anh',
    coinValue: 10,
    rankGranted: 'tinh_anh',
    inGameEffect: 'Thăng cấp Tinh Anh + Vận nội công & tia năng lượng tím đỏ',
    visualAura: '#F43F5E',
    soundEffect: 'gong',
    priorityLevel: 4,
    grantsThrone: false,
    grantsCoLeader: false,
    icon: '🜂',
    enabled: true,
  },
  {
    id: 'gift_tier_20',
    groupName: 'NHÓM 20 X',
    giftIds: [5999, 5487],
    giftIdStrings: ['5999', '5487'],
    giftItems: {
      '5999': { giftId: '5999', giftName: 'Chiến Giáp Hộ Pháp', enabled: true },
      '5487': { giftId: '5487', giftName: 'Lệnh Kỳ Hộ Pháp', enabled: true },
    },
    giftId: 5999,
    giftName: 'Chiến Giáp Hộ Pháp',
    coinValue: 20,
    rankGranted: 'ho_phap',
    inGameEffect: 'Thăng cấp Hộ Pháp + Khí ma đỏ sẫm & trống trận vang rền',
    visualAura: '#E11D48',
    soundEffect: 'drum',
    priorityLevel: 5,
    grantsThrone: false,
    grantsCoLeader: false,
    icon: '🜃',
    enabled: true,
  },
  {
    id: 'gift_tier_50',
    groupName: 'NHÓM 50 X',
    giftIds: [6093, 6104],
    giftIdStrings: ['6093', '6104'],
    giftItems: {
      '6093': { giftId: '6093', giftName: 'Kim Ấn Trưởng Lão', enabled: true },
      '6104': { giftId: '6104', giftName: 'Long Trượng Trưởng Lão', enabled: true },
    },
    giftId: 6093,
    giftName: 'Kim Ấn Trưởng Lão',
    coinValue: 50,
    rankGranted: 'truong_lao',
    inGameEffect: 'Thăng cấp Trưởng Lão + Cột sáng vàng tím trước ngai Giáo Chủ',
    visualAura: '#FBBF24',
    soundEffect: 'thunder',
    priorityLevel: 7,
    grantsThrone: false,
    grantsCoLeader: false,
    icon: '🜄',
    enabled: true,
  },
  {
    id: 'gift_tier_99',
    groupName: 'NHÓM 99 X',
    giftIds: [5827, 5659],
    giftIdStrings: ['5827', '5659'],
    giftItems: {
      '5827': { giftId: '5827', giftName: 'Bí Kíp Thiên Ma Đồng Tôn', enabled: true },
      '5659': { giftId: '5659', giftName: 'Tử Kim Ấn Đồng Tôn', enabled: true },
    },
    giftId: 5827,
    giftName: 'Bí Kíp Thiên Ma Đồng Tôn',
    coinValue: 99,
    rankGranted: 'dong_ton',
    inGameEffect: 'Phong chức Đồng Tôn + An tọa Đài Danh Dự cạnh Ngai Giáo Chủ',
    visualAura: '#FDE047',
    soundEffect: 'fanfare',
    priorityLevel: 8,
    grantsThrone: false,
    grantsCoLeader: true,
    icon: '⚜️',
    enabled: true,
  },
  {
    id: 'gift_tier_199',
    groupName: 'NHÓM 199 X',
    giftIds: [29201, 8913],
    giftIdStrings: ['29201', '8913'],
    giftItems: {
      '29201': { giftId: '29201', giftName: 'Thánh Hỏa Lệnh Giáo Chủ', enabled: true },
      '8913': { giftId: '8913', giftName: 'Cửu Long Ngọc Tỷ Giáo Chủ', enabled: true },
    },
    giftId: 29201,
    giftName: 'Thánh Hỏa Lệnh Giáo Chủ',
    coinValue: 199,
    rankGranted: 'giao_chu',
    inGameEffect: 'Đăng Cơ Giáo Chủ! Giáo Chủ hiện tại nhường ngai chính & làm Thái Thượng Giáo Chủ!',
    visualAura: '#F59E0B',
    soundEffect: 'fanfare',
    priorityLevel: 9,
    grantsThrone: true,
    grantsCoLeader: false,
    icon: '👑',
    enabled: true,
  },
  {
    id: 'gift_tier_supreme',
    groupName: 'NHÓM 1.000 X',
    giftIds: [9999, 29900, 30001],
    giftIdStrings: ['9999', '29900', '30001'],
    giftItems: {
      '9999': { giftId: '9999', giftName: 'Ma Giáo Đại Kiếp – Diệt Môn Lệnh', enabled: true },
      '29900': { giftId: '29900', giftName: 'Hắc Long Diệt Thế Ấn', enabled: true },
      '30001': { giftId: '30001', giftName: 'Thiên Ma Vô Thượng Lệnh', enabled: true },
    },
    giftId: 9999,
    giftName: 'Ma Giáo Đại Kiếp – Diệt Môn Lệnh',
    coinValue: 1000,
    rankGranted: 'giao_chu',
    inGameEffect: 'ĐẠI SỰ KIỆN DIỆT MÔN 1.000 X! Sập đại điện, vòng xoáy hút toàn bộ người chơi & tái thiết sảnh!',
    visualAura: '#EF4444',
    soundEffect: 'fanfare',
    priorityLevel: 10,
    grantsThrone: true,
    grantsCoLeader: false,
    icon: '🌀',
    enabled: true,
  },
];

export const DEFAULT_MAGIAO_GIFT_PRESETS = [
  { name: 'Ma Ấn Nhập Môn (1 X -> Đệ Tử)', giftIds: [5655], coinValue: 1, rankGranted: 'de_tu' },
  { name: 'Lệnh Bài Chân Truyền (5 X -> Chân Truyền)', giftIds: [5658], coinValue: 5, rankGranted: 'chan_truyen' },
  { name: 'Huyết Ngọc Tinh Anh (10 X -> Tinh Anh)', giftIds: [8910], coinValue: 10, rankGranted: 'tinh_anh' },
  { name: 'Chiến Giáp Hộ Pháp (20 X -> Hộ Pháp)', giftIds: [5999], coinValue: 20, rankGranted: 'ho_phap' },
  { name: 'Kim Ấn Trưởng Lão (50 X -> Trưởng Lão)', giftIds: [6093], coinValue: 50, rankGranted: 'truong_lao' },
  { name: 'Thiên Ma Đồng Tôn (99 X -> Đồng Tôn)', giftIds: [5827], coinValue: 99, rankGranted: 'dong_ton' },
  { name: 'Thánh Hỏa Lệnh (199 X -> Giáo Chủ)', giftIds: [29201], coinValue: 199, rankGranted: 'giao_chu' },
  { name: 'Diệt Môn Lệnh (1.000 X -> Đại Sự Kiện DIỆT MÔN)', giftIds: [9999], coinValue: 1000, rankGranted: 'giao_chu' },
];

// ============================================================================
// 10 COMMENT COMMANDS
// ============================================================================
export const DEFAULT_COMMENT_COMMANDS: CommentCommandConfig[] = [
  {
    id: 'cmd_di',
    label: 'Đi Dạo Đại Điện',
    keywords: ['đi', 'di', 'dạo'],
    animation: 'walk',
    cooldownMs: 2000,
    enabled: true,
    description: 'Nhân vật đi bộ tuần tra sang vị trí mới trong sảnh',
  },
  {
    id: 'cmd_chay',
    label: 'Chạy Nhanh Khinh Công',
    keywords: ['chạy', 'chay', 'phi'],
    animation: 'run',
    cooldownMs: 2000,
    enabled: true,
    description: 'Nhân vật chạy nước rút dọc đại điện',
  },
  {
    id: 'cmd_vo',
    label: 'Luyện Võ Công',
    keywords: ['võ', 'vo', 'tập võ'],
    animation: 'combo_kungfu',
    cooldownMs: 2000,
    enabled: true,
    description: 'Thi triển bài quyền Ma Giáo liên hoàn',
  },
  {
    id: 'cmd_mua',
    label: 'Múa Quyền Liên Hoàn',
    keywords: ['múa', 'mua', 'múa võ'],
    animation: 'combo_kungfu',
    cooldownMs: 2000,
    enabled: true,
    description: 'Múa võ liên hoàn & tính điểm hoàn thành trong Mini Game 1',
  },
  {
    id: 'cmd_dam',
    label: 'Tung Cú Đấm',
    keywords: ['đấm', 'dam', 'chưởng'],
    animation: 'punch',
    cooldownMs: 2000,
    enabled: true,
    description: 'Tung Thiết Quyền về phía trước',
  },
  {
    id: 'cmd_da',
    label: 'Tung Cú Đá Xoay',
    keywords: ['đá', 'da', 'cước'],
    animation: 'kick',
    cooldownMs: 2000,
    enabled: true,
    description: 'Tung Liên Hoàn Cước',
  },
  {
    id: 'cmd_nhay',
    label: 'Bật Nhảy Khinh Công',
    keywords: ['nhảy', 'nhay', 'bay'],
    animation: 'jump',
    cooldownMs: 2000,
    enabled: true,
    description: 'Bật nhảy cao lên không trung',
  },
  {
    id: 'cmd_thien',
    label: 'Ngồi Thiền Tĩnh Tâm',
    keywords: ['thiền', 'thien', 'ngồi thiền'],
    animation: 'meditate',
    cooldownMs: 2000,
    enabled: true,
    description: 'Di chuyển về góc Tĩnh Tâm Đài ngồi xếp bằng vận công',
  },
  {
    id: 'cmd_dung',
    label: 'Đứng Dậy Nghiêm Trang',
    keywords: ['đứng', 'dung', 'đứng dậy'],
    animation: 'stand_up',
    cooldownMs: 2000,
    enabled: true,
    description: 'Đứng dậy từ tư thế ngồi thiền và nhìn về Ngai Vàng',
  },
  {
    id: 'cmd_chao',
    label: 'Cúi Chào Giáo Chủ',
    keywords: ['chào', 'chao', 'bái kiến', 'hành lễ'],
    animation: 'bow',
    cooldownMs: 2000,
    enabled: true,
    description: 'Chắp tay cúi chào Giáo Chủ trên Ngai Vàng',
  },
];

export const DEFAULT_COMMENT_SETTINGS: CommentSystemSettings = {
  showCommentBubble: true,
  bubbleDurationMs: 5500,
  maxBubbleChars: 64,
  maxConcurrentBubbles: 12,
  globalUserCooldownMs: 2000,
  bubbleBgColor: 'rgba(14, 10, 22, 0.92)',
  bubbleBorderColor: '#D4AF37',
  bubbleTextColor: '#FEF08A',
};

// ============================================================================
// 3 RANDOM MINI-GAMES & SCENE TRANSITION
// ============================================================================
export const DEFAULT_MINI_GAMES: MiniGameConfig[] = [
  {
    id: 'ma_quyen_loan_vu',
    name: 'Ma Quyền Loạn Vũ',
    subtitle: 'Đồng Diễn Tuyệt Kỹ Ma Quyền',
    durationSec: 30,
    winThresholdPct: 60,
    keywords: ['MÚA', 'MUA'],
    rulesText:
      'Mỗi đệ tử chỉ cần bình luận từ khóa "MÚA" đúng 1 lần trong lượt. Nếu đạt từ 60% đệ tử hoàn thành trở lên, toàn đội đại thắng!',
    enabled: true,
  },
  {
    id: 'ma_anh_than_phap',
    name: 'Ma Ảnh Thân Pháp',
    subtitle: 'Phản Xạ Né Chướng Ngại Vật 3 Hiệp',
    durationSec: 30,
    winThresholdPct: 60,
    keywords: ['TRÁI', 'PHẢI', 'NHẢY'],
    rulesText:
      'Trải qua 3 hiệp liên tiếp, nhìn hướng chướng ngại vật trên Sân Luyện Võ và bình luận TRÁI, PHẢI hoặc NHẢY để né đòn!',
    enabled: true,
  },
  {
    id: 'tam_khi_ma_tran',
    name: 'Tam Khí Ma Trận',
    subtitle: 'Ngũ Hành Khắc Chế Lửa – Băng – Gió',
    durationSec: 30,
    winThresholdPct: 60,
    keywords: ['LỬA', 'BĂNG', 'GIÓ'],
    rulesText:
      'Giáo Chủ tung chưởng LỬA, BĂNG hoặc GIÓ qua 3 hiệp. Hãy bình luận nguyên tố khắc chế: LỬA thắng BĂNG, BĂNG thắng GIÓ, GIÓ thắng LỬA!',
    enabled: true,
  },
];

export const DEFAULT_SCENE_TRANSITION: SceneTransitionConfig = {
  autoCycleEnabled: true,
  isPaused: false,
  cycleIntervalRangeSec: [150, 180],
  transitionEffect: 'ink_wash',
  maxSweepingDisciples: 5,
};

// ============================================================================
// VOICE, SCENE, OVERLAY & NOTICE PANELS
// ============================================================================
export const DEFAULT_VOICE_CONFIG: VoiceSystemConfig = {
  enabled: true,
  isMuted: false,
  provider: 'azure_speech',
  voiceId: 'vi-VN-NamMinhNeural',
  speed: 1.05,
  pitch: 1.0,
  volume: 0.9,
  sfxVolume: 0.55,
  ambientVolume: 0.25,
  autoFallbackToWebSpeech: true,
  maxQueueLength: 15,
  cooldownBetweenLinesMs: 1200,
  vieneuLocalUrl: 'http://127.0.0.1:8000',
};

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  maxConcurrentPlayers: 80,
  playerBaseScale: 1.0,
  sectLeaderScale: 1.45,
  mistIntensity: 0.55,
  lightingWarmth: 0.7,
  dragonPillars: true,
  redLanterns: true,
  sectBanners: true,
  freeRoamEnabled: true,
  showDebugZones: false,
  freeRoamBounds: {
    xMin: 10,
    xMax: 90,
    yMin: 33.5,
    yMax: 90,
    label: 'Vùng Sinh Hoạt Tự Do Toàn Đại Điện (FreeRoamArea)',
  },
  throneReservedZone: {
    xMin: 28,
    xMax: 72,
    yMin: 13.1,
    yMax: 32.6,
    label: 'Vùng Bảo Vệ Ngai Vàng Giáo Chủ',
  },
  zones: {
    throne_zone: { xMin: 40, xMax: 60, yMin: 18.1, yMax: 27.1, label: 'Ngai Vàng Chính Điện' },
    co_leader_dais: { xMin: 72, xMax: 88, yMin: 22.1, yMax: 29.1, label: 'Đài Đồng Tôn (99 X)' },
    central_aisle: { xMin: 30, xMax: 70, yMin: 33.5, yMax: 90, label: 'Lối Đi Chính Giữa Đại Điện (Trung Tâm)' },
    left_disciple_wing: { xMin: 10, xMax: 42, yMin: 33.5, yMax: 88, label: 'Không Gian Cánh Tả & Trung Tâm' },
    right_disciple_wing: { xMin: 58, xMax: 90, yMin: 33.5, yMax: 88, label: 'Không Gian Cánh Hữu & Trung Tâm' },
    meditation_area: { xMin: 14, xMax: 86, yMin: 35, yMax: 88, label: 'Không Gian Thiền Định Tự Do' },
    martial_practice_area: { xMin: 14, xMax: 86, yMin: 34, yMax: 88, label: 'Không Gian Luyện Võ Giữa Sảnh' },
    // Nâng khu vực Quét Sân lên 25px trên màn hình dọc 9:16 (540x960): -(25/960)*100% = -2.6% (88..95 -> 85.4..92.4)
    sweeping_courtyard: { xMin: 73, xMax: 94, yMin: 85.4, yMax: 92.4, label: 'Góc Phạt Quét Sân' },
    entry_gate: { xMin: 40, xMax: 60, yMin: 92, yMax: 97, label: 'Cổng Sơn Trang Ma Giáo' },
  },
};

export const DEFAULT_PLAYER_ANIMATION_CONFIG: PlayerAnimationConfig = {
  activeRatioTarget: 0.32,
  maxConcurrentMovers: 28,
  walkSpeedMultiplier: 1.0,
  runSpeedMultiplier: 1.45,
  minSeparationDist: 4.8,
  decisionIntervalRangeSec: [3, 8],
  strollWeight: 32,
  kungfuWeight: 28,
  meditateWeight: 16,
  greetLeaderWeight: 10,
  socialWeight: 14,
  idleTimeoutSec: 420,
};

export const DEFAULT_STAY_DURATION_CONFIG: DiscipleStayDurationConfig = {
  inactivityTimeoutMinutes: 7,
  inactivityTimeoutSec: 420,
  autoDepartEnabled: true,
  walkToGateOnDepart: true,
  departAnimationDurationSec: 4,
  warningBeforeDepartEnabled: true,
  warningBeforeDepartSec: 30,
  applyMode: 'immediate',
  isTestShortTimeout: false,
};

export function sanitizeStayDurationConfig(
  raw?: Partial<DiscipleStayDurationConfig>,
  current: DiscipleStayDurationConfig = DEFAULT_STAY_DURATION_CONFIG
): DiscipleStayDurationConfig {
  const base = { ...DEFAULT_STAY_DURATION_CONFIG, ...current };
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  let isTestShortTimeout =
    raw.isTestShortTimeout !== undefined ? Boolean(raw.isTestShortTimeout) : Boolean(base.isTestShortTimeout);

  let inactivityTimeoutMinutes = base.inactivityTimeoutMinutes;
  let inactivityTimeoutSec = base.inactivityTimeoutSec;

  const hasExplicitSec =
    typeof raw.inactivityTimeoutSec === 'number' && Number.isFinite(raw.inactivityTimeoutSec);
  const hasExplicitMin =
    typeof raw.inactivityTimeoutMinutes === 'number' && Number.isFinite(raw.inactivityTimeoutMinutes);

  if (hasExplicitSec && (raw.inactivityTimeoutSec! < 60 || raw.isTestShortTimeout)) {
    inactivityTimeoutSec = Math.max(2, Math.min(1800, Math.round(raw.inactivityTimeoutSec!)));
    inactivityTimeoutMinutes = Math.max(1, Math.min(30, Math.round(inactivityTimeoutSec / 60) || 1));
    isTestShortTimeout = inactivityTimeoutSec < 60;
  } else if (hasExplicitMin && (!hasExplicitSec || raw.inactivityTimeoutSec === raw.inactivityTimeoutMinutes! * 60)) {
    inactivityTimeoutMinutes = Math.max(1, Math.min(30, Math.round(raw.inactivityTimeoutMinutes!)));
    inactivityTimeoutSec = inactivityTimeoutMinutes * 60;
    isTestShortTimeout = false;
  } else if (hasExplicitSec) {
    const mins = Math.max(1, Math.min(30, Math.round(raw.inactivityTimeoutSec! / 60)));
    inactivityTimeoutMinutes = mins;
    inactivityTimeoutSec = mins * 60;
    isTestShortTimeout = false;
  }

  const departAnimationDurationSec =
    typeof raw.departAnimationDurationSec === 'number' && Number.isFinite(raw.departAnimationDurationSec)
      ? Math.max(1, Math.min(15, Math.round(raw.departAnimationDurationSec)))
      : base.departAnimationDurationSec;

  const warningBeforeDepartSec =
    typeof raw.warningBeforeDepartSec === 'number' && Number.isFinite(raw.warningBeforeDepartSec)
      ? Math.max(1, Math.min(300, Math.round(raw.warningBeforeDepartSec)))
      : base.warningBeforeDepartSec;

  const applyMode =
    raw.applyMode === 'new_only' || raw.applyMode === 'immediate' ? raw.applyMode : base.applyMode;

  return {
    inactivityTimeoutMinutes,
    inactivityTimeoutSec,
    autoDepartEnabled:
      raw.autoDepartEnabled !== undefined ? Boolean(raw.autoDepartEnabled) : base.autoDepartEnabled,
    walkToGateOnDepart:
      raw.walkToGateOnDepart !== undefined ? Boolean(raw.walkToGateOnDepart) : base.walkToGateOnDepart,
    departAnimationDurationSec,
    warningBeforeDepartEnabled:
      raw.warningBeforeDepartEnabled !== undefined
        ? Boolean(raw.warningBeforeDepartEnabled)
        : base.warningBeforeDepartEnabled,
    warningBeforeDepartSec,
    applyMode,
    isTestShortTimeout,
  };
}

export const DEFAULT_NOTICE_PANELS: NoticePanelConfig[] = [
  { id: 'gift_rank_table', title: '1. Bảng Phong Ấn & Cấp Bậc Ma Giáo', enabled: true, position: 'top-right', durationMs: 0, priority: 5 },
  { id: 'elder_leaderboard', title: '2. Bảng Vàng 4 Đại Trưởng Lão', enabled: true, position: 'top-left', durationMs: 0, priority: 6 },
  { id: 'promotion_banner', title: '3. Thông Báo Sắc Phong Cấp Bậc', enabled: true, position: 'center-bottom', durationMs: 4000, priority: 8 },
  { id: 'throne_transfer_banner', title: '4. Đại Lễ Đăng Cơ Tân Giáo Chủ', enabled: true, position: 'center-bottom', durationMs: 4000, priority: 10 },
  { id: 'minigame_hud', title: '5. Bảng Điều Hành Mini Game Luyện Võ', enabled: true, position: 'center-bottom', durationMs: 0, priority: 9 },
  { id: 'minigame_result', title: '6. Bảng Kết Quả Thắng/Thua Mini Game', enabled: true, position: 'center-bottom', durationMs: 4000, priority: 9 },
  { id: 'sweeping_list', title: '7. Danh Sách 5 Đệ Tử Đang Quét Sân', enabled: true, position: 'bottom-right', durationMs: 0, priority: 7 },
  { id: 'sect_leader_speech', title: '8. Thánh Chỉ Lời Phán Giáo Chủ', enabled: true, position: 'top-center', durationMs: 4000, priority: 8 },
];

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  hudScale: 1.0,
  avatarScale: 1.0,
  sectLeaderScale: 1.0,
  nameplateScale: 1.0,
  bubbleScale: 1.0,
  panelBgOpacity: 0.4,
  popupDurationMs: 4000,
  popupFadeOutMs: 700,
  autoHidePopups: true,
  showHeaderBanner: true,
  showElderLeaderboard: true,
  showGiftRankTable: true,
  showMiniGameHUD: true,
  showSweepingPenaltyPanel: true,
  showSectLeaderSpeechBubble: true,
  clearDemoOnLiveConnect: true,
  customCss: '/* Custom CSS cho khung 9:16 Ma Giáo Online */',
};

export function createDefaultMasterConfig(dialogues: DialogueLineConfig[] = []): MaGiaoMasterConfig {
  return {
    sectLeader: structuredClone(DEFAULT_SECT_LEADER_CONFIG),
    sectLeaderAnimations: structuredClone(DEFAULT_SECT_LEADER_ANIMATIONS),
    ranks: structuredClone(DEFAULT_RANKS),
    rankAccumulation: structuredClone(DEFAULT_RANK_ACCUMULATION_CONFIG),
    dietMonConfig: structuredClone(DEFAULT_DIET_MON_CONFIG),
    giftMappings: structuredClone(DEFAULT_MAGIAO_GIFT_MAPPINGS),
    commentCommands: structuredClone(DEFAULT_COMMENT_COMMANDS),
    commentSettings: structuredClone(DEFAULT_COMMENT_SETTINGS),
    dialogues: structuredClone(dialogues),
    voiceConfig: structuredClone(DEFAULT_VOICE_CONFIG),
    sceneConfig: structuredClone(DEFAULT_SCENE_CONFIG),
    playerAnimationConfig: structuredClone(DEFAULT_PLAYER_ANIMATION_CONFIG),
    stayDurationConfig: structuredClone(DEFAULT_STAY_DURATION_CONFIG),
    miniGames: structuredClone(DEFAULT_MINI_GAMES),
    sceneTransition: structuredClone(DEFAULT_SCENE_TRANSITION),
    noticePanels: structuredClone(DEFAULT_NOTICE_PANELS),
    overlayConfig: structuredClone(DEFAULT_OVERLAY_CONFIG),
    updatedAt: Date.now(),
  };
}

export const CHUA_TO_MAGIAO_PARITY_TABLE = [
  {
    chuaOnlineModule: 'TikTokLiveAdapter (server/tiktokAdapter.ts)',
    maGiaoEquivalent: 'TikTokLiveAdapter + Gift Streak Delta Deduplication',
    status: 'Kế thừa & Nâng cấp',
    notes: 'Chống nhân đôi chuỗi quà (streak), lọc bình luận rác, chuẩn hóa tên tiếng Việt.',
  },
  {
    chuaOnlineModule: 'PersistentGiftStore (server/giftStore.ts)',
    maGiaoEquivalent: 'PersistentGiftStore (Multi-ID + 9 Cấp Bậc Ma Giáo)',
    status: 'Kế thừa & Nâng cấp',
    notes: 'Hỗ trợ gán nhiều Gift ID cho 1 mốc quà, phát hiện trùng ID, lưu quà lạ, Import/Export JSON.',
  },
  {
    chuaOnlineModule: 'TTS Proxy (server/ttsProxy.ts & VoiceManager)',
    maGiaoEquivalent: 'Microsoft Azure Speech (Nam Minh / Hoài My) + VieNeu + Lip-Sync',
    status: 'Kế thừa & Nâng cấp',
    notes: 'Hàng đợi 6 tầng ưu tiên + tính toán độ mở miệng (Viseme Lip-Sync) thời gian thực cho Giáo Chủ.',
  },
  {
    chuaOnlineModule: 'PersistentOBSSyncStore (server/obsSyncStore.ts)',
    maGiaoEquivalent: 'PersistentOBSSyncStore + MasterConfigStore (20 Tab Admin)',
    status: 'Kế thừa & Nâng cấp',
    notes: 'Lưu trữ nguyên tử ra đĩa và đồng bộ trực tiếp sang ?obs=1 qua Socket.IO.',
  },
  {
    chuaOnlineModule: 'LabelCollisionManager & formatCompactPlayerName',
    maGiaoEquivalent: 'LabelCollisionManager (Tên 5 ký tự dưới chân + Bong bóng trên đầu)',
    status: 'Kế thừa & Nâng cấp',
    notes: 'Hiển thị tối đa 80 nhân vật không đè chữ, bảo vệ vùng Ngai Vàng Giáo Chủ.',
  },
  {
    chuaOnlineModule: 'TINH TAM ONLINE.app & TINH_TAM_ONLINE.exe',
    maGiaoEquivalent: 'MA GIAO ONLINE.app & MA_GIAO_ONLINE.exe + Launcher 3388',
    status: 'Kế thừa & Nâng cấp',
    notes: 'Bộ khởi động một chạm cho cả macOS và Windows kèm giao diện điều khiển nhanh.',
  },
];
