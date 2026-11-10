import React, { useState, useEffect } from 'react';
import {
  ADMIN_CATEGORIES,
  AdminCategoryId,
  BulkGiftIdCheckResult,
  DialogueCategory,
  DiscipleStayDurationConfig,
  LiveConnectionStatus,
  MaGiaoMasterConfig,
  MiniGameId,
  PlayerAnimationState,
  RankTierId,
  SectDisciple,
  SectLeaderAnimationGroup,
  SectLeaderAnimationId,
  SectLeaderPersonality,
  TikTokLiveEvent,
  VoiceProviderType,
} from '../../types/magiao';
import {
  CHUA_TO_MAGIAO_PARITY_TABLE,
  DEFAULT_STAY_DURATION_CONFIG,
  sanitizeStayDurationConfig,
} from '../../data/sectDefaults';
import { DIALOGUE_CATEGORY_LABELS } from '../../data/sectDialogueBank';
import { GameStateSnapshot, sectGameManager } from '../../systems/SectGameManager';
import { liveConnectionManager } from '../../systems/LiveConnectionManager';
import { giftRegistry } from '../../systems/GiftRegistry';
import { voiceManager, VoiceStateSnapshot } from '../../systems/VoiceManager';
import { soundSynthesizer } from '../../systems/SoundSynthesizer';
import { MaGiaoRankEmblemSVG } from '../ui/MaGiaoOverlayHUD';

interface AdminControlCenterProps {
  snapshot: GameStateSnapshot;
  liveStatus: LiveConnectionStatus;
  selectedDiscipleId: string | null;
  onSelectDiscipleId: (id: string | null) => void;
  fullPageMode?: boolean;
}

export const AdminControlCenter: React.FC<AdminControlCenterProps> = ({
  snapshot,
  liveStatus,
  selectedDiscipleId,
  onSelectDiscipleId,
  fullPageMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<AdminCategoryId>('overview');
  const [tabSearch, setTabSearch] = useState('');
  const [tiktokInput, setTiktokInput] = useState(liveStatus.uniqueId || '');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [voiceSnap, setVoiceSnap] = useState<VoiceStateSnapshot>(() => voiceManager.getSnapshot());

  // Tab-specific local state
  const [animGroupFilter, setAnimGroupFilter] = useState<SectLeaderAnimationGroup | 'ALL'>('ALL');
  const [discipleSearch, setDiscipleSearch] = useState('');
  const [dialogueCategoryFilter, setDialogueCategoryFilter] = useState<DialogueCategory | 'ALL'>('ALL');
  const [dialogueSearch, setDialogueSearch] = useState('');
  const [newDialogueText, setNewDialogueText] = useState('');
  const [newDialogueCat, setNewDialogueCat] = useState<DialogueCategory>('silly_evil_boast');
  const [logFilter, setLogFilter] = useState<string>('ALL');

  // Gift form & Bulk Gift ID Management state
  const [giftNameInput, setGiftNameInput] = useState('');
  const [giftIdsInput, setGiftIdsInput] = useState('');
  const [giftCoinsInput, setGiftCoinsInput] = useState(10);
  const [giftRankInput, setGiftRankInput] = useState<RankTierId>('tinh_anh');
  const [giftGrantsThrone, setGiftGrantsThrone] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);

  // Bulk Gift ID Import state (Section VI)
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>('gift_tier_1');
  const [bulkRawInput, setBulkRawInput] = useState<string>('');
  const [bulkDefaultGiftName, setBulkDefaultGiftName] = useState<string>('');
  const [bulkOverwriteConflicts, setBulkOverwriteConflicts] = useState<boolean>(false);
  const [bulkCheckPreview, setBulkCheckPreview] = useState<BulkGiftIdCheckResult | null>(null);

  // Gift Management Table state (Section VII)
  const [giftTableValueFilter, setGiftTableValueFilter] = useState<number | 'ALL'>('ALL');
  const [giftTableSearch, setGiftTableSearch] = useState<string>('');
  const [editingGiftIdKey, setEditingGiftIdKey] = useState<string | null>(null);
  const [editingGiftNameDraft, setEditingGiftNameDraft] = useState<string>('');
  const [movingGiftIdKey, setMovingGiftIdKey] = useState<string | null>(null);
  const [movingTargetGroupId, setMovingTargetGroupId] = useState<string>('gift_tier_5');
  const [giftImportText, setGiftImportText] = useState<string>('');
  const [showGiftImportBox, setShowGiftImportBox] = useState<boolean>(false);
  const [, setGiftRegistryVersion] = useState<number>(0);

  // Per-group Textarea & Metadata state for Section 1: QUẢN LÝ ID QUÀ TIKTOK
  const [groupBulkTextareas, setGroupBulkTextareas] = useState<Record<string, string>>({});
  const [groupBulkFeedback, setGroupBulkFeedback] = useState<
    Record<string, { type: 'ok' | 'err'; text: string }>
  >({});
  const [editingGroupMetaId, setEditingGroupMetaId] = useState<string | null>(null);
  const [groupCoinValueDraft, setGroupCoinValueDraft] = useState<number>(1);
  const [groupAdminGiftNameDraft, setGroupAdminGiftNameDraft] = useState<string>('');
  const [singleAddGroupDrafts, setSingleAddGroupDrafts] = useState<
    Record<string, { giftId: string; giftName: string }>
  >({});

  // Section 2: CHỈNH SỬA BẢNG PHONG ẤN state
  const [editingPhongAnRowId, setEditingPhongAnRowId] = useState<string | null>(null);
  const [phongAnDraftCoins, setPhongAnDraftCoins] = useState<number>(1);
  const [phongAnDraftName, setPhongAnDraftName] = useState<string>('');
  const [phongAnDraftOrder, setPhongAnDraftOrder] = useState<number>(10);
  const [phongAnDraftEnabled, setPhongAnDraftEnabled] = useState<boolean>(true);
  const [newPhongAnRankCoins, setNewPhongAnRankCoins] = useState<number>(30);
  const [newPhongAnRankName, setNewPhongAnRankName] = useState<string>('');
  const [showAddPhongAnRankBox, setShowAddPhongAnRankBox] = useState<boolean>(false);

  // Diệt Môn 1.000 X Test state
  const [dietMonTestName, setDietMonTestName] = useState('Độc Cô Bá Chủ');
  const [dietMonTestAvatar, setDietMonTestAvatar] = useState('');

  // Runtime TTS Credentials state
  const [azureKeyInput, setAzureKeyInput] = useState('');
  const [azureRegionInput, setAzureRegionInput] = useState('southeastasia');
  const [vieneuLocalInput, setVieneuLocalInput] = useState(
    snapshot.config.voiceConfig.vieneuLocalUrl || 'http://127.0.0.1:8000'
  );

  // TikTok Comment & Simulated User Tester state (Tab 18)
  const [testUserId, setTestUserId] = useState('test_user_01');
  const [testDisplayName, setTestDisplayName] = useState('Lệnh Hồ Xung');
  const [testCommentText, setTestCommentText] = useState('Xin bái kiến Giáo Chủ!');
  const [testUserCounter, setTestUserCounter] = useState(2);

  // Rank & Cumulative Coin Ledger state (Tab 6 & Tab 7)
  const [ledgerSearchId, setLedgerSearchId] = useState('');
  const [rankBackupJsonInput, setRankBackupJsonInput] = useState('');
  const [showBackupImportBox, setShowBackupImportBox] = useState(false);

  // Player Stay Duration Config state (Tab 5: Quản Lý Đồ Đệ → Thời Gian Hoạt Động)
  const [stayDraft, setStayDraft] = useState<DiscipleStayDurationConfig>(() =>
    sanitizeStayDurationConfig(snapshot.config.stayDurationConfig || DEFAULT_STAY_DURATION_CONFIG)
  );
  const [staySaveStatus, setStaySaveStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (snapshot.config.stayDurationConfig) {
      setStayDraft(sanitizeStayDurationConfig(snapshot.config.stayDurationConfig));
    }
  }, [snapshot.config.stayDurationConfig]);

  useEffect(() => {
    return voiceManager.subscribe(setVoiceSnap);
  }, []);

  useEffect(() => {
    return giftRegistry.subscribe(() => setGiftRegistryVersion(v => v + 1));
  }, []);

  const {
    config,
    disciples,
    waitingQueue,
    sweepingDisciples,
    promotions,
    giftHistory,
    playerLedger,
    miniGame,
    dietMon,
    logs,
  } = snapshot;

  const notifySync = (msg: string) => {
    setSyncMessage(msg);
    window.setTimeout(() => setSyncMessage(null), 3000);
  };

  const formatCountdownMMSS = (sec: number | undefined) => {
    const safeSec = Math.max(0, Math.round(sec ?? 0));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (${safeSec}s)`;
  };

  const handleSaveStayConfig = async (customPatch?: Partial<DiscipleStayDurationConfig>) => {
    const nextRaw = { ...stayDraft, ...(customPatch || {}) };
    if (
      customPatch?.inactivityTimeoutMinutes === undefined &&
      customPatch?.inactivityTimeoutSec === undefined
    ) {
      nextRaw.inactivityTimeoutSec = Math.round((nextRaw.inactivityTimeoutMinutes || 7) * 60);
    }
    const sanitized = sectGameManager.setStayDurationConfig(nextRaw);
    setStayDraft(sanitized);
    liveConnectionManager.emitAdminCommand({
      action: 'update_stay_config',
      stayDurationConfig: sanitized,
    });
    const res = await liveConnectionManager.pushStayDurationConfig(sanitized);
    if (res.ok) {
      const msg = `✓ Đã lưu cài đặt Thời Gian Hoạt Động (${sanitized.inactivityTimeoutMinutes} phút = ${sanitized.inactivityTimeoutSec}s) & đồng bộ OBS!`;
      setStaySaveStatus({ type: 'success', text: msg });
      notifySync(msg);
    } else {
      const errMsg = `⚠ Đã áp dụng tại máy trạm nhưng lỗi lưu Server: ${res.error || 'Không xác định'}`;
      setStaySaveStatus({ type: 'error', text: errMsg });
    }
    window.setTimeout(() => setStaySaveStatus(null), 4500);
  };

  const handleResetStayConfig = async () => {
    const resetCfg = sectGameManager.resetStayDurationConfig();
    setStayDraft(resetCfg);
    liveConnectionManager.emitAdminCommand({ action: 'reset_stay_config' });
    const res = await liveConnectionManager.resetStayDurationConfigOnServer();
    if (res.ok) {
      const msg = '✓ Đã khôi phục mặc định Thời Gian Hoạt Động: 7 phút (420 giây)!';
      setStaySaveStatus({ type: 'success', text: msg });
      notifySync(msg);
    } else {
      setStaySaveStatus({
        type: 'error',
        text: `⚠ Đã khôi phục 7 phút tại máy trạm nhưng lỗi Server: ${res.error || ''}`,
      });
    }
    window.setTimeout(() => setStaySaveStatus(null), 4500);
  };

  const updateAndSyncConfig = async (mutator: (draft: MaGiaoMasterConfig) => void, msg = 'Đã lưu & đồng bộ cấu hình!') => {
    const next = structuredClone(config);
    mutator(next);
    next.updatedAt = Date.now();
    sectGameManager.updateMasterConfig(next);
    await liveConnectionManager.pushMasterConfig(next);
    notifySync(msg);
  };

  const filteredTabs = ADMIN_CATEGORIES.filter(
    t =>
      t.label.toLowerCase().includes(tabSearch.toLowerCase()) ||
      t.shortLabel.toLowerCase().includes(tabSearch.toLowerCase())
  );

  const selectedDisciple: SectDisciple | null =
    disciples.find(d => d.userId === selectedDiscipleId) ||
    waitingQueue.find(d => d.userId === selectedDiscipleId) ||
    disciples[0] ||
    null;

  const dispatchTestComment = (uid: string, nickname: string, commentText: string) => {
    const cleanUid = (uid || '').trim() || `test_user_${Date.now().toString(36)}`;
    const cleanName = (nickname || '').trim() || cleanUid;
    const cleanComment = (commentText || '').trim() || 'Giáo Chủ vạn tuế!';
    const evt: TikTokLiveEvent = {
      id: `admin_test_cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'comment',
      timestamp: Date.now(),
      userId: cleanUid,
      uniqueId: cleanUid,
      nickname: cleanName,
      comment: cleanComment,
      isDemo: true,
    };
    const res = sectGameManager.handleCommentEvent(evt);
    liveConnectionManager.emitAdminCommand({ action: 'test_live_event', event: evt });
    onSelectDiscipleId(cleanUid);
    setTestUserId(cleanUid);
    setTestDisplayName(cleanName);
    notifySync(
      res.isNewSpawn
        ? `User mới "${cleanName}" (${cleanUid}) đang từ Cổng đi vào Đại Điện: "${cleanComment}"`
        : `User "${cleanName}" (${cleanUid}) bình luận lần #${res.disciple?.commentCount || 1}: "${cleanComment}"`
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0914] text-stone-100 border-l border-amber-500/25 select-none">
      {/* TOP BAR OF ADMIN PANEL */}
      <div className="p-3 bg-[#120E20] border-b border-amber-500/25 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-amber-400 font-['Cinzel'] flex items-center gap-1.5">
            <span>🐉 TRUNG TÂM ĐIỀU HÀNH MA GIÁO (20 HẠNG MỤC)</span>
            {fullPageMode && (
              <a
                href="/"
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 border border-amber-500/30"
              >
                ← Về Studio Chính
              </a>
            )}
          </div>
          <div className="text-[11px] text-stone-400">
            Đồng bộ thời gian thực với Sảnh 9:16 & OBS Browser Source (<code>?obs=1</code>)
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncMessage && (
            <span className="px-2.5 py-1 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-medium">
              ✓ {syncMessage}
            </span>
          )}
          <button
            onClick={() => updateAndSyncConfig(() => {}, 'Đã lưu & đẩy cấu hình sang OBS!')}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 hover:to-red-600 text-white text-xs font-bold shadow cursor-pointer"
          >
            💾 Lưu & Đồng Bộ OBS
          </button>
        </div>
      </div>

      {/* CATEGORY NAVIGATION + SEARCH */}
      <div className="p-2 bg-[#0F0B1A] border-b border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={tabSearch}
            onChange={e => setTabSearch(e.target.value)}
            placeholder="🔍 Tìm nhanh trong 20 mục quản trị..."
            className="w-full px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-xs text-stone-100 focus:border-amber-500 outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {filteredTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-red-800 to-amber-700 text-white border border-amber-400 shadow'
                    : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-stone-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT AREA FOR EACH OF THE 20 TABS */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* ==================================================================
            1. TỔNG QUAN HỆ THỐNG (OVERVIEW & CHÙA ONLINE 2 PARITY TABLE)
           ================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 tabular-nums">
              <div className="p-3 rounded-lg bg-stone-900/90 border border-amber-500/30">
                <div className="text-stone-400 text-[11px]">Đệ Tử Trong Sảnh</div>
                <div className="text-lg font-bold text-amber-400 mt-0.5">
                  {disciples.length} / {config.sceneConfig.maxConcurrentPlayers}
                </div>
                <div className="text-[10px] text-purple-300">
                  Hàng chờ: {waitingQueue.length} | Quét sân: {sweepingDisciples.length}/5
                </div>
              </div>

              <div className="p-3 rounded-lg bg-stone-900/90 border border-amber-500/30">
                <div className="text-stone-400 text-[11px]">Giáo Chủ Hiện Tại</div>
                <div className="text-sm font-bold text-red-400 truncate mt-0.5">
                  {snapshot.sectLeader.currentLeaderName}
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  Chiêu: {snapshot.sectLeader.currentAnimation}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-stone-900/90 border border-amber-500/30">
                <div className="text-stone-400 text-[11px]">Bối Cảnh & Mini Game</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {snapshot.activeScene === 'main_hall' ? 'Đại Điện Ma Giáo' : 'Sân Luyện Võ'}
                </div>
                <div className="text-[10px] text-amber-200">
                  {miniGame.isActive
                    ? `Đang thi: ${miniGame.title} (${miniGame.remainingSec}s)`
                    : `Chuyển cảnh sau: ${snapshot.nextSceneCountdownSec}s`}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-stone-900/90 border border-amber-500/30">
                <div className="text-stone-400 text-[11px]">Trạng Thái LIVE & TTS</div>
                <div className="text-sm font-bold text-sky-400 mt-0.5 uppercase">
                  {liveStatus.state === 'connected' ? `LIVE: @${liveStatus.uniqueId}` : 'CHẾ ĐỘ DEMO'}
                </div>
                <div className="text-[10px] text-stone-300 truncate">
                  TTS: {voiceSnap.activeProviderStatus} ({snapshot.fps} FPS)
                </div>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 space-y-2">
              <div className="font-bold text-amber-300 uppercase">⚡ Thao Tác Nhanh Toàn Cục</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sectGameManager.spawnDemoPlayers(10)}
                  className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
                >
                  +10 Đệ Tử Nhập Môn
                </button>
                <button
                  onClick={() => sectGameManager.spawnDemoPlayers(50)}
                  className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-semibold cursor-pointer"
                >
                  +50 Đệ Tử (Test Đông)
                </button>
                <button
                  onClick={() =>
                    sectGameManager.triggerSectLeaderSpeech('silly_evil_boast', {}, 'boast_idle')
                  }
                  className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-semibold cursor-pointer"
                >
                  🗣️ Giáo Chủ Khoe Tội Ác Ngớ Ngẩn
                </button>
                <button
                  onClick={() => sectGameManager.startMiniGame()}
                  className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-semibold cursor-pointer"
                >
                  ⚔️ Mở Hội Luyện Võ Ngay
                </button>
                <button
                  onClick={() => sectGameManager.clearDemoData()}
                  className="px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 font-semibold cursor-pointer"
                >
                  🧹 Xóa Dữ Liệu Demo
                </button>
              </div>
            </div>

            {/* Chùa Online 2 Technical Parity Table */}
            <div className="p-3 rounded-lg bg-stone-900/80 border border-amber-500/25">
              <div className="font-bold text-amber-400 uppercase mb-2">
                🏛️ Bảng Đối Chiếu Kế Thừa Kỹ Thuật Từ CHÙA ONLINE 2 ➔ MA GIÁO ONLINE
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-stone-700 text-amber-300">
                      <th className="py-1.5 px-2">Hạng mục Chùa Online 2</th>
                      <th className="py-1.5 px-2">Phiên bản Ma Giáo Online</th>
                      <th className="py-1.5 px-2">Trạng thái</th>
                      <th className="py-1.5 px-2">Chi tiết kỹ thuật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHUA_TO_MAGIAO_PARITY_TABLE.map((row, idx) => (
                      <tr key={idx} className="border-b border-stone-800/80 hover:bg-stone-800/40">
                        <td className="py-1.5 px-2 text-stone-300">{row.chuaOnlineModule}</td>
                        <td className="py-1.5 px-2 font-semibold text-amber-200">{row.maGiaoEquivalent}</td>
                        <td className="py-1.5 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px]">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-stone-400">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            2. ĐIỀU KHIỂN LIVE (TIKTOK LIVE CONNECTOR & MODE)
           ================================================================== */}
        {activeTab === 'live_control' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">📡 Kết Nối Phòng TikTok LIVE Thật</div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={tiktokInput}
                  onChange={e => setTiktokInput(e.target.value)}
                  placeholder="Nhập TikTok ID (ví dụ: @username)"
                  className="flex-1 min-w-[180px] px-3 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-100"
                />
                <button
                  onClick={async () => {
                    if (config.overlayConfig.clearDemoOnLiveConnect) {
                      sectGameManager.clearDemoData();
                    }
                    await liveConnectionManager.connectTikTokRoom(tiktokInput);
                  }}
                  className="px-4 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold cursor-pointer"
                >
                  Kết Nối LIVE
                </button>
                <button
                  onClick={() => liveConnectionManager.disconnectTikTokRoom()}
                  className="px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 font-semibold cursor-pointer"
                >
                  Ngắt Kết Nối
                </button>
              </div>

              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-stone-400 mr-2">Trạng thái:</span>
                  <strong
                    className={
                      liveStatus.state === 'connected'
                        ? 'text-emerald-400'
                        : liveStatus.state === 'error'
                        ? 'text-red-400'
                        : 'text-amber-300'
                    }
                  >
                    {liveStatus.state.toUpperCase()}
                  </strong>
                  {liveStatus.uniqueId && <span className="ml-2 text-stone-300">(@{liveStatus.uniqueId})</span>}
                  {liveStatus.errorMessage && (
                    <div className="text-red-400 text-[11px] mt-0.5">{liveStatus.errorMessage}</div>
                  )}
                </div>
                <div className="text-right tabular-nums">
                  <div>Người xem: <strong>{liveStatus.viewerCount}</strong></div>
                  <div>Sự kiện nhận: <strong>{liveStatus.eventCount}</strong></div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.overlayConfig.clearDemoOnLiveConnect}
                  onChange={e =>
                    updateAndSyncConfig(d => {
                      d.overlayConfig.clearDemoOnLiveConnect = e.target.checked;
                    })
                  }
                />
                <span>Tự động xóa toàn bộ dữ liệu Demo khi bấm Kết Nối LIVE thật</span>
              </label>
            </div>
          </div>
        )}

        {/* ==================================================================
            3. QUẢN LÝ GIÁO CHỦ (SECT LEADER CONFIG & PERSONALITY)
           ================================================================== */}
        {activeTab === 'sect_leader' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">👑 Cấu Hình Giáo Chủ Ma Giáo</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">Danh hiệu Giáo Chủ mặc định</label>
                  <input
                    type="text"
                    value={config.sectLeader.title}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sectLeader.title = e.target.value;
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Danh hiệu khi nhường ngôi</label>
                  <input
                    type="text"
                    value={config.sectLeader.formerLeaderTitle}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sectLeader.formerLeaderTitle = e.target.value;
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Tính cách Giáo Chủ (3 Chế độ)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'ba_chu', label: '🔥 BÁ CHỦ (Ngầu & Uy Nghiêm)' },
                      { id: 'hai_huoc', label: '😂 HÀI HƯỚC (Khoe Tội Ác Ngớ Ngẩn)' },
                      { id: 'cuong_vo', label: '⚔️ CUỒNG VÕ (Thích Khảo Hạch)' },
                    ] as { id: SectLeaderPersonality; label: string }[]
                  ).map(p => (
                    <button
                      key={p.id}
                      onClick={() =>
                        updateAndSyncConfig(d => {
                          d.sectLeader.personality = p.id;
                        })
                      }
                      className={`p-2 rounded border text-center font-semibold cursor-pointer ${
                        config.sectLeader.personality === p.id
                          ? 'bg-red-800 border-amber-400 text-white'
                          : 'bg-stone-950 border-stone-800 text-stone-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">
                    Tỷ lệ kích thước Giáo Chủ: <strong>{config.sectLeader.scale.toFixed(2)}x</strong>
                  </label>
                  <input
                    type="range"
                    min={1.0}
                    max={2.2}
                    step={0.05}
                    value={config.sectLeader.scale}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sectLeader.scale = Number(e.target.value);
                        d.sceneConfig.sectLeaderScale = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col justify-center gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.sectLeader.autoIdleEnabled}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sectLeader.autoIdleEnabled = e.target.checked;
                        })
                      }
                    />
                    <span>Tự động diễn hoạt & phát ngôn mỗi 15–35 giây</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.sectLeader.patrolEnabled}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sectLeader.patrolEnabled = e.target.checked;
                        })
                      }
                    />
                    <span>Cho phép Giáo Chủ bước xuống bậc thềm đi tuần đại điện</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    sectGameManager.handleGiftEvent({
                      id: `admin_throne_${Date.now()}`,
                      type: 'gift',
                      timestamp: Date.now(),
                      userId: 'hero_tan_giao_chu',
                      uniqueId: 'hero_tan_giao_chu',
                      nickname: 'Độc Cô Cầu Bại',
                      giftId: 9999,
                      giftName: 'Long Ngai Chí Tôn',
                      giftCount: 1,
                      coinValue: 1000,
                      isDemo: true,
                    });
                    notifySync('Đã kích hoạt Đại Lễ Chuyển Giao Ngai Vàng!');
                  }}
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                >
                  🐉 Thử Chuyển Giao Ngai Vàng (Tân Giáo Chủ)
                </button>
                <button
                  onClick={() => {
                    sectGameManager.clearDemoData();
                    notifySync('Đã khôi phục Ngai Vàng về Giáo Chủ Dạ Thiên Minh!');
                  }}
                  className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                >
                  ↺ Khôi Phục Giáo Chủ Mặc Định
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            4. HOẠT ẢNH GIÁO CHỦ (ALL 35 ANIMATIONS INSPECTOR & TRIGGER)
           ================================================================== */}
        {activeTab === 'leader_animations' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 p-2.5 rounded-lg border border-amber-500/30">
              <div>
                <div className="font-bold text-amber-400">
                  🎬 BỘ 35 HOẠT ẢNH 2D CỦA GIÁO CHỦ ({config.sectLeaderAnimations.length}/35)
                </div>
                <div className="text-[11px] text-stone-400">
                  Đang diễn: <strong className="text-red-400">{snapshot.sectLeader.currentAnimation}</strong>
                </div>
              </div>
              <div className="flex gap-1">
                {(['ALL', 'A', 'B', 'C', 'D', 'E'] as const).map(grp => (
                  <button
                    key={grp}
                    onClick={() => setAnimGroupFilter(grp)}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                      animGroupFilter === grp
                        ? 'bg-amber-500 text-black'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {grp === 'ALL' ? 'Tất cả (35)' : `Nhóm ${grp}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {config.sectLeaderAnimations
                .filter(a => animGroupFilter === 'ALL' || a.group === animGroupFilter)
                .map((anim, idx) => {
                  const isPlaying = snapshot.sectLeader.currentAnimation === anim.id;
                  return (
                    <div
                      key={anim.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                        isPlaying
                          ? 'bg-red-950/70 border-amber-400'
                          : 'bg-stone-900/90 border-stone-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-amber-200 truncate">
                          #{idx + 1}. [{anim.group}] {anim.name}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">{anim.description}</div>
                        <div className="text-[10px] text-purple-300 font-mono mt-0.5">
                          ID: {anim.id} • {anim.durationMs}ms • Biểu cảm: {anim.expression}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          sectGameManager.triggerSectLeaderAnimation(anim.id);
                          liveConnectionManager.emitAdminCommand({
                            action: 'leader_anim',
                            animId: anim.id,
                          });
                        }}
                        className="px-2.5 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold shrink-0 cursor-pointer"
                      >
                        ▶ Phát Ngay
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==================================================================
            5. QUẢN LÝ ĐỒ ĐỆ → THỜI GIAN HOẠT ĐỘNG & BẢNG THEO DÕI USER Ở SẢNH
           ================================================================== */}
        {activeTab === 'disciples' && (
          <div className="space-y-4">
            {/* A. QUẢN LÝ ĐỒ ĐỆ -> THỜI GIAN HOẠT ĐỘNG (CÀI ĐẶT THỜI GIAN NGƯỜI CHƠI Ở LẠI ĐẠI ĐIỆN) */}
            <div className="p-3.5 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-amber-400 uppercase text-xs sm:text-sm">
                    ⏱️ Quản Lý Đồ Đệ → Thời Gian Hoạt Động (Thời Gian Ở Lại Đại Điện)
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Mặc định: <strong className="text-amber-300">7 phút (420 giây)</strong> • Chỉ Bình luận & Quà hợp lệ mới làm mới bộ đếm • Giữ nguyên X & Cấp bậc khi rời sảnh
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSaveStayConfig()}
                    className="px-3.5 py-1.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold shadow cursor-pointer"
                  >
                    💾 Lưu Cài Đặt
                  </button>
                  <button
                    onClick={() => handleResetStayConfig()}
                    className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold cursor-pointer"
                  >
                    ↺ Khôi Phục Mặc Định (7 Phút)
                  </button>
                </div>
              </div>

              {staySaveStatus && (
                <div
                  className={`p-2 rounded border text-xs font-semibold ${
                    staySaveStatus.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                      : 'bg-red-950/80 border-red-500/60 text-red-200'
                  }`}
                >
                  {staySaveStatus.text}
                </div>
              )}

              {/* 1. Thời gian không tương tác trước khi rời sảnh (Ô nhập + Preset 1..30 phút) */}
              <div className="p-3 rounded bg-stone-950 border border-stone-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-amber-300 text-xs">
                    1. Thời gian không tương tác trước khi rời sảnh (1 – 30 phút):
                  </label>
                  <span className="text-[11px] font-mono text-emerald-300">
                    Đang cài đặt: <strong>{stayDraft.inactivityTimeoutMinutes} phút</strong> ({stayDraft.inactivityTimeoutSec} giây)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-stone-900 px-2.5 py-1 rounded border border-amber-500/40">
                    <span className="text-stone-300 text-xs">Số phút (1–30):</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      value={stayDraft.inactivityTimeoutMinutes}
                      onChange={e => {
                        const raw = Number(e.target.value);
                        const clampedMin = Number.isFinite(raw)
                          ? Math.max(1, Math.min(30, Math.round(raw)))
                          : 7;
                        setStayDraft(prev => ({
                          ...prev,
                          inactivityTimeoutMinutes: clampedMin,
                          inactivityTimeoutSec: clampedMin * 60,
                        }));
                      }}
                      className="w-16 px-2 py-1 rounded bg-black border border-stone-700 text-amber-300 font-bold text-center tabular-nums"
                    />
                    <span className="text-stone-400 text-[11px]">phút ({stayDraft.inactivityTimeoutSec}s)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-stone-400 mr-1">Chọn nhanh:</span>
                    {[1, 3, 5, 7, 10, 15, 20, 30].map(mins => {
                      const isActive =
                        stayDraft.inactivityTimeoutMinutes === mins &&
                        stayDraft.inactivityTimeoutSec === mins * 60;
                      return (
                        <button
                          key={`preset_stay_${mins}`}
                          type="button"
                          onClick={() => {
                            const updated: Partial<DiscipleStayDurationConfig> = {
                              inactivityTimeoutMinutes: mins,
                              inactivityTimeoutSec: mins * 60,
                            };
                            setStayDraft(prev => ({ ...prev, ...updated }));
                            handleSaveStayConfig(updated);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                            isActive
                              ? 'bg-amber-500 text-black shadow'
                              : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700'
                          }`}
                        >
                          {mins} phút {mins === 7 ? '(Mặc định)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Tùy chọn bổ sung (Bật/tắt rời sảnh, đi ra cổng, cảnh báo, cách áp dụng) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-stone-200 font-semibold">
                      🚪 Tự động cho nhân vật rời sảnh khi hết thời gian
                    </span>
                    <input
                      type="checkbox"
                      checked={stayDraft.autoDepartEnabled}
                      onChange={e =>
                        setStayDraft(prev => ({ ...prev, autoDepartEnabled: e.target.checked }))
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-stone-200 font-semibold">
                      🚶 Bật hoạt ảnh đi bộ ra cổng khi rời sảnh
                    </span>
                    <input
                      type="checkbox"
                      checked={stayDraft.walkToGateOnDepart}
                      onChange={e =>
                        setStayDraft(prev => ({ ...prev, walkToGateOnDepart: e.target.checked }))
                      }
                    />
                  </label>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-stone-400 text-[11px]">
                      Thời lượng hoạt ảnh rời sảnh (1–15 giây):
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={stayDraft.departAnimationDurationSec}
                        onChange={e => {
                          const v = Math.max(1, Math.min(15, Math.round(Number(e.target.value) || 4)));
                          setStayDraft(prev => ({ ...prev, departAnimationDurationSec: v }));
                        }}
                        className="w-14 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-mono text-center"
                      />
                      <span className="text-[11px] text-stone-400">giây</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-stone-200 font-semibold">
                      ⚠️ Bật cảnh báo sắp hết thời gian ở lại
                    </span>
                    <input
                      type="checkbox"
                      checked={stayDraft.warningBeforeDepartEnabled}
                      onChange={e =>
                        setStayDraft(prev => ({
                          ...prev,
                          warningBeforeDepartEnabled: e.target.checked,
                        }))
                      }
                    />
                  </label>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-400 text-[11px]">
                      Thời điểm cảnh báo trước khi rời sảnh:
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        value={stayDraft.warningBeforeDepartSec}
                        onChange={e => {
                          const v = Math.max(5, Math.min(300, Math.round(Number(e.target.value) || 30)));
                          setStayDraft(prev => ({ ...prev, warningBeforeDepartSec: v }));
                        }}
                        className="w-16 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-mono text-center"
                      />
                      <span className="text-[11px] text-stone-400">giây</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-stone-400 text-[11px] mb-1">
                      Cách áp dụng khi thay đổi thời gian:
                    </label>
                    <select
                      value={stayDraft.applyMode}
                      onChange={e =>
                        setStayDraft(prev => ({
                          ...prev,
                          applyMode: e.target.value === 'new_only' ? 'new_only' : 'immediate',
                        }))
                      }
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 text-xs"
                    >
                      <option value="immediate">
                        ⚡ Áp dụng ngay cho người đang ở sảnh & người mới
                      </option>
                      <option value="new_only">
                        🆕 Chỉ áp dụng với người mới (Giữ nguyên hạn cũ của người đang ở sảnh)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* B. THANH CÔNG CỤ TÌM KIẾM & GIA HẠN THỜI GIAN HÀNG LOẠT */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 p-2.5 rounded-lg border border-amber-500/30">
              <input
                type="text"
                value={discipleSearch}
                onChange={e => setDiscipleSearch(e.target.value)}
                placeholder="🔍 Tìm kiếm đệ tử theo tên TikTok, ID hoặc chức danh..."
                className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700"
              />
              <button
                onClick={() => {
                  const count = sectGameManager.extendDiscipleStayTime(
                    undefined,
                    120,
                    'Admin gia hạn +2 phút toàn sảnh'
                  );
                  liveConnectionManager.emitAdminCommand({
                    action: 'extend_stay_time',
                    addSeconds: 120,
                    reason: 'Admin gia hạn +2 phút toàn sảnh',
                  });
                  notifySync(`Đã gia hạn +2 phút (120s) cho toàn bộ ${count} người chơi đang ở sảnh!`);
                }}
                className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold cursor-pointer"
              >
                ⏳ Gia Hạn Toàn Sảnh (+2 Phút)
              </button>
              <button
                onClick={() => {
                  sectGameManager.spawnDemoPlayers(5);
                  liveConnectionManager.emitAdminCommand({ action: 'spawn_demo', count: 5 });
                }}
                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
              >
                +5 Đệ Tử
              </button>
              <button
                onClick={() => {
                  sectGameManager.clearAllPlayers();
                  liveConnectionManager.emitAdminCommand({ action: 'clear_all' });
                }}
                className="px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Xóa Hết
              </button>
            </div>

            {/* C. CHI TIẾT & THAO TÁC TRỰC TIẾP TRÊN ĐỆ TỬ ĐANG CHỌN */}
            {selectedDisciple && (
              <div className="p-3 rounded-lg bg-stone-900 border border-amber-400/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-amber-400 font-bold text-sm">{selectedDisciple.displayName}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-stone-800 text-amber-200 text-[10px]">
                      ID: <code>{selectedDisciple.userId}</code> • Tên 5 ký tự: <strong>{selectedDisciple.compactName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-[11px]">
                      Còn lại: <strong>{formatCountdownMMSS(selectedDisciple.remainingStaySec)}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-400/40 text-purple-200 font-bold">
                      {selectedDisciple.rankName} ({selectedDisciple.totalCoins} X)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      sectGameManager.extendDiscipleStayTime(
                        selectedDisciple.userId,
                        60,
                        `Admin gia hạn +1 phút cho ${selectedDisciple.displayName}`
                      );
                      liveConnectionManager.emitAdminCommand({
                        action: 'extend_stay_time',
                        userId: selectedDisciple.userId,
                        addSeconds: 60,
                        reason: `Admin gia hạn +1 phút cho ${selectedDisciple.displayName}`,
                      });
                      notifySync(`Đã gia hạn +1 phút (60s) cho ${selectedDisciple.displayName}!`);
                    }}
                    className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold cursor-pointer"
                  >
                    ⏳ Gia Hạn +1 Phút
                  </button>
                  <button
                    onClick={() => {
                      sectGameManager.extendDiscipleStayTime(
                        selectedDisciple.userId,
                        300,
                        `Admin gia hạn +5 phút cho ${selectedDisciple.displayName}`
                      );
                      liveConnectionManager.emitAdminCommand({
                        action: 'extend_stay_time',
                        userId: selectedDisciple.userId,
                        addSeconds: 300,
                        reason: `Admin gia hạn +5 phút cho ${selectedDisciple.displayName}`,
                      });
                      notifySync(`Đã gia hạn +5 phút (300s) cho ${selectedDisciple.displayName}!`);
                    }}
                    className="px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold cursor-pointer"
                  >
                    ⏳ Gia Hạn +5 Phút
                  </button>
                  {config.ranks.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        sectGameManager.applyRankToDisciple(selectedDisciple, r.id);
                        notifySync(`Đã phong ${selectedDisciple.displayName} lên ${r.name}`);
                      }}
                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 border border-stone-700 cursor-pointer"
                    >
                      Phong: {r.name}
                    </button>
                  ))}
                  {selectedDisciple.isSweepingPenalty && (
                    <button
                      onClick={() => sectGameManager.releaseSweepingDisciple(selectedDisciple.userId)}
                      className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      ✓ Tha Phạt Quét Sân
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const targetId = selectedDisciple.userId;
                      const targetName = selectedDisciple.displayName;
                      sectGameManager.removeDisciple(targetId);
                      liveConnectionManager.emitAdminCommand({
                        action: 'remove_disciple',
                        userId: targetId,
                      });
                      notifySync(`Đã xóa riêng nhân vật ${targetName} (${targetId})!`);
                    }}
                    className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer"
                  >
                    🗑 Xóa Riêng User Này
                  </button>
                </div>
              </div>
            )}

            {/* D. BẢNG THEO DÕI USER ĐANG Ở SẢNH (6 CỘT + NÚT GIA HẠN THỜI GIAN) */}
            <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-300 uppercase">
                  📊 Bảng Theo Dõi User Đang Ở Sảnh ({disciples.length}/{config.sceneConfig.maxConcurrentPlayers || 80} người • Hàng chờ: {waitingQueue.length})
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    Đang hoạt động: {disciples.filter(d => d.stayStatus === 'active' || !d.stayStatus).length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300">
                    Sắp hết giờ: {disciples.filter(d => d.stayStatus === 'expiring_soon').length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300">
                    Đang rời sảnh: {disciples.filter(d => d.stayStatus === 'departing' || d.fsmState === 'departing_gate').length}
                  </span>
                </div>
              </div>

              <div className="max-h-[380px] overflow-x-auto overflow-y-auto rounded border border-stone-800">
                <table className="w-full text-left border-collapse text-[11px] tabular-nums">
                  <thead className="bg-stone-950 text-stone-400 sticky top-0 z-10 border-b border-stone-800">
                    <tr>
                      <th className="p-2">Tên TikTok</th>
                      <th className="p-2">Chức danh</th>
                      <th className="p-2">Hoạt động hiện tại</th>
                      <th className="p-2">Tương tác cuối</th>
                      <th className="p-2">Còn lại trước khi rời</th>
                      <th className="p-2">Trạng thái</th>
                      <th className="p-2 text-right">Gia hạn / Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/70">
                    {disciples
                      .filter(
                        d =>
                          d.displayName.toLowerCase().includes(discipleSearch.toLowerCase()) ||
                          d.userId.toLowerCase().includes(discipleSearch.toLowerCase()) ||
                          d.rankName.toLowerCase().includes(discipleSearch.toLowerCase())
                      )
                      .map(d => {
                        const status =
                          d.fsmState === 'departing_gate' || d.stayStatus === 'departing'
                            ? 'departing'
                            : d.stayStatus === 'expiring_soon'
                            ? 'expiring_soon'
                            : 'active';
                        const lastTimeStr = new Date(
                          d.lastInteractionAt || d.joinedAt
                        ).toLocaleTimeString('vi-VN');
                        const activityLabel = sectGameManager.describeDiscipleCurrentActivity(d);

                        return (
                          <tr
                            key={d.userId}
                            onClick={() => onSelectDiscipleId(d.userId)}
                            className={`cursor-pointer transition ${
                              selectedDisciple?.userId === d.userId
                                ? 'bg-amber-950/50'
                                : 'bg-stone-900/70 hover:bg-stone-800/70'
                            }`}
                          >
                            <td className="p-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: d.secondaryColor }}
                                />
                                <div>
                                  <div className="font-bold text-stone-100">{d.displayName}</div>
                                  <div className="text-[10px] text-stone-400 font-mono">
                                    ID: {d.userId} [{d.compactName}]
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="font-semibold text-amber-300">{d.rankName}</div>
                              <div className="text-[10px] text-stone-400 font-mono">
                                {d.totalCoins} X ({d.giftCount} quà)
                              </div>
                            </td>
                            <td className="p-2 text-stone-200">
                              <div>{activityLabel}</div>
                              <div className="text-[10px] text-stone-500 font-mono">
                                ({Math.round(d.x)}%, {Math.round(d.y)}%) • {d.animation}
                              </div>
                            </td>
                            <td className="p-2 font-mono text-stone-300">{lastTimeStr}</td>
                            <td className="p-2 font-mono font-bold">
                              <span
                                className={
                                  status === 'departing'
                                    ? 'text-red-400'
                                    : status === 'expiring_soon'
                                    ? 'text-amber-400'
                                    : 'text-emerald-300'
                                }
                              >
                                {formatCountdownMMSS(d.remainingStaySec)}
                              </span>
                            </td>
                            <td className="p-2">
                              {status === 'departing' ? (
                                <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/50 text-red-300 font-bold text-[10px]">
                                  🚪 Đang rời sảnh
                                </span>
                              ) : status === 'expiring_soon' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-bold text-[10px]">
                                  ⚠️ Sắp hết giờ
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                                  ● Đang hoạt động
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    sectGameManager.extendDiscipleStayTime(
                                      d.userId,
                                      120,
                                      `Admin gia hạn +2 phút cho ${d.displayName}`
                                    );
                                    liveConnectionManager.emitAdminCommand({
                                      action: 'extend_stay_time',
                                      userId: d.userId,
                                      addSeconds: 120,
                                      reason: `Admin gia hạn +2 phút cho ${d.displayName}`,
                                    });
                                    notifySync(`Đã gia hạn +2 phút cho ${d.displayName}!`);
                                  }}
                                  className="px-2 py-1 rounded bg-sky-800 hover:bg-sky-700 text-white font-bold text-[10px] cursor-pointer"
                                  title="Gia hạn thêm 2 phút ở lại sảnh"
                                >
                                  +2m
                                </button>
                                <button
                                  onClick={() => {
                                    dispatchTestComment(
                                      d.userId,
                                      d.displayName,
                                      'Đệ tử xin tiếp tục hầu cận Giáo Chủ!'
                                    );
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                                  title="Giả lập User bình luận để làm mới bộ đếm thời gian"
                                >
                                  Làm mới
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            6. HỆ THỐNG CẤP BẬC & CỘNG DỒN X (9 RANKS, ACCUMULATION, LEDGER, HISTORY)
           ================================================================== */}
        {activeTab === 'ranks' && (
          <div className="space-y-4">
            {/* A. CẤU HÌNH QUY TẮC CỘNG DỒN X & LƯU TRỮ PHIÊN / ĐA PHIÊN */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-400 uppercase">
                  🎖️ Hệ Thống Cộng Dồn Tổng X Thăng Cấp & Chế Độ Lưu Trữ
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      sectGameManager.resetDemoCoins();
                      liveConnectionManager.emitAdminCommand({ action: 'reset_demo_coins' });
                      notifySync('Đã đặt lại toàn bộ tổng X & cấp bậc Demo về 0 (Dân Đen)!');
                    }}
                    className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer"
                  >
                    🔄 Đặt Lại X Chế Độ Demo (Về 0 X)
                  </button>
                  <button
                    onClick={() => {
                      const exported = sectGameManager.exportRankAndLedgerData();
                      const jsonStr = JSON.stringify(exported, null, 2);
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `magiao-ranks-ledger-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      notifySync('Đã tải xuống file sao lưu dữ liệu Cấp Bậc & Sổ X!');
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    ⬇ Sao Lưu Cấp Bậc & Sổ X (JSON)
                  </button>
                  <button
                    onClick={() => setShowBackupImportBox(v => !v)}
                    className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold cursor-pointer"
                  >
                    ⬆ Khôi Phục Từ Bản Sao Lưu
                  </button>
                  <button
                    onClick={() => {
                      sectGameManager.resetRanksToDefault();
                      updateAndSyncConfig(d => {
                        d.ranks = sectGameManager.getConfig().ranks;
                      }, 'Đã khôi phục 8 mốc X mặc định (0 / 1 / 5 / 10 / 20 / 50 / 99 / 199)!');
                    }}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                  >
                    ↺ Mốc Mặc Định
                  </button>
                </div>
              </div>

              {showBackupImportBox && (
                <div className="p-2.5 rounded bg-stone-950 border border-sky-500/40 space-y-2">
                  <div className="text-sky-300 font-semibold text-[11px]">
                    Chọn file JSON sao lưu hoặc dán nội dung JSON vào ô dưới đây để khôi phục:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const parsed = JSON.parse(String(reader.result || '{}'));
                            const ok = sectGameManager.importRankAndLedgerData(parsed);
                            if (ok) {
                              liveConnectionManager.emitAdminCommand({
                                action: 'import_rank_ledger',
                                payload: parsed,
                              });
                              notifySync('Đã khôi phục thành công dữ liệu Cấp Bậc & Sổ X từ file!');
                              setShowBackupImportBox(false);
                            }
                          } catch {
                            notifySync('Lỗi: File JSON không hợp lệ.');
                          }
                        };
                        reader.readAsText(file);
                      }}
                      className="text-[11px] text-stone-300"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={rankBackupJsonInput}
                    onChange={e => setRankBackupJsonInput(e.target.value)}
                    placeholder='Dán chuỗi JSON sao lưu (chứa "ranks", "rankAccumulation", "playerLedger")...'
                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 font-mono text-[10px]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(rankBackupJsonInput);
                          const ok = sectGameManager.importRankAndLedgerData(parsed);
                          if (ok) {
                            liveConnectionManager.emitAdminCommand({
                              action: 'import_rank_ledger',
                              payload: parsed,
                            });
                            notifySync('Đã khôi phục dữ liệu Cấp Bậc & Sổ X!');
                            setRankBackupJsonInput('');
                            setShowBackupImportBox(false);
                          }
                        } catch {
                          notifySync('Lỗi: Chuỗi JSON không hợp lệ.');
                        }
                      }}
                      className="px-3 py-1 rounded bg-sky-600 text-white font-bold cursor-pointer"
                    >
                      ✓ Áp Dụng Khôi Phục
                    </button>
                    <button
                      onClick={() => setShowBackupImportBox(false)}
                      className="px-3 py-1 rounded bg-stone-800 text-stone-300 cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 rounded bg-stone-950 border border-stone-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.rankAccumulation?.enabled !== false}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.rankAccumulation = {
                          ...(d.rankAccumulation || {
                            enabled: true,
                            mode: 'session',
                            preventDuplicateEvents: true,
                            singlePromotionPerEvent: true,
                          }),
                          enabled: e.target.checked,
                        };
                      })
                    }
                  />
                  <div>
                    <span className="font-bold text-amber-300 block">
                      Bật Cộng Dồn Tổng X Thăng Cấp
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Cộng tất cả quà hợp lệ vào tổng X tích lũy của từng tài khoản TikTok
                    </span>
                  </div>
                </label>

                <div>
                  <span className="text-stone-400 text-[11px] block mb-1">
                    Chế độ lưu trữ cộng dồn:
                  </span>
                  <select
                    value={config.rankAccumulation?.mode || 'session'}
                    onChange={e => {
                      const nextMode = e.target.value as 'session' | 'persistent';
                      sectGameManager.setAccumulationConfig({ mode: nextMode });
                      updateAndSyncConfig(d => {
                        d.rankAccumulation = {
                          ...(d.rankAccumulation || {
                            enabled: true,
                            mode: 'session',
                            preventDuplicateEvents: true,
                            singlePromotionPerEvent: true,
                          }),
                          mode: nextMode,
                        };
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                  >
                    <option value="session">Theo phiên LIVE hiện tại (Mặc định)</option>
                    <option value="persistent">Qua nhiều phiên LIVE (Lưu bền vững theo TikTok ID)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.rankAccumulation?.preventDuplicateEvents !== false}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.rankAccumulation = {
                          ...(d.rankAccumulation || {
                            enabled: true,
                            mode: 'session',
                            preventDuplicateEvents: true,
                            singlePromotionPerEvent: true,
                          }),
                          preventDuplicateEvents: e.target.checked,
                        };
                      })
                    }
                  />
                  <div>
                    <span className="font-bold text-emerald-300 block">
                      Chống Cộng Trùng Sự Kiện & Streak
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Chặn sự kiện lặp ID hoặc combo streak gửi trùng
                    </span>
                  </div>
                </label>
              </div>

              {/* B. NÚT THỬ CÁC TÌNH HUỐNG CỘNG DỒN CHUẨN */}
              <div className="p-2.5 rounded bg-stone-950 border border-amber-500/30 space-y-2">
                <div className="font-bold text-amber-300 text-[11px]">
                  🧪 Nút Thử Nhanh Các Tình Huống Cộng Dồn Chuẩn (Áp dụng cho User đang chọn hoặc tạo mới):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const uid = selectedDisciple?.userId || 'accum_tester_11';
                      const name = selectedDisciple?.displayName || 'Lệnh Hồ Xung';
                      sectGameManager.resetDemoCoins(uid);
                      const coins = [1, 5, 5];
                      coins.forEach((c, idx) => {
                        const evt: TikTokLiveEvent = {
                          id: `scen_11_${Date.now()}_${idx}`,
                          type: 'gift',
                          timestamp: Date.now() + idx,
                          userId: uid,
                          uniqueId: uid,
                          nickname: name,
                          coinValue: c,
                          giftName: 'Quà Môn Phái',
                          giftCount: 1,
                          isDemo: true,
                        };
                        sectGameManager.handleGiftEvent(evt);
                        liveConnectionManager.emitAdminCommand({ action: 'test_live_event', event: evt });
                      });
                      onSelectDiscipleId(uid);
                      notifySync(`Đã thử 1 + 5 + 5 = 11 X cho ${name} ➔ Đạt cấp Tinh Anh (Mốc 10 X)!`);
                    }}
                    className="px-3 py-1.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold cursor-pointer"
                  >
                    ⚡ Thử: 1 + 5 + 5 = 11 X ➔ Tinh Anh (Mốc 10 X)
                  </button>

                  <button
                    onClick={() => {
                      const uid = selectedDisciple?.userId || 'accum_tester_100';
                      const name = selectedDisciple?.displayName || 'Trương Vô Kỵ';
                      sectGameManager.resetDemoCoins(uid);
                      [90, 10].forEach((c, idx) => {
                        const evt: TikTokLiveEvent = {
                          id: `scen_100_${Date.now()}_${idx}`,
                          type: 'gift',
                          timestamp: Date.now() + idx,
                          userId: uid,
                          uniqueId: uid,
                          nickname: name,
                          coinValue: c,
                          giftName: 'Lễ Vật Ma Giáo',
                          giftCount: 1,
                          isDemo: true,
                        };
                        sectGameManager.handleGiftEvent(evt);
                        liveConnectionManager.emitAdminCommand({ action: 'test_live_event', event: evt });
                      });
                      onSelectDiscipleId(uid);
                      notifySync(`Đã thử 90 + 10 = 100 X cho ${name} ➔ Đạt cấp Đồng Tôn (Mốc 99 X)!`);
                    }}
                    className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold cursor-pointer"
                  >
                    ⚡ Thử: 90 + 10 = 100 X ➔ Đồng Tôn (Mốc 99 X)
                  </button>

                  <button
                    onClick={() => {
                      const uid = selectedDisciple?.userId || 'accum_tester_200';
                      const name = selectedDisciple?.displayName || 'Nhậm Ngã Hành';
                      sectGameManager.resetDemoCoins(uid);
                      [190, 10].forEach((c, idx) => {
                        const evt: TikTokLiveEvent = {
                          id: `scen_200_${Date.now()}_${idx}`,
                          type: 'gift',
                          timestamp: Date.now() + idx,
                          userId: uid,
                          uniqueId: uid,
                          nickname: name,
                          coinValue: c,
                          giftName: 'Bảo Vật Ma Giáo',
                          giftCount: 1,
                          isDemo: true,
                        };
                        sectGameManager.handleGiftEvent(evt);
                        liveConnectionManager.emitAdminCommand({ action: 'test_live_event', event: evt });
                      });
                      onSelectDiscipleId(uid);
                      notifySync(`Đã thử 190 + 10 = 200 X cho ${name} ➔ Đạt cấp Giáo Chủ (Mốc 199 X)!`);
                    }}
                    className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer"
                  >
                    ⚡ Thử: 190 + 10 = 200 X ➔ Giáo Chủ (Mốc 199 X)
                  </button>

                  <button
                    onClick={() => {
                      const uid = selectedDisciple?.userId || `diet_mon_user_${Date.now()}`;
                      const name = selectedDisciple?.displayName || 'Đông Phương Bất Bại';
                      sectGameManager.resetDemoCoins(uid);
                      [900, 100].forEach((c, idx) => {
                        const evt: TikTokLiveEvent = {
                          id: `scen_1000_${Date.now()}_${idx}`,
                          type: 'gift',
                          timestamp: Date.now() + idx,
                          userId: uid,
                          uniqueId: uid,
                          nickname: name,
                          coinValue: c,
                          giftName: 'Thánh Vật Ma Giáo',
                          giftCount: 1,
                          isDemo: true,
                        };
                        sectGameManager.handleGiftEvent(evt);
                        liveConnectionManager.emitAdminCommand({ action: 'test_live_event', event: evt });
                      });
                      notifySync(`Đã thử 900 + 100 = 1.000 X cho ${name} ➔ Giữ cấp Giáo Chủ & Kích hoạt DIỆT MÔN!`);
                    }}
                    className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold cursor-pointer"
                  >
                    💥 Thử: 900 + 100 = 1.000 X ➔ Kích Hoạt DIỆT MÔN
                  </button>

                  <button
                    onClick={() => {
                      const uid = selectedDisciple?.userId || 'accum_dup_tester';
                      const name = selectedDisciple?.displayName || 'Dương Tiêu';
                      const fixedEventId = `dup_gift_evt_${Date.now()}`;
                      const evt: TikTokLiveEvent = {
                        id: fixedEventId,
                        type: 'gift',
                        timestamp: Date.now(),
                        userId: uid,
                        uniqueId: uid,
                        nickname: name,
                        coinValue: 20,
                        giftName: 'Bảo Kiếm Hộ Pháp',
                        giftCount: 1,
                        isDemo: true,
                      };
                      const r1 = sectGameManager.handleGiftEvent(evt);
                      const r2 = sectGameManager.handleGiftEvent(evt);
                      notifySync(
                        `Gửi lặp 2 lần cùng ID "${fixedEventId}": Lần 1 (+${r1.addedCoins} X), Lần 2 bị chặn=${Boolean(
                          r2.duplicateIgnored
                        )} (Tổng: ${r2.disciple.totalCoins} X)!`
                      );
                    }}
                    className="px-3 py-1.5 rounded bg-teal-800 hover:bg-teal-700 text-white font-bold cursor-pointer"
                  >
                    🛡️ Thử Chống Cộng Trùng (Gửi Lặp 2 Lần Cùng Event ID)
                  </button>
                </div>
              </div>
            </div>

            {/* B2. QUẢN TRỊ ĐẠI SỰ KIỆN ĐẶC BIỆT: DIỆT MÔN (1.000 X) */}
            <div
              data-testid="admin-diet-mon-panel"
              className="p-3.5 rounded-lg bg-gradient-to-br from-red-950/50 via-stone-900 to-purple-950/40 border border-red-500/50 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-red-400 uppercase text-xs flex items-center gap-1.5">
                    <span>⚡ Đại Sự Kiện Đặc Biệt: MA GIÁO ĐẠI KIẾP – DIỆT MÔN ({config.dietMonConfig?.coinThreshold || 1000} X)</span>
                    {dietMon.isActive && (
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] animate-pulse">
                        ĐANG DIỄN RA: {dietMon.phase.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-300 mt-0.5">
                    Người đạt mốc {config.dietMonConfig?.coinThreshold || 1000} X vẫn giữ cấp <strong>Giáo Chủ</strong> (không tạo cấp bậc thứ 9) và kích hoạt 5 giai đoạn sập đại điện – hố đen cuốn toàn bộ đệ tử – tái thiết đại điện trong {config.dietMonConfig?.durationSec || 15} giây.
                  </div>
                </div>

                {/* Action Buttons: TEST DIỆT MÔN / DỪNG SỰ KIỆN KHẨN CẤP / KHÔI PHỤC ĐẠI ĐIỆN */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    data-testid="btn-test-diet-mon"
                    onClick={() => {
                      const targetId = selectedDisciple?.userId || `test_diet_mon_${Date.now()}`;
                      const targetName =
                        dietMonTestName.trim() || selectedDisciple?.displayName || 'Độc Cô Bá Chủ';
                      const targetAvatar =
                        dietMonTestAvatar.trim() || selectedDisciple?.avatarUrl || undefined;
                      sectGameManager.triggerTestDietMon(targetId, targetName, targetAvatar);
                      liveConnectionManager.emitAdminCommand({
                        action: 'test_diet_mon',
                        userId: targetId,
                        displayName: targetName,
                        avatarUrl: targetAvatar,
                      });
                      notifySync(`⚡ Đã kích hoạt TEST DIỆT MÔN cho "${targetName}"!`);
                    }}
                    className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-extrabold cursor-pointer shadow-lg"
                  >
                    💥 TEST DIỆT MÔN
                  </button>

                  <button
                    data-testid="btn-stop-diet-mon"
                    onClick={() => {
                      sectGameManager.stopDietMonEmergency();
                      liveConnectionManager.emitAdminCommand({ action: 'stop_diet_mon' });
                      notifySync('🛑 Đã dừng khẩn cấp sự kiện Diệt Môn!');
                    }}
                    className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold cursor-pointer"
                  >
                    🛑 DỪNG SỰ KIỆN KHẨN CẤP
                  </button>

                  <button
                    data-testid="btn-rebuild-hall"
                    onClick={() => {
                      sectGameManager.rebuildHallImmediately();
                      liveConnectionManager.emitAdminCommand({ action: 'rebuild_hall' });
                      notifySync('🏛️ Đã khôi phục nguyên trạng Đại Điện Ma Giáo ngay lập tức!');
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    🏛️ KHÔI PHỤC ĐẠI ĐIỆN
                  </button>
                </div>
              </div>

              {/* Test Player Name & Avatar URL Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded bg-stone-950/90 border border-stone-800">
                <label className="block text-[11px]">
                  <span className="text-stone-400 block mb-1">Tên người chơi hiển thị khi Test Diệt Môn:</span>
                  <input
                    type="text"
                    value={dietMonTestName}
                    onChange={e => setDietMonTestName(e.target.value)}
                    placeholder="VD: Độc Cô Bá Chủ"
                    className="w-full px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                  />
                </label>
                <label className="block text-[11px]">
                  <span className="text-stone-400 block mb-1">URL Avatar TikTok thử nghiệm (để trống dùng Ma Ấn mặc định):</span>
                  <input
                    type="text"
                    value={dietMonTestAvatar}
                    onChange={e => setDietMonTestAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200 font-mono text-[10px]"
                  />
                </label>
              </div>

              {/* Diệt Môn Configuration Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-2.5 rounded bg-stone-950 border border-stone-800 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dietMonConfig?.enabled !== false}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({ enabled: e.target.checked });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                  />
                  <span className="font-bold text-red-300">Bật Đại Sự Kiện Diệt Môn</span>
                </label>

                <label className="flex items-center justify-between gap-2">
                  <span className="text-stone-300">Mốc X Kích Hoạt:</span>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    value={config.dietMonConfig?.coinThreshold ?? 1000}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        coinThreshold: Number(e.target.value) || 1000,
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                    className="w-24 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-mono font-bold"
                  />
                </label>

                <label className="flex items-center justify-between gap-2">
                  <span className="text-stone-300">Tổng Thời Lượng (10–25s):</span>
                  <input
                    type="number"
                    min={10}
                    max={25}
                    value={config.dietMonConfig?.durationSec ?? 15}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        durationSec: Number(e.target.value) || 15,
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                    className="w-20 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-mono font-bold"
                  />
                </label>

                <label className="flex items-center justify-between gap-2">
                  <span className="text-stone-300">Cường Độ Rung Lắc:</span>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={config.dietMonConfig?.shakeIntensity ?? 8}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        shakeIntensity: Number(e.target.value),
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                    className="w-20 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-mono"
                  />
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dietMonConfig?.enableHallCollapse !== false}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        enableHallCollapse: e.target.checked,
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                  />
                  <span className="text-stone-200">Hiệu Ứng Sập Đại Điện</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dietMonConfig?.showBigAvatar !== false}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        showBigAvatar: e.target.checked,
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                  />
                  <span className="text-stone-200">Hiện Avatar Lớn Giữa Màn Hình</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dietMonConfig?.enableVortexSuck !== false}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        enableVortexSuck: e.target.checked,
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                  />
                  <span className="text-stone-200">Hố Đen Hút Toàn Bộ Nhân Vật</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dietMonConfig?.enableAutoRebuild !== false}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        enableAutoRebuild: e.target.checked,
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                  />
                  <span className="text-stone-200">Tự Động Tái Thiết Đại Điện</span>
                </label>

                <label className="flex items-center justify-between gap-2 sm:col-span-2">
                  <span className="text-stone-300">Kích Thước Avatar Trung Tâm:</span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={config.dietMonConfig?.avatarScale ?? 1.0}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        avatarScale: Number(e.target.value),
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                    className="w-36"
                  />
                  <span className="font-mono text-amber-300">
                    {Math.round((config.dietMonConfig?.avatarScale ?? 1) * 100)}%
                  </span>
                </label>

                <label className="flex items-center justify-between gap-2 sm:col-span-2">
                  <span className="text-stone-300">Xử lý bình luận trong lúc Diệt Môn:</span>
                  <select
                    value={config.dietMonConfig?.commentHandlingMode || 'queue'}
                    onChange={e => {
                      const next = sectGameManager.setDietMonConfig({
                        commentHandlingMode: e.target.value as 'queue' | 'ignore',
                      });
                      updateAndSyncConfig(d => {
                        d.dietMonConfig = next;
                      });
                    }}
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                  >
                    <option value="queue">Tạm xếp hàng chờ (Tự vào sảnh sau khi tái thiết)</option>
                    <option value="ignore">Bỏ qua trong 15s Diệt Môn (Bình luận lại sau khi tái thiết)</option>
                  </select>
                </label>
              </div>

              {/* Nhật Ký Người Kích Hoạt Diệt Môn */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-1.5">
                <div className="font-bold text-amber-300 text-[11px]">
                  📜 Nhật Ký Người Kích Hoạt Đại Sự Kiện Diệt Môn ({dietMon.history.length}):
                </div>
                {dietMon.history.length === 0 ? (
                  <div className="text-[11px] text-stone-500 italic">
                    Chưa có cao thủ nào kích hoạt Diệt Môn trong phiên này.
                  </div>
                ) : (
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] tabular-nums">
                    {dietMon.history.map(item => (
                      <div
                        key={item.id}
                        className="px-2 py-1 rounded bg-stone-900 border border-red-500/30 flex items-center justify-between gap-2"
                      >
                        <div>
                          <strong className="text-yellow-300">{item.displayName}</strong>{' '}
                          <code className="text-[10px] text-stone-400">({item.userId})</code> • Tổng X:{' '}
                          <strong className="text-red-400">{item.totalCoins} X</strong> • Đã cuốn:{' '}
                          <strong className="text-purple-300">{item.suckedDisciplesCount} đệ tử</strong>
                          {item.isTest && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-900 text-purple-200 text-[9px]">
                              TEST
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* C. CHỈNH NGƯỠNG X CỦA TỪNG CẤP (8 CẤP BẬC) */}
            <div className="space-y-2">
              <div className="font-bold text-amber-300 uppercase">
                ⚙️ Chỉnh Ngưỡng X Của Từng Cấp Bậc (Tự Động Đánh Giá Lại Ngay Khi Đổi):
              </div>
              {config.ranks.map((rank, idx) => (
                <div
                  key={rank.id}
                  className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-amber-300 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block border border-white/30"
                        style={{ backgroundColor: rank.secondaryColor }}
                      />
                      <span>
                        Bậc #{idx + 1}: {rank.name} (<code>{rank.id}</code>)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px]">
                        <span>{rank.isThroneRank ? 'Ngưỡng Quà Tối Cao (X):' : 'Mốc Tổng X:'}</span>
                        <input
                          type="number"
                          min={0}
                          value={rank.minCoins}
                          onChange={e =>
                            updateAndSyncConfig(d => {
                              d.ranks[idx].minCoins = Math.max(0, Number(e.target.value));
                            })
                          }
                          className="w-24 px-2 py-0.5 rounded bg-stone-950 border border-stone-700 text-amber-300 font-mono"
                        />
                      </label>
                      {rank.isThroneRank && (
                        <span className="px-2 py-0.5 rounded bg-red-900/80 border border-amber-400 text-amber-200 text-[10px] font-bold">
                          🐉 Quà Tối Cao Tiếp Quản Ngai (Gift ID: {rank.supremeGiftIds?.join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Trang phục: <span className="text-stone-200">{rank.costumeDescription}</span> • Quyền lợi:{' '}
                    <span className="text-amber-200">{rank.hallPrivilege}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* D. TRA CỨU TỔNG X TỪNG NGƯỜI CHƠI THEO TIKTOK USER ID */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-400 uppercase">
                  🔍 Sổ Vàng Tổng X Tích Lũy Từng Người ({playerLedger.length} Tài Khoản TikTok)
                </div>
                <input
                  type="text"
                  value={ledgerSearchId}
                  onChange={e => setLedgerSearchId(e.target.value)}
                  placeholder="🔍 Tìm theo TikTok User ID hoặc Tên hiển thị..."
                  className="w-64 px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-1.5 tabular-nums">
                {playerLedger
                  .filter(
                    p =>
                      p.userId.toLowerCase().includes(ledgerSearchId.toLowerCase()) ||
                      p.uniqueId.toLowerCase().includes(ledgerSearchId.toLowerCase()) ||
                      p.displayName.toLowerCase().includes(ledgerSearchId.toLowerCase())
                  )
                  .map((rec, i) => (
                    <div
                      key={rec.userId}
                      className="p-2 rounded bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-stone-400 font-mono mr-1.5">#{i + 1}</span>
                        <span className="font-bold text-amber-200">{rec.displayName}</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-sky-300 font-mono text-[10px]">
                          ID: {rec.userId}
                        </span>
                        <span className="ml-2 text-purple-300 font-semibold">{rec.rankName}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono font-bold">
                          Tổng: {rec.totalCoins} X ({rec.giftCount} quà)
                        </span>
                        {[1, 5, 10].map(addC => (
                          <button
                            key={addC}
                            onClick={() => {
                              const evt: TikTokLiveEvent = {
                                id: `ledger_add_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                type: 'gift',
                                timestamp: Date.now(),
                                userId: rec.userId,
                                uniqueId: rec.uniqueId,
                                nickname: rec.displayName,
                                coinValue: addC,
                                giftName: 'Lễ Vật Ma Giáo',
                                giftCount: 1,
                                isDemo: true,
                              };
                              sectGameManager.handleGiftEvent(evt);
                              liveConnectionManager.emitAdminCommand({
                                action: 'test_live_event',
                                event: evt,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            +{addC} X
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            sectGameManager.resetDemoCoins(rec.userId);
                            liveConnectionManager.emitAdminCommand({
                              action: 'reset_demo_coins',
                              userId: rec.userId,
                            });
                            notifySync(`Đã đặt lại X của ${rec.displayName} (${rec.userId}) về 0!`);
                          }}
                          className="px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                        >
                          Về 0 X
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* E. LỊCH SỬ NHẬN QUÀ & LỊCH SỬ CÁC LẦN THĂNG CẤP */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 tabular-nums">
              {/* Gift History */}
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 space-y-2">
                <div className="font-bold text-emerald-400 uppercase">
                  🎁 Lịch Sử Quà & Cộng Dồn ({giftHistory.length})
                </div>
                <div className="max-h-[240px] overflow-y-auto space-y-1 text-[11px]">
                  {giftHistory.length === 0 ? (
                    <div className="text-stone-500 italic">Chưa có sự kiện tặng quà nào trong phiên này.</div>
                  ) : (
                    giftHistory.map(gh => (
                      <div
                        key={gh.id}
                        className="p-2 rounded bg-stone-950 border border-stone-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-amber-200">{gh.displayName}</span>{' '}
                          <code className="text-[10px] text-stone-400">({gh.userId})</code> tặng{' '}
                          <span className="text-emerald-300 font-semibold">{gh.giftName}</span>
                          <div className="text-[10px] text-stone-400 font-mono">
                            X: {gh.totalCoinsBefore} + {gh.addedCoins} ={' '}
                            <strong className="text-amber-300">{gh.totalCoinsAfter} X</strong> • Cấp:{' '}
                            <span className={gh.promoted ? 'text-yellow-300 font-bold' : 'text-stone-300'}>
                              {gh.oldRankName} ➔ {gh.newRankName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-stone-500 shrink-0">
                          {new Date(gh.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Promotion History */}
              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 space-y-2">
                <div className="font-bold text-amber-400 uppercase">
                  🏆 Lịch Sử Các Lần Thăng Cấp ({promotions.length})
                </div>
                <div className="max-h-[240px] overflow-y-auto space-y-1 text-[11px]">
                  {promotions.length === 0 ? (
                    <div className="text-stone-500 italic">Chưa có lượt thăng cấp nào.</div>
                  ) : (
                    promotions.map(pr => (
                      <div
                        key={pr.id}
                        className="p-2 rounded bg-stone-950 border border-amber-500/30 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-amber-300">{pr.displayName}</span>{' '}
                          <code className="text-[10px] text-stone-400">({pr.userId})</code>
                          <div className="text-[10px] text-stone-300">
                            Thăng từ <span className="text-stone-400">{pr.oldRankName}</span> lên{' '}
                            <strong className="text-yellow-300">{pr.newRankName}</strong> (Tổng:{' '}
                            <strong className="text-emerald-300">{pr.coinValue} X</strong> • Quà: {pr.giftName})
                          </div>
                        </div>
                        <span className="text-[10px] text-stone-500 shrink-0">
                          {new Date(pr.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            7. QUÀ TIKTOK & PHONG ẤN (HAI KHU VỰC QUẢN LÝ RIÊNG, LIÊN KẾT LOGIC)
           ================================================================== */}
        {activeTab === 'tiktok_gifts' && (
          <div className="space-y-5">
            {/* Banner: Nguyên tắc liên kết dữ liệu giữa QUẢN LÝ ID QUÀ TIKTOK và BẢNG PHONG ẤN */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-stone-900 via-purple-950/40 to-stone-900 border border-amber-500/40 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300 text-xs sm:text-sm uppercase flex items-center gap-2">
                  <span>🎁 QUÀ TIKTOK &amp; BẢNG PHONG ẤN (LIÊN KẾT LOGIC X TÍCH LŨY)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px]">
                    Tổng X mới = Tổng X hiện tại + (Giá trị X của ID quà × Số lượng)
                  </span>
                </div>
                <div className="text-[11px] text-stone-300">
                  • <strong>Khu vực 1 (Quản Lý ID Quà TikTok):</strong> Chỉ dùng để nhận diện Gift ID cộng bao nhiêu <strong>X</strong> (tên quà chỉ phục vụ quản trị, <em>không bao giờ</em> hiện lên bảng Phong Ấn).
                  {' '}• <strong>Khu vực 2 (Chỉnh Sửa Bảng Phong Ấn):</strong> Quản lý trực tiếp <strong>Mốc X</strong> và <strong>Tên cấp bậc / Sự kiện</strong> hiển thị trên màn hình LIVE và điều kiện thăng cấp.
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    sectGameManager.resetDemoCoins();
                    liveConnectionManager.emitAdminCommand({ action: 'reset_demo_coins' });
                    notifySync('Đã đặt lại X chế độ Demo về 0!');
                  }}
                  className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  🔄 Đặt Lại X Demo Về 0
                </button>
                <button
                  onClick={() => setActiveTab('ranks')}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black text-[11px] font-bold cursor-pointer"
                >
                  🎖️ Xem Sổ X &amp; Lịch Sử Thăng Cấp
                </button>
              </div>
            </div>

            {/* ==============================================================
                KHU VỰC 1: 1. QUẢN LÝ ID QUÀ TIKTOK
               ============================================================== */}
            <div
              data-testid="section-tiktok-gift-id-manager"
              className="p-4 rounded-xl bg-stone-900/95 border-2 border-purple-500/40 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-amber-300 uppercase tracking-wide">
                    1. QUẢN LÝ ID QUÀ TIKTOK (THEO TỪNG NHÓM GIÁ TRỊ X)
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Phân quà TikTok theo từng nhóm giá trị: <strong>1 X, 5 X, 10 X, 20 X, 50 X, 99 X, 199 X, 1.000 X</strong> (và các nhóm tùy chỉnh 2 X, 3 X, 30 X, 100 X, 500 X...). Mỗi nhóm có ô <strong>TEXTAREA</strong> riêng để dán nhiều ID cùng lúc.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-stone-400">Tạo nhanh nhóm:</span>
                  {[2, 3, 30, 100, 500].map(valX => (
                    <button
                      key={valX}
                      type="button"
                      onClick={async () => {
                        const existing = giftRegistry.getAll().find(g => g.coinValue === valX);
                        if (existing) {
                          notifySync(`Nhóm ${valX} X đã tồn tại (${existing.groupName || existing.giftName})!`);
                          return;
                        }
                        const res = await giftRegistry.createGift({
                          giftName: `Bảo Vật ${valX} X`,
                          groupName: `NHÓM ${valX.toLocaleString('vi-VN')} X`,
                          giftIds: [],
                          giftIdStrings: [],
                          coinValue: valX,
                          rankGranted: 'de_tu',
                        });
                        if (res.ok) {
                          notifySync(`✓ Đã tạo nhóm giá trị mới: ${valX} X!`);
                        }
                      }}
                      className="px-2 py-1 rounded bg-stone-950 hover:bg-purple-900/60 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                    >
                      + {valX} X
                    </button>
                  ))}
                </div>
              </div>

              {/* DANH SÁCH CÁC Ô TEXTAREA THEO TỪNG NHÓM GIÁ TRỊ X (1 X, 5 X, 10 X, 20 X, 50 X, 99 X, 199 X, 1.000 X, ...) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[...giftRegistry.getAll()]
                  .sort((a, b) => a.coinValue - b.coinValue)
                  .map(group => {
                    const groupIds = giftRegistry.getGroupGiftIdStrings(group);
                    const textareaVal =
                      groupBulkTextareas[group.id] !== undefined
                        ? groupBulkTextareas[group.id]
                        : '';
                    const fb = groupBulkFeedback[group.id];
                    const isEditingMeta = editingGroupMetaId === group.id;
                    const singleDraft = singleAddGroupDrafts[group.id] || {
                      giftId: '',
                      giftName: '',
                    };

                    return (
                      <div
                        key={group.id}
                        data-testid={`gift-group-card-${group.id}`}
                        className="p-3 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/40 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          {/* Group Header: Value X + Group Name + Edit X button */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/60 text-amber-300 font-mono font-extrabold text-xs">
                                {group.coinValue.toLocaleString('vi-VN')} X
                              </span>
                              <div>
                                <div className="font-bold text-stone-100 text-xs">
                                  {group.groupName || `NHÓM ${group.coinValue.toLocaleString('vi-VN')} X`}
                                </div>
                                <div className="text-[10px] text-stone-400">
                                  Tên quà mặc định (Admin):{' '}
                                  <strong className="text-stone-200">{group.giftName}</strong> • Đang có:{' '}
                                  <strong className="text-emerald-400">{groupIds.length} ID</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingMeta) {
                                    setEditingGroupMetaId(null);
                                  } else {
                                    setEditingGroupMetaId(group.id);
                                    setGroupCoinValueDraft(group.coinValue);
                                    setGroupAdminGiftNameDraft(group.giftName);
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-[10px] font-semibold cursor-pointer"
                              >
                                {isEditingMeta ? 'Đóng Sửa Nhóm' : '⚙ Sửa Mốc X / Tên Nhóm'}
                              </button>
                              {!group.id.startsWith('gift_tier_') && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await giftRegistry.deleteGift(group.id);
                                    notifySync(`Đã xóa nhóm ${group.coinValue} X!`);
                                  }}
                                  className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-800 text-red-300 border border-red-500/30 text-[10px] cursor-pointer"
                                >
                                  Xóa Nhóm
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Edit Group CoinValue X & Default Admin Gift Name */}
                          {isEditingMeta && (
                            <div className="p-2 rounded bg-stone-900 border border-amber-500/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                              <label className="block">
                                <span className="text-stone-400 block mb-0.5">Giá trị X của nhóm:</span>
                                <input
                                  data-testid={`input-group-coin-${group.id}`}
                                  type="number"
                                  min={1}
                                  value={groupCoinValueDraft}
                                  onChange={e => setGroupCoinValueDraft(Math.max(1, Number(e.target.value)))}
                                  className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 font-mono text-amber-300 font-bold"
                                />
                              </label>
                              <label className="block">
                                <span className="text-stone-400 block mb-0.5">Tên quà quản trị:</span>
                                <input
                                  type="text"
                                  value={groupAdminGiftNameDraft}
                                  onChange={e => setGroupAdminGiftNameDraft(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-stone-100"
                                />
                              </label>
                              <div className="flex items-end gap-1">
                                <button
                                  data-testid={`btn-save-group-coin-${group.id}`}
                                  type="button"
                                  onClick={async () => {
                                    const nextX = Math.max(1, Math.round(groupCoinValueDraft));
                                    const nextName =
                                      groupAdminGiftNameDraft.trim() || `Bảo Vật ${nextX} X`;
                                    const res = await giftRegistry.updateGift(group.id, {
                                      coinValue: nextX,
                                      giftName: nextName,
                                      groupName: `NHÓM ${nextX.toLocaleString('vi-VN')} X`,
                                    });
                                    if (res.ok) {
                                      setEditingGroupMetaId(null);
                                      notifySync(
                                        `✓ Đã cập nhật nhóm thành ${nextX.toLocaleString('vi-VN')} X (${nextName})!`
                                      );
                                    } else {
                                      setGroupBulkFeedback(prev => ({
                                        ...prev,
                                        [group.id]: {
                                          type: 'err',
                                          text: res.error || 'Lỗi cập nhật giá trị X của nhóm.',
                                        },
                                      }));
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                                >
                                  Lưu Giá Trị X
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Large TEXTAREA for pasting multiple Gift IDs into this specific X group */}
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                              <span>
                                Dán nhiều ID quà TikTok cho nhóm{' '}
                                <strong className="text-amber-300">
                                  {group.coinValue.toLocaleString('vi-VN')} X
                                </strong>{' '}
                                (xuống dòng, dấu phẩy hoặc khoảng trắng):
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setGroupBulkTextareas(prev => ({
                                    ...prev,
                                    [group.id]: groupIds.join('\n'),
                                  }))
                                }
                                className="text-sky-400 hover:underline cursor-pointer"
                              >
                                Nạp {groupIds.length} ID hiện tại vào ô
                              </button>
                            </div>
                            <textarea
                              data-testid={`textarea-group-ids-${group.id}`}
                              rows={4}
                              value={textareaVal}
                              onChange={e =>
                                setGroupBulkTextareas(prev => ({
                                  ...prev,
                                  [group.id]: e.target.value,
                                }))
                              }
                              placeholder={`Ví dụ cách nhập (dán 10, 50, 100+ ID):\n5269\n15232\n5760\n9097\n6093`}
                              className="w-full p-2 rounded bg-stone-900 border border-stone-700 font-mono text-xs text-amber-100 leading-relaxed"
                            />
                          </div>

                          {/* Separate Action Buttons: THÊM VÀO DANH SÁCH & THAY THẾ DANH SÁCH */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              data-testid={`btn-append-group-ids-${group.id}`}
                              type="button"
                              onClick={async () => {
                                const raw = (groupBulkTextareas[group.id] || '').trim();
                                if (!raw) {
                                  setGroupBulkFeedback(prev => ({
                                    ...prev,
                                    [group.id]: {
                                      type: 'err',
                                      text: 'Vui lòng dán ít nhất 1 Gift ID vào ô TEXTAREA trước khi bấm THÊM VÀO DANH SÁCH.',
                                    },
                                  }));
                                  return;
                                }
                                const res = await giftRegistry.bulkAddIdsToGroup(group.id, raw);
                                if (!res.ok) {
                                  setGroupBulkFeedback(prev => ({
                                    ...prev,
                                    [group.id]: {
                                      type: 'err',
                                      text: res.error || 'Không thể thêm danh sách ID.',
                                    },
                                  }));
                                } else {
                                  const dupInfo =
                                    res.check.duplicateInBatchIds.length +
                                      res.check.alreadyInSameGroupIds.length >
                                    0
                                      ? ` (Đã tự lọc ${
                                          res.check.duplicateInBatchIds.length +
                                          res.check.alreadyInSameGroupIds.length
                                        } ID trùng)`
                                      : '';
                                  const msg = `✓ Đã THÊM VÀO DANH SÁCH +${res.addedCount} ID cho nhóm ${group.coinValue.toLocaleString(
                                    'vi-VN'
                                  )} X${dupInfo}!`;
                                  setGroupBulkFeedback(prev => ({
                                    ...prev,
                                    [group.id]: { type: 'ok', text: msg },
                                  }));
                                  setGroupBulkTextareas(prev => ({ ...prev, [group.id]: '' }));
                                  notifySync(msg);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-[11px] cursor-pointer shadow"
                            >
                              ➕ THÊM VÀO DANH SÁCH
                            </button>

                            <button
                              data-testid={`btn-replace-group-ids-${group.id}`}
                              type="button"
                              onClick={async () => {
                                const raw = (groupBulkTextareas[group.id] || '').trim();
                                if (!raw) {
                                  setGroupBulkFeedback(prev => ({
                                    ...prev,
                                    [group.id]: {
                                      type: 'err',
                                      text: 'Vui lòng dán danh sách Gift ID mới vào ô TEXTAREA trước khi bấm THAY THẾ DANH SÁCH.',
                                    },
                                  }));
                                  return;
                                }
                                const res = await giftRegistry.bulkReplaceIdsInGroup(group.id, raw);
                                if (!res.ok) {
                                  setGroupBulkFeedback(prev => ({
                                    ...prev,
                                    [group.id]: {
                                      type: 'err',
                                      text: res.error || 'Không thể thay thế danh sách ID.',
                                    },
                                  }));
                                } else {
                                  const msg = `✓ Đã THAY THẾ DANH SÁCH nhóm ${group.coinValue.toLocaleString(
                                    'vi-VN'
                                  )} X bằng ${res.replacedCount} ID hợp lệ!`;
                                  setGroupBulkFeedback(prev => ({
                                    ...prev,
                                    [group.id]: { type: 'ok', text: msg },
                                  }));
                                  setGroupBulkTextareas(prev => ({ ...prev, [group.id]: '' }));
                                  notifySync(msg);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-extrabold text-[11px] cursor-pointer shadow"
                            >
                              🔄 THAY THẾ DANH SÁCH
                            </button>
                          </div>

                          {fb && (
                            <div
                              className={`p-2 rounded text-[11px] font-semibold ${
                                fb.type === 'ok'
                                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                                  : 'bg-red-950/80 border border-red-500/50 text-red-200'
                              }`}
                            >
                              {fb.text}
                            </div>
                          )}

                          {/* Quick Add Individual ID & Active ID Chips inside this group */}
                          <div className="pt-1 border-t border-stone-800/80 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <input
                                type="text"
                                value={singleDraft.giftId}
                                onChange={e =>
                                  setSingleAddGroupDrafts(prev => ({
                                    ...prev,
                                    [group.id]: { ...singleDraft, giftId: e.target.value },
                                  }))
                                }
                                placeholder="Thêm 1 ID lẻ (VD: 5269)"
                                className="w-36 px-2 py-1 rounded bg-stone-900 border border-stone-700 font-mono text-[11px]"
                              />
                              <input
                                type="text"
                                value={singleDraft.giftName}
                                onChange={e =>
                                  setSingleAddGroupDrafts(prev => ({
                                    ...prev,
                                    [group.id]: { ...singleDraft, giftName: e.target.value },
                                  }))
                                }
                                placeholder="Tên quà (tùy chọn)"
                                className="flex-1 min-w-[120px] px-2 py-1 rounded bg-stone-900 border border-stone-700 text-[11px]"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!singleDraft.giftId.trim()) return;
                                  const res = await giftRegistry.bulkAddIdsToGroup(
                                    group.id,
                                    singleDraft.giftId.trim(),
                                    singleDraft.giftName.trim() || undefined
                                  );
                                  if (res.ok) {
                                    setSingleAddGroupDrafts(prev => ({
                                      ...prev,
                                      [group.id]: { giftId: '', giftName: '' },
                                    }));
                                    notifySync(
                                      `Đã thêm ID ${singleDraft.giftId.trim()} vào nhóm ${group.coinValue} X!`
                                    );
                                  } else {
                                    setGroupBulkFeedback(prev => ({
                                      ...prev,
                                      [group.id]: {
                                        type: 'err',
                                        text: res.error || 'Lỗi thêm ID lẻ.',
                                      },
                                    }));
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                + Thêm ID Lẻ
                              </button>
                            </div>

                            {/* Individual ID chips with quick Delete & Edit */}
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5">
                              {groupIds.map(idStr => {
                                const itemMeta = group.giftItems?.[idStr];
                                const labelName = itemMeta?.giftName || group.giftName;
                                return (
                                  <span
                                    key={idStr}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-[10px] font-mono text-amber-200"
                                    title={`${labelName} (${group.coinValue} X)`}
                                  >
                                    <strong>{idStr}</strong>
                                    <span className="text-stone-400 font-sans truncate max-w-[90px]">
                                      {labelName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await giftRegistry.removeGiftIdFromGroup(group.id, idStr);
                                        notifySync(
                                          `Đã xóa ID ${idStr} khỏi nhóm ${group.coinValue} X!`
                                        );
                                      }}
                                      className="text-red-400 hover:text-red-300 font-bold ml-0.5 cursor-pointer"
                                      title={`Xóa ID ${idStr}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* A. CÔNG CỤ KIỂM TRA & DÁN HÀNG LOẠT TỔNG HỢP */}
              <div
                data-testid="panel-bulk-gift-ids"
                className="p-3.5 rounded-lg bg-stone-950 border border-purple-500/40 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-purple-300 uppercase text-xs">
                      🔍 Công Cụ Kiểm Tra Chi Tiết &amp; Dán Nhanh Theo Nhóm Chọn
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Kiểm tra trước số lượng ID mới, ID trùng và xung đột nhóm trước khi bấm THÊM VÀO DANH SÁCH hoặc THAY THẾ DANH SÁCH.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {giftRegistry.getAll().map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setBulkTargetGroupId(preset.id);
                          setBulkCheckPreview(null);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                          bulkTargetGroupId === preset.id
                            ? 'bg-purple-600 text-white border border-amber-300 shadow'
                            : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {preset.coinValue.toLocaleString('vi-VN')} X
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="block text-[11px]">
                    <span className="text-stone-400 block mb-1">Chọn nhóm giá trị đích:</span>
                    <select
                      data-testid="select-bulk-gift-group"
                      value={bulkTargetGroupId}
                      onChange={e => {
                        setBulkTargetGroupId(e.target.value);
                        setBulkCheckPreview(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold"
                    >
                      {giftRegistry.getAll().map(g => (
                        <option key={g.id} value={g.id}>
                          {g.groupName || `NHÓM ${g.coinValue} X`} — {g.giftName} (
                          {g.coinValue.toLocaleString('vi-VN')} X)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[11px]">
                    <span className="text-stone-400 block mb-1">
                      Tên quà mặc định cho các ID mới (chỉ hiển thị trong Admin):
                    </span>
                    <input
                      type="text"
                      value={bulkDefaultGiftName}
                      onChange={e => setBulkDefaultGiftName(e.target.value)}
                      placeholder="Để trống sẽ dùng tên nhóm quà"
                      className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-stone-100"
                    />
                  </label>

                  <label className="flex items-center gap-2 pt-5 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={bulkOverwriteConflicts}
                      onChange={e => setBulkOverwriteConflicts(e.target.checked)}
                    />
                    <span className="text-amber-200 font-semibold">
                      Chuyển luôn ID sang nhóm này nếu đang nằm ở nhóm giá trị khác
                    </span>
                  </label>
                </div>

                <textarea
                  data-testid="textarea-bulk-gift-ids"
                  rows={3}
                  value={bulkRawInput}
                  onChange={e => {
                    setBulkRawInput(e.target.value);
                    setBulkCheckPreview(null);
                  }}
                  placeholder={`Dán danh sách Gift ID TikTok vào đây (VD:\n5269\n15232\n5760\n9097\n6093\nhoặc cách nhau bằng dấu phẩy / khoảng trắng)...`}
                  className="w-full p-2.5 rounded bg-stone-900 border border-stone-700 font-mono text-xs text-amber-100"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      data-testid="btn-inspect-bulk-gift-ids"
                      type="button"
                      onClick={() => {
                        const check = giftRegistry.inspectBulkGiftIds(
                          bulkRawInput,
                          bulkTargetGroupId
                        );
                        setBulkCheckPreview(check);
                      }}
                      className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer shadow"
                    >
                      🔍 KIỂM TRA TRƯỚC KHI LƯU
                    </button>

                    <button
                      data-testid="btn-confirm-save-bulk-gift-ids"
                      type="button"
                      onClick={async () => {
                        const preview =
                          bulkCheckPreview ||
                          giftRegistry.inspectBulkGiftIds(bulkRawInput, bulkTargetGroupId);
                        if (bulkOverwriteConflicts && preview.conflictOtherGroups.length > 0) {
                          for (const c of preview.conflictOtherGroups) {
                            await giftRegistry.moveGiftIdBetweenGroups(
                              c.giftId,
                              c.groupId,
                              bulkTargetGroupId
                            );
                          }
                        }
                        const res = await giftRegistry.bulkAddIdsToGroup(
                          bulkTargetGroupId,
                          bulkRawInput,
                          bulkDefaultGiftName.trim() || undefined
                        );
                        if (
                          !res.ok &&
                          !(bulkOverwriteConflicts && preview.conflictOtherGroups.length > 0)
                        ) {
                          setGiftError(res.error || 'Lỗi thêm danh sách ID quà');
                        } else {
                          setGiftError(null);
                          setBulkRawInput('');
                          setBulkCheckPreview(null);
                          notifySync(
                            `✓ Đã THÊM VÀO DANH SÁCH ${
                              res.addedCount +
                              (bulkOverwriteConflicts ? preview.conflictOtherGroups.length : 0)
                            } ID quà vào nhóm!`
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer shadow"
                    >
                      ➕ THÊM VÀO DANH SÁCH
                    </button>

                    <button
                      data-testid="btn-confirm-replace-bulk-gift-ids"
                      type="button"
                      onClick={async () => {
                        const preview =
                          bulkCheckPreview ||
                          giftRegistry.inspectBulkGiftIds(bulkRawInput, bulkTargetGroupId);
                        if (bulkOverwriteConflicts && preview.conflictOtherGroups.length > 0) {
                          for (const c of preview.conflictOtherGroups) {
                            await giftRegistry.moveGiftIdBetweenGroups(
                              c.giftId,
                              c.groupId,
                              bulkTargetGroupId
                            );
                          }
                        }
                        const res = await giftRegistry.bulkReplaceIdsInGroup(
                          bulkTargetGroupId,
                          bulkRawInput,
                          bulkDefaultGiftName.trim() || undefined
                        );
                        if (!res.ok) {
                          setGiftError(res.error || 'Lỗi thay thế danh sách ID quà');
                        } else {
                          setGiftError(null);
                          setBulkRawInput('');
                          setBulkCheckPreview(null);
                          notifySync(
                            `✓ Đã THAY THẾ DANH SÁCH nhóm bằng ${res.replacedCount} ID quà!`
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-extrabold cursor-pointer shadow"
                    >
                      🔄 THAY THẾ DANH SÁCH
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const sample20 = Array.from({ length: 20 }, (_, i) =>
                        String(11001 + i)
                      ).join(', ');
                      setBulkTargetGroupId('gift_tier_1');
                      setBulkRawInput(sample20);
                      setBulkCheckPreview(
                        giftRegistry.inspectBulkGiftIds(sample20, 'gift_tier_1')
                      );
                    }}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-[11px] font-semibold cursor-pointer"
                  >
                    ⚡ Điền Mẫu 20 ID Nhóm 1 X Để Test
                  </button>
                </div>

                {bulkCheckPreview && (
                  <div
                    data-testid="bulk-gift-preview-box"
                    className="p-3 rounded bg-stone-900 border border-purple-500/50 space-y-1.5 text-[11px]"
                  >
                    <div className="font-bold text-amber-300">
                      📋 Kết Quả Kiểm Tra Danh Sách ID Trước Khi Lưu:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                      <div className="p-1.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                        Hợp lệ mới: <strong>{bulkCheckPreview.validNewIds.length}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-stone-950 border border-stone-700 text-stone-300">
                        Trùng trong lần nhập:{' '}
                        <strong>{bulkCheckPreview.duplicateInBatchIds.length}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-sky-950/70 border border-sky-500/40 text-sky-300">
                        Đã có trong nhóm:{' '}
                        <strong>{bulkCheckPreview.alreadyInSameGroupIds.length}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
                        Xung đột nhóm khác:{' '}
                        <strong>{bulkCheckPreview.conflictOtherGroups.length}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-red-950/70 border border-red-500/40 text-red-300">
                        ID lỗi định dạng: <strong>{bulkCheckPreview.invalidTokens.length}</strong>
                      </div>
                    </div>
                    {bulkCheckPreview.conflictOtherGroups.length > 0 && (
                      <div className="text-amber-300 font-semibold">
                        ⚠️ Cảnh báo xung đột nhóm:{' '}
                        {bulkCheckPreview.conflictOtherGroups
                          .map(c => `ID ${c.giftId} đang thuộc ${c.groupName} (${c.coinValue} X)`)
                          .join(' • ')}
                      </div>
                    )}
                    {bulkCheckPreview.invalidTokens.length > 0 && (
                      <div className="text-red-300">
                        ❌ Các chuỗi không phải ID số hợp lệ: [
                        {bulkCheckPreview.invalidTokens.join(', ')}]
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* B. TẠO NHÓM GIÁ TRỊ QUÀ MỚI TÙY CHỈNH (2 X, 3 X, 30 X, 100 X, 500 X...) & XUẤT/NHẬP JSON/CSV */}
              <div className="p-3 rounded-lg bg-stone-950 border border-amber-500/30 space-y-2.5">
                <div className="font-bold text-amber-400 uppercase text-xs">
                  ➕ Tạo Nhóm Giá Trị X Tùy Chỉnh Mới (VD: 2 X, 3 X, 30 X, 100 X, 500 X...)
                </div>
                {giftError && (
                  <div className="p-2 rounded bg-red-950 border border-red-500 text-red-200 text-[11px]">
                    ⚠️ {giftError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={giftNameInput}
                    onChange={e => setGiftNameInput(e.target.value)}
                    placeholder="Tên quà quản trị (VD: Quà Lẻ 30 X)"
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700"
                  />
                  <input
                    type="text"
                    value={giftIdsInput}
                    onChange={e => setGiftIdsInput(e.target.value)}
                    placeholder="Danh sách Gift ID ban đầu (VD: 5269, 15232)"
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 font-mono"
                  />
                  <input
                    type="number"
                    min={1}
                    value={giftCoinsInput}
                    onChange={e => setGiftCoinsInput(Math.max(1, Number(e.target.value)))}
                    placeholder="Giá trị X"
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 font-mono text-amber-300 font-bold"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">
                    Mọi nhóm quà mới đều tự động có ô TEXTAREA riêng ở trên và lưu bền vững.
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        setGiftError(null);
                        const parsedIds = giftIdsInput
                          .split(/[\n,;|\s]+/)
                          .map(s => s.trim())
                          .filter(Boolean);
                        const res = await giftRegistry.createGift({
                          giftName: giftNameInput || `Nhóm Quà ${giftCoinsInput} X`,
                          groupName: `NHÓM ${giftCoinsInput.toLocaleString('vi-VN')} X`,
                          giftIds: parsedIds,
                          giftIdStrings: parsedIds,
                          coinValue: giftCoinsInput,
                          rankGranted: giftCoinsInput >= 199 ? 'giao_chu' : 'de_tu',
                          grantsThrone: giftCoinsInput >= 199,
                          grantsCoLeader: giftCoinsInput >= 99 && giftCoinsInput < 199,
                        });
                        if (!res.ok) {
                          setGiftError(res.error || 'Lỗi thêm nhóm quà');
                        } else {
                          setGiftNameInput('');
                          setGiftIdsInput('');
                          notifySync(`Đã tạo nhóm giá trị ${giftCoinsInput} X thành công!`);
                        }
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                    >
                      + Tạo Nhóm Giá Trị X Mới
                    </button>
                    <button
                      onClick={() => {
                        const jsonStr = giftRegistry.exportJson();
                        const blob = new Blob([jsonStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `magiao-gifts-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        notifySync('Đã xuất danh sách quà ra file JSON!');
                      }}
                      className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-semibold cursor-pointer"
                    >
                      ⬇ Xuất JSON
                    </button>
                    <button
                      onClick={() => {
                        const csvStr = giftRegistry.exportCsv();
                        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `magiao-gifts-${Date.now()}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        notifySync('Đã xuất danh sách quà ra file CSV!');
                      }}
                      className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer"
                    >
                      ⬇ Xuất CSV
                    </button>
                    <button
                      onClick={() => setShowGiftImportBox(v => !v)}
                      className="px-3 py-1.5 rounded bg-sky-800 hover:bg-sky-700 text-white font-semibold cursor-pointer"
                    >
                      ⬆ Nhập JSON / CSV
                    </button>
                    <button
                      onClick={async () => {
                        await giftRegistry.resetToDefaults();
                        notifySync('Đã khôi phục danh sách nhóm ID quà mặc định!');
                      }}
                      className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                    >
                      ↺ Mặc Định
                    </button>
                  </div>
                </div>

                {showGiftImportBox && (
                  <div className="p-2.5 rounded bg-stone-900 border border-sky-500/40 space-y-2">
                    <div className="text-sky-300 font-semibold text-[11px]">
                      Dán nội dung JSON hoặc CSV (`giftId,giftName,coinValue,groupName,enabled`) để nhập:
                    </div>
                    <textarea
                      rows={3}
                      value={giftImportText}
                      onChange={e => setGiftImportText(e.target.value)}
                      placeholder="Dán JSON hoặc CSV vào đây..."
                      className="w-full p-2 rounded bg-stone-950 border border-stone-700 font-mono text-[10px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const raw = giftImportText.trim();
                          if (!raw) return;
                          const res =
                            raw.startsWith('[') || raw.startsWith('{')
                              ? await giftRegistry.importJson(raw)
                              : await giftRegistry.importCsv(raw);
                          if (!res.ok) {
                            setGiftError(res.error || 'Lỗi nhập dữ liệu quà');
                          } else {
                            setGiftError(null);
                            setGiftImportText('');
                            setShowGiftImportBox(false);
                            notifySync('Đã nhập danh sách quà thành công!');
                          }
                        }}
                        className="px-3 py-1 rounded bg-sky-600 text-white font-bold cursor-pointer"
                      >
                        ✓ Xác Nhận Nhập
                      </button>
                      <button
                        onClick={() => setShowGiftImportBox(false)}
                        className="px-3 py-1 rounded bg-stone-800 text-stone-300 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* C. BẢNG TRA CỨU & SỬA/XÓA RIÊNG LẺ TỪNG ID QUÀ TIKTOK */}
              <div
                data-testid="panel-gift-management-table"
                className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-amber-400 uppercase text-xs">
                    📋 Danh Sách Quản Trị Chi Tiết Từng ID Quà TikTok ({giftRegistry.getFlattenedGiftItems().length} ID)
                  </div>
                  <input
                    data-testid="input-search-gift-table"
                    type="text"
                    value={giftTableSearch}
                    onChange={e => setGiftTableSearch(e.target.value)}
                    placeholder="🔍 Tìm theo ID TikTok hoặc Tên quà..."
                    className="w-64 px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-stone-100 text-xs"
                  />
                </div>

                {/* Bộ lọc nhanh theo nhóm X */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 mr-1">Lọc nhanh theo nhóm X:</span>
                  <button
                    type="button"
                    onClick={() => setGiftTableValueFilter('ALL')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                      giftTableValueFilter === 'ALL'
                        ? 'bg-amber-500 text-black shadow'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                    }`}
                  >
                    TẤT CẢ
                  </button>
                  {Array.from(new Set(giftRegistry.getAll().map(g => g.coinValue)))
                    .sort((a, b) => a - b)
                    .map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGiftTableValueFilter(val)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                          giftTableValueFilter === val
                            ? 'bg-amber-500 text-black shadow'
                            : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {val.toLocaleString('vi-VN')} X
                      </button>
                    ))}
                </div>

                <div className="max-h-[320px] overflow-x-auto overflow-y-auto rounded border border-stone-800">
                  <table className="w-full text-left border-collapse text-[11px] tabular-nums">
                    <thead className="bg-stone-900 text-stone-400 sticky top-0 z-10 border-b border-stone-800">
                      <tr>
                        <th className="p-2">ID TikTok</th>
                        <th className="p-2">Tên quà (Chỉ dùng trong Admin)</th>
                        <th className="p-2">Giá trị X</th>
                        <th className="p-2">Trạng thái</th>
                        <th className="p-2 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/70">
                      {giftRegistry
                        .getFlattenedGiftItems()
                        .filter(row => {
                          if (
                            giftTableValueFilter !== 'ALL' &&
                            row.coinValue !== giftTableValueFilter
                          ) {
                            return false;
                          }
                          if (giftTableSearch.trim()) {
                            const q = giftTableSearch.trim().toLowerCase();
                            return (
                              row.giftId.toLowerCase().includes(q) ||
                              row.giftName.toLowerCase().includes(q) ||
                              row.groupName.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map(row => {
                          const rowKey = `${row.groupId}:${row.giftId}`;
                          const isEditing = editingGiftIdKey === rowKey;
                          const isMoving = movingGiftIdKey === rowKey;

                          return (
                            <tr key={rowKey} className="bg-stone-950/70 hover:bg-stone-900">
                              <td className="p-2 font-mono font-bold text-amber-300">
                                <code>{row.giftId}</code>
                              </td>
                              <td className="p-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingGiftNameDraft}
                                      onChange={e => setEditingGiftNameDraft(e.target.value)}
                                      className="px-2 py-0.5 rounded bg-stone-900 border border-amber-500 text-stone-100 text-xs"
                                    />
                                    <button
                                      onClick={async () => {
                                        await giftRegistry.updateGiftItemMetadata(
                                          row.groupId,
                                          row.giftId,
                                          {
                                            giftName:
                                              editingGiftNameDraft.trim() || row.giftName,
                                          }
                                        );
                                        setEditingGiftIdKey(null);
                                        notifySync(`Đã cập nhật tên quà quản trị cho ID ${row.giftId}!`);
                                      }}
                                      className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold cursor-pointer"
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      onClick={() => setEditingGiftIdKey(null)}
                                      className="px-2 py-0.5 rounded bg-stone-700 text-stone-200 cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-semibold text-stone-100">
                                      {row.giftName}
                                    </span>
                                    <span className="ml-2 text-[10px] text-stone-400">
                                      ({row.groupName})
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-400">
                                {row.coinValue.toLocaleString('vi-VN')} X
                              </td>
                              <td className="p-2">
                                <button
                                  onClick={async () => {
                                    await giftRegistry.updateGiftItemMetadata(
                                      row.groupId,
                                      row.giftId,
                                      {
                                        enabled: !row.enabled,
                                      }
                                    );
                                    notifySync(
                                      `Đã ${!row.enabled ? 'BẬT' : 'TẮT'} ID quà ${row.giftId}!`
                                    );
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                    row.enabled
                                      ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                                      : 'bg-stone-800 border border-stone-600 text-stone-400'
                                  }`}
                                >
                                  {row.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                                </button>
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      const evt: TikTokLiveEvent = {
                                        id: `test_id_${row.giftId}_${Date.now()}`,
                                        type: 'gift',
                                        timestamp: Date.now(),
                                        userId: selectedDisciple?.userId || 'demo_gifter_01',
                                        uniqueId: selectedDisciple?.uniqueId || 'demo_gifter_01',
                                        nickname:
                                          selectedDisciple?.displayName || 'Lệnh Hồ Xung',
                                        giftId: row.giftId,
                                        giftName: row.giftName,
                                        giftCount: 1,
                                        coinValue: row.coinValue,
                                        isDemo: true,
                                      };
                                      const res = sectGameManager.handleGiftEvent(evt);
                                      liveConnectionManager.emitAdminCommand({
                                        action: 'test_live_event',
                                        event: evt,
                                      });
                                      notifySync(
                                        `Test ID ${row.giftId} ➔ ${res.disciple.displayName}: +${res.addedCoins} X (Tổng: ${res.disciple.totalCoins} X • Cấp bậc Phong Ấn: ${res.newRankName})`
                                      );
                                    }}
                                    className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                                  >
                                    Test
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingGiftIdKey(rowKey);
                                      setEditingGiftNameDraft(row.giftName);
                                    }}
                                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 cursor-pointer"
                                  >
                                    Sửa Tên
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMovingGiftIdKey(isMoving ? null : rowKey);
                                      const otherGroup = giftRegistry
                                        .getAll()
                                        .find(g => g.id !== row.groupId);
                                      if (otherGroup) setMovingTargetGroupId(otherGroup.id);
                                    }}
                                    className="px-2 py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 cursor-pointer"
                                  >
                                    Chuyển Nhóm
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await giftRegistry.removeGiftIdFromGroup(
                                        row.groupId,
                                        row.giftId
                                      );
                                      notifySync(
                                        `Đã xóa ID ${row.giftId} khỏi ${row.groupName}!`
                                      );
                                    }}
                                    className="px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-red-200 cursor-pointer"
                                  >
                                    Xóa
                                  </button>
                                </div>
                                {isMoving && (
                                  <div className="mt-1.5 flex items-center justify-end gap-1">
                                    <select
                                      value={movingTargetGroupId}
                                      onChange={e => setMovingTargetGroupId(e.target.value)}
                                      className="px-2 py-0.5 rounded bg-stone-900 border border-purple-500 text-amber-200 text-[10px]"
                                    >
                                      {giftRegistry
                                        .getAll()
                                        .filter(g => g.id !== row.groupId)
                                        .map(g => (
                                          <option key={g.id} value={g.id}>
                                            {g.groupName || `NHÓM ${g.coinValue} X`} ({g.coinValue}{' '}
                                            X)
                                          </option>
                                        ))}
                                    </select>
                                    <button
                                      onClick={async () => {
                                        const res = await giftRegistry.moveGiftIdBetweenGroups(
                                          row.giftId,
                                          row.groupId,
                                          movingTargetGroupId
                                        );
                                        if (res.ok) {
                                          setMovingGiftIdKey(null);
                                          notifySync(
                                            `Đã chuyển ID ${row.giftId} sang nhóm mới!`
                                          );
                                        }
                                      }}
                                      className="px-2 py-0.5 rounded bg-purple-600 text-white font-bold cursor-pointer"
                                    >
                                      Xác Nhận Chuyển
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ==============================================================
                KHU VỰC 2: 2. CHỈNH SỬA BẢNG PHONG ẤN (HIỂN THỊ LIVE & MỐC THĂNG CẤP)
               ============================================================== */}
            <div
              data-testid="section-phong-an-editor"
              className="p-4 rounded-xl bg-stone-900/95 border-2 border-amber-500/50 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-amber-300 uppercase tracking-wide">
                    2. CHỈNH SỬA BẢNG PHONG ẤN (HIỂN THỊ TRÊN LIVE &amp; ĐIỀU KIỆN PHONG CẤP)
                  </h3>
                  <p className="text-[11px] text-stone-300">
                    Bảng <strong>PHONG ẤN</strong> ngoài màn hình LIVE chỉ hiển thị: <strong>Icon SVG Ma Giáo + Số X + Tên cấp bậc / Sự kiện</strong> (không hiển thị ID quà, tên quà hay icon quà TikTok). Sửa tên cấp bậc hoặc mốc X tại đây sẽ cập nhật ngay lên LIVE và logic thăng cấp mà không làm thay đổi giá trị X của các ID quà.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    data-testid="btn-toggle-add-phong-an-rank"
                    type="button"
                    onClick={() => setShowAddPhongAnRankBox(v => !v)}
                    className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold cursor-pointer shadow"
                  >
                    + Thêm Cấp Bậc Mới
                  </button>
                  <button
                    data-testid="btn-save-phong-an-live"
                    type="button"
                    onClick={() => {
                      updateAndSyncConfig(d => {
                        d.ranks = sectGameManager.getConfig().ranks;
                        d.dietMonConfig = sectGameManager.getConfig().dietMonConfig;
                      }, '✓ Đã lưu BẢNG PHONG ẤN và cập nhật ngay lên màn hình LIVE & OBS!');
                    }}
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shadow-lg"
                  >
                    💾 LƯU THAY ĐỔI &amp; CẬP NHẬT LIVE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sectGameManager.resetRanksToDefault();
                      updateAndSyncConfig(d => {
                        d.ranks = sectGameManager.getConfig().ranks;
                        d.dietMonConfig = sectGameManager.getConfig().dietMonConfig;
                      }, 'Đã khôi phục mặc định BẢNG PHONG ẤN (1 X..199 X & 1.000 X DIỆT MÔN)!');
                    }}
                    className="px-2.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs cursor-pointer"
                  >
                    ↺ Khôi Phục Mặc Định
                  </button>
                </div>
              </div>

              {/* Box thêm cấp bậc mới vào BẢNG PHONG ẤN */}
              {showAddPhongAnRankBox && (
                <div
                  data-testid="box-add-phong-an-rank"
                  className="p-3 rounded-lg bg-stone-950 border border-purple-500/50 space-y-2"
                >
                  <div className="font-bold text-purple-300 text-xs">
                    ➕ Thêm Cấp Bậc Mới Vào Bảng PHONG ẤN &amp; Hệ Thống Phong Cấp
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="block text-[11px]">
                      <span className="text-stone-400 block mb-1">Mốc X cần đạt:</span>
                      <input
                        data-testid="input-new-phong-an-coins"
                        type="number"
                        min={1}
                        value={newPhongAnRankCoins}
                        onChange={e => setNewPhongAnRankCoins(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 font-mono text-amber-300 font-bold"
                      />
                    </label>
                    <label className="block text-[11px]">
                      <span className="text-stone-400 block mb-1">Tên cấp bậc hiển thị trên PHONG ẤN:</span>
                      <input
                        data-testid="input-new-phong-an-name"
                        type="text"
                        value={newPhongAnRankName}
                        onChange={e => setNewPhongAnRankName(e.target.value)}
                        placeholder="VD: Thái Thượng Trưởng Lão"
                        className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-stone-100"
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <button
                        data-testid="btn-confirm-add-phong-an-rank"
                        type="button"
                        onClick={() => {
                          if (!newPhongAnRankName.trim()) {
                            notifySync('Vui lòng nhập tên cấp bậc mới!');
                            return;
                          }
                          const created = sectGameManager.addPhongAnRankRow({
                            minCoins: newPhongAnRankCoins,
                            name: newPhongAnRankName.trim(),
                            enabled: true,
                          });
                          updateAndSyncConfig(d => {
                            d.ranks = sectGameManager.getConfig().ranks;
                          }, `✓ Đã thêm cấp bậc "${created.name}" (${created.minCoins} X) vào bảng PHONG ẤN!`);
                          setNewPhongAnRankName('');
                          setShowAddPhongAnRankBox(false);
                        }}
                        className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        ✓ Thêm Vào Bảng PHONG ẤN
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddPhongAnRankBox(false)}
                        className="px-2.5 py-1.5 rounded bg-stone-800 text-stone-300 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid 2 Cột: Cột Trái = Bảng chỉnh sửa trực tiếp | Cột Phải = XEM TRƯỚC BẢNG PHONG ẤN LIVE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Cột Trái (2/3): Bảng chỉnh sửa trực tiếp | Mốc X | Tên cấp bậc / Sự kiện | Thứ tự | Bật/Tắt | Chỉnh sửa | */}
                <div className="lg:col-span-2 overflow-x-auto rounded-lg border border-stone-800 bg-stone-950">
                  <table
                    data-testid="table-phong-an-editor"
                    className="w-full text-left border-collapse text-xs tabular-nums"
                  >
                    <thead className="bg-stone-900 text-stone-300 border-b border-stone-800">
                      <tr>
                        <th className="p-2.5">Mốc X</th>
                        <th className="p-2.5">Tên cấp bậc / Sự kiện</th>
                        <th className="p-2.5">Thứ tự</th>
                        <th className="p-2.5">Hiển thị</th>
                        <th className="p-2.5 text-right">Chỉnh sửa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/80">
                      {sectGameManager.getPhongAnDisplayRows(true).map((row, idx, arr) => {
                        const isEditingRow = editingPhongAnRowId === row.id;

                        return (
                          <tr
                            key={row.id}
                            data-testid={`phong-an-row-${row.id}`}
                            className={`${
                              row.isDietMon
                                ? 'bg-red-950/30 hover:bg-red-950/50'
                                : 'bg-stone-950 hover:bg-stone-900/80'
                            } ${!row.enabled ? 'opacity-50' : ''}`}
                          >
                            {/* Mốc X */}
                            <td className="p-2.5 font-mono font-bold text-amber-300">
                              {isEditingRow ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    data-testid={`input-phong-an-coins-${row.id}`}
                                    type="number"
                                    min={1}
                                    value={phongAnDraftCoins}
                                    onChange={e =>
                                      setPhongAnDraftCoins(Math.max(1, Number(e.target.value)))
                                    }
                                    className="w-20 px-2 py-1 rounded bg-stone-900 border border-amber-500 text-amber-300 font-mono font-bold text-xs"
                                  />
                                  <span>X</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <MaGiaoRankEmblemSVG
                                    coreColor={row.isDietMon ? '#DC2626' : '#F59E0B'}
                                    flameColor={row.isDietMon ? '#FACC15' : '#A855F7'}
                                    isApocalypse={row.isDietMon}
                                  />
                                  <span>{row.minCoins.toLocaleString('vi-VN')} X</span>
                                </span>
                              )}
                            </td>

                            {/* Tên cấp bậc / Sự kiện */}
                            <td className="p-2.5">
                              {isEditingRow ? (
                                <input
                                  data-testid={`input-phong-an-name-${row.id}`}
                                  type="text"
                                  value={phongAnDraftName}
                                  onChange={e => setPhongAnDraftName(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-stone-900 border border-amber-500 text-stone-100 font-bold text-xs"
                                />
                              ) : (
                                <span
                                  className={`font-bold ${
                                    row.isDietMon ? 'text-red-400' : 'text-stone-100'
                                  }`}
                                >
                                  {row.title}
                                </span>
                              )}
                            </td>

                            {/* Thứ tự hiển thị */}
                            <td className="p-2.5 font-mono text-[11px]">
                              {isEditingRow ? (
                                <input
                                  type="number"
                                  value={phongAnDraftOrder}
                                  onChange={e => setPhongAnDraftOrder(Number(e.target.value))}
                                  className="w-16 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200 font-mono text-xs"
                                />
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-400">#{idx + 1}</span>
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      if (idx === 0) return;
                                      const prevRow = arr[idx - 1];
                                      const curOrder = row.displayOrder;
                                      const prevOrder = prevRow.displayOrder;
                                      sectGameManager.updatePhongAnRow(row.id, {
                                        displayOrder: prevOrder - 1,
                                      });
                                      sectGameManager.updatePhongAnRow(prevRow.id, {
                                        displayOrder: curOrder + 1,
                                      });
                                      updateAndSyncConfig(d => {
                                        d.ranks = sectGameManager.getConfig().ranks;
                                        d.dietMonConfig = sectGameManager.getConfig().dietMonConfig;
                                      }, `Đã chuyển "${row.title}" lên trên!`);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 cursor-pointer"
                                    title="Đưa lên trên"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === arr.length - 1}
                                    onClick={() => {
                                      if (idx === arr.length - 1) return;
                                      const nextRow = arr[idx + 1];
                                      const curOrder = row.displayOrder;
                                      const nextOrder = nextRow.displayOrder;
                                      sectGameManager.updatePhongAnRow(row.id, {
                                        displayOrder: nextOrder + 1,
                                      });
                                      sectGameManager.updatePhongAnRow(nextRow.id, {
                                        displayOrder: curOrder - 1,
                                      });
                                      updateAndSyncConfig(d => {
                                        d.ranks = sectGameManager.getConfig().ranks;
                                        d.dietMonConfig = sectGameManager.getConfig().dietMonConfig;
                                      }, `Đã chuyển "${row.title}" xuống dưới!`);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 cursor-pointer"
                                    title="Đưa xuống dưới"
                                  >
                                    ▼
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Bật/Tắt từng dòng */}
                            <td className="p-2.5">
                              <button
                                data-testid={`btn-toggle-phong-an-row-${row.id}`}
                                type="button"
                                onClick={() => {
                                  sectGameManager.updatePhongAnRow(row.id, {
                                    enabled: !row.enabled,
                                  });
                                  updateAndSyncConfig(d => {
                                    d.ranks = sectGameManager.getConfig().ranks;
                                    d.dietMonConfig = sectGameManager.getConfig().dietMonConfig;
                                  }, `Đã ${!row.enabled ? 'BẬT' : 'TẮT'} dòng "${row.title}" trên bảng PHONG ẤN!`);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  row.enabled
                                    ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                                    : 'bg-stone-800 border border-stone-600 text-stone-400'
                                }`}
                              >
                                {row.enabled ? 'HIỆN' : 'ẨN'}
                              </button>
                            </td>

                            {/* Nút Sửa / Lưu */}
                            <td className="p-2.5 text-right">
                              {isEditingRow ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    data-testid={`btn-save-phong-an-row-${row.id}`}
                                    type="button"
                                    onClick={() => {
                                      sectGameManager.updatePhongAnRow(row.id, {
                                        minCoins: phongAnDraftCoins,
                                        name: phongAnDraftName.trim() || row.title,
                                        displayOrder: phongAnDraftOrder,
                                        enabled: phongAnDraftEnabled,
                                      });
                                      setEditingPhongAnRowId(null);
                                      updateAndSyncConfig(d => {
                                        d.ranks = sectGameManager.getConfig().ranks;
                                        d.dietMonConfig = sectGameManager.getConfig().dietMonConfig;
                                      }, `✓ Đã cập nhật "${phongAnDraftName.trim() || row.title}" (${phongAnDraftCoins} X) lên bảng PHONG ẤN & LIVE!`);
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPhongAnRowId(null)}
                                    className="px-2 py-1 rounded bg-stone-700 text-stone-200 cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  data-testid={`btn-edit-phong-an-row-${row.id}`}
                                  type="button"
                                  onClick={() => {
                                    setEditingPhongAnRowId(row.id);
                                    setPhongAnDraftCoins(row.minCoins);
                                    setPhongAnDraftName(row.title);
                                    setPhongAnDraftOrder(row.displayOrder);
                                    setPhongAnDraftEnabled(row.enabled);
                                  }}
                                  className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                                >
                                  Sửa
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cột Phải (1/3): XEM TRƯỚC BẢNG PHONG ẤN TRÊN MÀN HÌNH LIVE */}
                <div className="p-3.5 rounded-lg bg-stone-950 border border-amber-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-300 uppercase">
                      👁️ XEM TRƯỚC BẢNG PHONG ẤN (LIVE 9:16)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Alpha nền: {(config.overlayConfig.panelBgOpacity ?? 0.4).toFixed(2)}
                    </span>
                  </div>

                  {/* Bản xem trước chuẩn xác 100% như trên màn hình LIVE */}
                  <div
                    data-testid="phong-an-live-preview"
                    className="mx-auto w-full max-w-[230px] rounded-lg border border-[#D4AF37]/70 p-2.5 shadow-lg"
                    style={{
                      backgroundColor: `rgba(12, 8, 22, ${config.overlayConfig.panelBgOpacity ?? 0.4})`,
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.96), 0 0 6px rgba(0, 0, 0, 0.85)',
                    }}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 border-b border-amber-400/35 pb-1 mb-1.5 flex items-center gap-1">
                      <MaGiaoRankEmblemSVG coreColor="#EF4444" flameColor="#F59E0B" />
                      <span>PHONG ẤN</span>
                    </div>
                    <div className="space-y-1 text-[11px] leading-snug tabular-nums font-semibold">
                      {sectGameManager.getPhongAnDisplayRows(false).map(row => (
                        <div
                          key={row.id}
                          className={`flex items-center justify-between ${
                            row.isDietMon
                              ? 'text-red-200 font-bold pt-1 border-t border-amber-400/40'
                              : 'text-white'
                          }`}
                        >
                          <span
                            className={`flex items-center font-mono shrink-0 ${
                              row.isDietMon ? 'text-yellow-300' : 'text-amber-100'
                            }`}
                          >
                            <MaGiaoRankEmblemSVG
                              coreColor={
                                row.isDietMon
                                  ? '#DC2626'
                                  : row.minCoins >= 199
                                  ? '#EF4444'
                                  : row.minCoins >= 99
                                  ? '#F59E0B'
                                  : '#10B981'
                              }
                              flameColor={row.isDietMon || row.minCoins >= 199 ? '#FACC15' : '#A855F7'}
                              isApocalypse={row.isDietMon}
                            />
                            {row.minCoins.toLocaleString('vi-VN')} X
                          </span>
                          <span
                            className={`truncate ml-2 ${
                              row.isDietMon
                                ? 'text-red-400'
                                : row.minCoins >= 199
                                ? 'text-yellow-300 font-bold'
                                : row.minCoins >= 99
                                ? 'text-amber-300 font-bold'
                                : 'text-emerald-300'
                            }`}
                          >
                            {row.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-400 space-y-1 pt-1 border-t border-stone-800">
                    <div>
                      ✅ Chỉ hiển thị: <strong>Icon SVG Ma Giáo + Số X + Tên cấp bậc / Sự kiện</strong>.
                    </div>
                    <div>
                      🚫 Tuyệt đối không hiển thị ID quà, tên quà TikTok hay chữ "xu".
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            8. QUẢN LÝ BÌNH LUẬN (10+ COMMENT COMMANDS & BUBBLE SETTINGS)
           ================================================================== */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-2">
              <div className="font-bold text-amber-400 uppercase">💬 Cấu Hình Bong Bóng Bình Luận</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.commentSettings.showCommentBubble}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.commentSettings.showCommentBubble = e.target.checked;
                      })
                    }
                  />
                  <span>Hiển thị bong bóng trên đầu nhân vật</span>
                </label>
                <div>
                  <span className="text-stone-400 block">Thời gian hiện (ms): {config.commentSettings.bubbleDurationMs}</span>
                  <input
                    type="range"
                    min={2000}
                    max={10000}
                    step={500}
                    value={config.commentSettings.bubbleDurationMs}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.commentSettings.bubbleDurationMs = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">Tối đa bong bóng cùng lúc: {config.commentSettings.maxConcurrentBubbles}</span>
                  <input
                    type="range"
                    min={4}
                    max={25}
                    step={1}
                    value={config.commentSettings.maxConcurrentBubbles}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.commentSettings.maxConcurrentBubbles = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-amber-300 uppercase">⚔️ 10 Lệnh Bình Luận Điều Khiển Nhân Vật</div>
              {config.commentCommands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  className="p-2.5 rounded-lg bg-stone-900/90 border border-stone-800 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-amber-200">
                      {cmd.label} ➔ Hoạt ảnh: <code className="text-emerald-400">{cmd.animation}</code>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Từ khóa: <strong className="text-stone-200">{cmd.keywords.join(', ')}</strong> • Cooldown: {cmd.cooldownMs}ms
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        dispatchTestComment(
                          selectedDisciple?.userId || testUserId || 'demo_cmd_user',
                          selectedDisciple?.displayName || testDisplayName || 'Trương Vô Kỵ',
                          cmd.keywords[0]
                        );
                      }}
                      className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-semibold cursor-pointer"
                    >
                      Thử Lệnh "{cmd.keywords[0]}"
                    </button>
                    <input
                      type="checkbox"
                      checked={cmd.enabled}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.commentCommands[idx].enabled = e.target.checked;
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================
            9. LỜI THOẠI GIÁO CHỦ (400+ DIALOGUE LINES MANAGER)
           ================================================================== */}
        {activeTab === 'dialogues' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-400 uppercase">
                  📜 Kho Lời Thoại Giáo Chủ ({config.dialogues.length} Câu Riêng Biệt - Hỗ trợ biến động)
                </div>
                <span className="text-[10px] text-emerald-300 font-mono">
                  Biến hỗ trợ: &#123;playerName&#125;, &#123;rankName&#125;, &#123;giftName&#125;, &#123;leaderName&#125;, &#123;gameName&#125;
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={newDialogueCat}
                  onChange={e => setNewDialogueCat(e.target.value as DialogueCategory)}
                  className="px-2 py-1.5 rounded bg-stone-950 border border-stone-700"
                >
                  {(Object.keys(DIALOGUE_CATEGORY_LABELS) as DialogueCategory[]).map(cat => (
                    <option key={cat} value={cat}>
                      {DIALOGUE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newDialogueText}
                  onChange={e => setNewDialogueText(e.target.value)}
                  placeholder="Nhập câu thoại mới cho Giáo Chủ..."
                  className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700"
                />
                <button
                  onClick={() => {
                    if (!newDialogueText.trim()) return;
                    updateAndSyncConfig(d => {
                      d.dialogues.unshift({
                        id: `custom_${Date.now()}`,
                        category: newDialogueCat,
                        text: newDialogueText.trim(),
                        personality: 'all',
                        enabled: true,
                      });
                    }, 'Đã thêm câu thoại mới vào kho!');
                    setNewDialogueText('');
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  + Thêm Thoại
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <select
                  value={dialogueCategoryFilter}
                  onChange={e => setDialogueCategoryFilter(e.target.value as DialogueCategory | 'ALL')}
                  className="px-2 py-1 rounded bg-stone-950 border border-stone-700"
                >
                  <option value="ALL">Tất cả 10 nhóm ({config.dialogues.length} câu)</option>
                  {(Object.keys(DIALOGUE_CATEGORY_LABELS) as DialogueCategory[]).map(cat => (
                    <option key={cat} value={cat}>
                      {DIALOGUE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={dialogueSearch}
                  onChange={e => setDialogueSearch(e.target.value)}
                  placeholder="🔍 Tìm nội dung lời thoại..."
                  className="flex-1 px-2.5 py-1 rounded bg-stone-950 border border-stone-700"
                />
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-1.5">
              {config.dialogues
                .filter(
                  l =>
                    (dialogueCategoryFilter === 'ALL' || l.category === dialogueCategoryFilter) &&
                    l.text.toLowerCase().includes(dialogueSearch.toLowerCase())
                )
                .slice(0, 80)
                .map(line => (
                  <div
                    key={line.id}
                    className="p-2 rounded bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] text-amber-400 font-semibold">
                        [{line.category}] • ID: {line.id}
                      </div>
                      <div className="text-stone-100 leading-snug">{line.text}</div>
                    </div>
                    <button
                      onClick={() => {
                        voiceManager.enqueue({
                          text: line.text
                            .replace(/\{playerName\}/g, 'Lệnh Hồ Xung')
                            .replace(/\{rankName\}/g, 'Đại Trưởng Lão')
                            .replace(/\{giftName\}/g, 'Thánh Hỏa Lệnh')
                            .replace(/\{leaderName\}/g, snapshot.sectLeader.currentLeaderName)
                            .replace(/\{gameName\}/g, 'Ma Quyền Loạn Vũ'),
                          priority: 'high_gift',
                          category: line.category,
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold shrink-0 cursor-pointer"
                    >
                      🔊 Đọc Thử
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ==================================================================
            10. GIỌNG ĐỌC & TTS (MICROSOFT AZURE SPEECH, VIENEU, QUEUE)
           ================================================================== */}
        {activeTab === 'voice_tts' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">
                🔊 Cấu Hình Giọng Đọc Giáo Chủ (Microsoft Azure Speech Nam Minh / Hoài My & VieNeu)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">Nhà cung cấp TTS</label>
                  <select
                    value={config.voiceConfig.provider}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        const prov = e.target.value as VoiceProviderType;
                        d.voiceConfig.provider = prov;
                        if (prov === 'azure_speech') d.voiceConfig.voiceId = 'vi-VN-NamMinhNeural';
                        else if (prov === 'vieneu_local') d.voiceConfig.voiceId = 'Bình (nam miền Bắc)';
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700"
                  >
                    <option value="azure_speech">Microsoft Azure AI Speech (Nam Minh / Hoài My Neural)</option>
                    <option value="vieneu_local">VieNeu-TTS Local (127.0.0.1:8000)</option>
                    <option value="vieneu">VieNeu-TTS Cloud API</option>
                    <option value="web_speech">Trình duyệt Web Speech API (Microsoft Edge Natural)</option>
                    <option value="gemini_tts">Gemini 2.5 Flash TTS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Giọng đọc cụ thể (Voice ID)</label>
                  <select
                    value={config.voiceConfig.voiceId}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.voiceConfig.voiceId = e.target.value;
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700"
                  >
                    <option value="vi-VN-NamMinhNeural">
                      Microsoft Nam Minh Online (Natural) - Vietnamese (vi-VN-NamMinhNeural)
                    </option>
                    <option value="vi-VN-HoaiMyNeural">
                      Microsoft Hoài My Online (Natural) - Vietnamese (vi-VN-HoaiMyNeural)
                    </option>
                    <option value="Bình (nam miền Bắc)">VieNeu Local - Bình (nam miền Bắc)</option>
                    <option value="Tuyên (nam miền Bắc)">VieNeu Local - Tuyên (nam miền Bắc)</option>
                    <option value="Vĩnh (nam miền Nam)">VieNeu Local - Vĩnh (nam miền Nam)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                <div>
                  <span className="text-stone-400 block">Tốc độ đọc: {config.voiceConfig.speed.toFixed(2)}x</span>
                  <input
                    type="range"
                    min={0.7}
                    max={1.5}
                    step={0.05}
                    value={config.voiceConfig.speed}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.voiceConfig.speed = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">Âm lượng TTS: {Math.round(config.voiceConfig.volume * 100)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.voiceConfig.volume}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.voiceConfig.volume = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">Âm lượng Nhạc/SFX: {Math.round(config.voiceConfig.sfxVolume * 100)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.voiceConfig.sfxVolume}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.voiceConfig.sfxVolume = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Optional Runtime Azure / VieNeu Local Configuration */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                <div className="text-[11px] font-semibold text-amber-300">
                  🔑 Cấu hình nhanh Azure Speech / VieNeu Local (Dành cho máy локал khi chạy Livestream)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="password"
                    value={azureKeyInput}
                    onChange={e => setAzureKeyInput(e.target.value)}
                    placeholder="AZURE_SPEECH_KEY (tùy chọn)"
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-700"
                  />
                  <input
                    type="text"
                    value={azureRegionInput}
                    onChange={e => setAzureRegionInput(e.target.value)}
                    placeholder="Region (VD: southeastasia)"
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-700"
                  />
                  <input
                    type="text"
                    value={vieneuLocalInput}
                    onChange={e => setVieneuLocalInput(e.target.value)}
                    placeholder="VieNeu URL (http://127.0.0.1:8000)"
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-700"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      await fetch('/api/tts/credentials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          azureKey: azureKeyInput,
                          azureRegion: azureRegionInput,
                          vieneuLocalUrl: vieneuLocalInput,
                        }),
                      });
                      notifySync('Đã cập nhật thông tin kết nối TTS Server!');
                    }}
                    className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                  >
                    Lưu Kết Nối TTS
                  </button>
                  <button
                    onClick={() => {
                      sectGameManager.triggerSectLeaderSpeech('silly_evil_boast', {}, 'high_gift');
                    }}
                    className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    🎙️ Phát Thử Giọng Giáo Chủ + Lip-Sync
                  </button>
                  <button
                    onClick={() => voiceManager.skipCurrent()}
                    className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                  >
                    ⏭ Bỏ Qua Câu Hiện Tại
                  </button>
                  <button
                    onClick={() => voiceManager.clearQueue()}
                    className="px-3 py-1 rounded bg-red-900/80 hover:bg-red-800 text-red-200 cursor-pointer"
                  >
                    🗑 Xóa Hàng Chờ ({voiceSnap.queue.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            11. ĐẠI ĐIỆN & BACKGROUND (HALL CALIBRATION, FREE ROAM & ZONES)
           ================================================================== */}
        {activeTab === 'hall_background' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-400 uppercase">
                  🏛️ Quản Lý Đại Điện & Vùng Tự Do Di Chuyển (Free Roam Area)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      sectGameManager.redistributeAllDisciples();
                      notifySync('Đã phân bố lại toàn bộ nhân vật trên khắp mặt sàn Đại Điện!');
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    🔀 Phân Bố Lại Toàn Bộ Nhân Vật
                  </button>
                  <button
                    onClick={() => {
                      sectGameManager.resumeAllFreeRoam();
                      notifySync('Toàn bộ nhân vật đã trở lại sinh hoạt tự do!');
                    }}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                  >
                    🚶 Cho Tất Cả Sinh Hoạt Tự Do
                  </button>
                </div>
              </div>

              {/* Toggles: Free Roam & Debug Zones */}
              <div className="flex flex-wrap gap-4 p-2.5 rounded bg-stone-950 border border-stone-800">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-300">
                  <input
                    type="checkbox"
                    checked={config.sceneConfig.freeRoamEnabled !== false}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.freeRoamEnabled = e.target.checked;
                      })
                    }
                  />
                  <span>✅ Bật Tự Do Di Chuyển (Free Roam Trên Lối Đi Chính Giữa & Toàn Sảnh)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sky-300">
                  <input
                    type="checkbox"
                    checked={Boolean(config.sceneConfig.showDebugZones)}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.showDebugZones = e.target.checked;
                      })
                    }
                  />
                  <span>🔍 Hiển Thị Vùng Di Chuyển (Debug FreeRoam / Ngai / Khoảng Cách)</span>
                </label>
              </div>

              {/* Population Presets (1, 10, 30, 50, 80) */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-300">
                  👥 Kiểm Thử Nhanh Quân Số Phân Bố Trên Sàn Đại Điện (1 / 10 / 30 / 50 / 80 Nhân Vật):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 10, 30, 50, 80].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => {
                        sectGameManager.setPopulationPreset(cnt);
                        notifySync(`Đã đặt quân số Đại Điện: ${cnt} nhân vật phân bố toàn sảnh!`);
                      }}
                      className={`px-3 py-1 rounded font-bold cursor-pointer ${
                        disciples.length === cnt
                          ? 'bg-amber-500 text-black'
                          : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/30'
                      }`}
                    >
                      {cnt} Nhân Vật
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                <div>
                  <span className="text-stone-400 block">
                    Giới hạn đệ tử tối đa: <strong>{config.sceneConfig.maxConcurrentPlayers}</strong> (Tối đa 80)
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={80}
                    step={1}
                    value={config.sceneConfig.maxConcurrentPlayers}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.maxConcurrentPlayers = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Kích thước nhân vật (Scale): <strong>{(config.sceneConfig.playerBaseScale || 1.0).toFixed(2)}x</strong>
                  </span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={config.sceneConfig.playerBaseScale || 1.0}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.playerBaseScale = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Mật độ sương khói / Hỏa tinh: <strong>{Math.round(config.sceneConfig.mistIntensity * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.sceneConfig.mistIntensity}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.mistIntensity = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Free Roam Area Bounds Calibration */}
              <div className="p-2.5 rounded bg-stone-950 border border-emerald-500/30 space-y-2 tabular-nums">
                <div className="font-bold text-emerald-400 text-[11px]">
                  📐 Chỉnh Vùng Free Roam (Mặt Sàn Sinh Hoạt Tự Do & Lối Đi Chính Giữa):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Biên Trái X Min: {config.sceneConfig.freeRoamBounds?.xMin ?? 10}%
                    </span>
                    <input
                      type="range"
                      min={6}
                      max={30}
                      step={1}
                      value={config.sceneConfig.freeRoamBounds?.xMin ?? 10}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.freeRoamBounds = {
                            ...(d.sceneConfig.freeRoamBounds || { xMin: 10, xMax: 90, yMin: 31, yMax: 90 }),
                            xMin: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Biên Phải X Max: {config.sceneConfig.freeRoamBounds?.xMax ?? 90}%
                    </span>
                    <input
                      type="range"
                      min={70}
                      max={94}
                      step={1}
                      value={config.sceneConfig.freeRoamBounds?.xMax ?? 90}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.freeRoamBounds = {
                            ...(d.sceneConfig.freeRoamBounds || { xMin: 10, xMax: 90, yMin: 31, yMax: 90 }),
                            xMax: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Biên Trên Y Min: {config.sceneConfig.freeRoamBounds?.yMin ?? 31}%
                    </span>
                    <input
                      type="range"
                      min={26}
                      max={45}
                      step={1}
                      value={config.sceneConfig.freeRoamBounds?.yMin ?? 31}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.freeRoamBounds = {
                            ...(d.sceneConfig.freeRoamBounds || { xMin: 10, xMax: 90, yMin: 31, yMax: 90 }),
                            yMin: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Biên Dưới Y Max: {config.sceneConfig.freeRoamBounds?.yMax ?? 90}%
                    </span>
                    <input
                      type="range"
                      min={70}
                      max={93}
                      step={1}
                      value={config.sceneConfig.freeRoamBounds?.yMax ?? 90}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.freeRoamBounds = {
                            ...(d.sceneConfig.freeRoamBounds || { xMin: 10, xMax: 90, yMin: 31, yMax: 90 }),
                            yMax: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                </div>
              </div>

              {/* Throne Reserved Zone Calibration */}
              <div className="p-2.5 rounded bg-stone-950 border border-red-500/30 space-y-2 tabular-nums">
                <div className="font-bold text-red-400 text-[11px]">
                  👑 Chỉnh Vùng Bảo Vệ Dành Riêng Cho Ngai Giáo Chủ (Throne Reserved Zone):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Ngai X Min: {config.sceneConfig.throneReservedZone?.xMin ?? 28}%
                    </span>
                    <input
                      type="range"
                      min={15}
                      max={42}
                      step={1}
                      value={config.sceneConfig.throneReservedZone?.xMin ?? 28}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.throneReservedZone = {
                            ...(d.sceneConfig.throneReservedZone || { xMin: 28, xMax: 72, yMin: 10, yMax: 29.5 }),
                            xMin: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Ngai X Max: {config.sceneConfig.throneReservedZone?.xMax ?? 72}%
                    </span>
                    <input
                      type="range"
                      min={58}
                      max={85}
                      step={1}
                      value={config.sceneConfig.throneReservedZone?.xMax ?? 72}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.throneReservedZone = {
                            ...(d.sceneConfig.throneReservedZone || { xMin: 28, xMax: 72, yMin: 10, yMax: 29.5 }),
                            xMax: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Ngai Y Min: {config.sceneConfig.throneReservedZone?.yMin ?? 10}%
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={20}
                      step={1}
                      value={config.sceneConfig.throneReservedZone?.yMin ?? 10}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.throneReservedZone = {
                            ...(d.sceneConfig.throneReservedZone || { xMin: 28, xMax: 72, yMin: 10, yMax: 29.5 }),
                            yMin: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Ngai Y Max: {config.sceneConfig.throneReservedZone?.yMax ?? 29.5}%
                    </span>
                    <input
                      type="range"
                      min={22}
                      max={36}
                      step={0.5}
                      value={config.sceneConfig.throneReservedZone?.yMax ?? 29.5}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.sceneConfig.throneReservedZone = {
                            ...(d.sceneConfig.throneReservedZone || { xMin: 28, xMax: 72, yMin: 10, yMax: 29.5 }),
                            yMax: Number(e.target.value),
                          };
                        })
                      }
                      className="w-full"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sceneConfig.dragonPillars}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.dragonPillars = e.target.checked;
                      })
                    }
                  />
                  <span>Trụ Rồng Hắc Kim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sceneConfig.redLanterns}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.redLanterns = e.target.checked;
                      })
                    }
                  />
                  <span>Đèn Lồng Huyết Nguyệt</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sceneConfig.sectBanners}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sceneConfig.sectBanners = e.target.checked;
                      })
                    }
                  />
                  <span>Cờ Xí Thiên Hạ Đệ Nhất</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            12. HOẠT ĐỘNG NHÂN VẬT (AUTONOMOUS AI WEIGHTS, SEPARATION & ACTIONS)
           ================================================================== */}
        {activeTab === 'player_animations' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-400 uppercase">
                  🥋 Quản Lý Hoạt Động Nhân Vật, Tỷ Lệ Sinh Hoạt & Chống Chồng Lấn
                </div>
              </div>

              {/* 4 Mandatory Direct Action Buttons from Section 9 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded bg-stone-950 border border-amber-500/30">
                <button
                  onClick={() => {
                    sectGameManager.redistributeAllDisciples();
                    notifySync('Đã phân bố lại toàn bộ nhân vật trên sàn Đại Điện!');
                  }}
                  className="px-2.5 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  🔀 Phân Bố Lại Toàn Bộ Nhân Vật
                </button>
                <button
                  onClick={() => {
                    sectGameManager.triggerMassPlayerAnimation('combo_kungfu');
                    notifySync('Toàn bộ nhân vật đang đồng diễn tập võ!');
                  }}
                  className="px-2.5 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold cursor-pointer"
                >
                  🥊 Cho Tất Cả Tập Võ
                </button>
                <button
                  onClick={() => {
                    sectGameManager.triggerMassPlayerAnimation('meditate');
                    notifySync('Toàn bộ nhân vật đang ngồi thiền!');
                  }}
                  className="px-2.5 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer"
                >
                  🧘 Cho Tất Cả Ngồi Thiền
                </button>
                <button
                  onClick={() => {
                    sectGameManager.resumeAllFreeRoam();
                    notifySync('Toàn bộ nhân vật đã trở lại chế độ sinh hoạt tự do!');
                  }}
                  className="px-2.5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer"
                >
                  🚶 Trở Lại Sinh Hoạt Tự Do
                </button>
              </div>

              {/* Movement Speed, Concurrent Movers, Anti-Overlap Distance & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                <div>
                  <span className="text-stone-400 block">
                    Tỷ lệ vận động mạnh cùng lúc: <strong>{Math.round(config.playerAnimationConfig.activeRatioTarget * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0.15}
                    max={0.65}
                    step={0.05}
                    value={config.playerAnimationConfig.activeRatioTarget}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.playerAnimationConfig.activeRatioTarget = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Số người di chuyển tối đa cùng lúc: <strong>{config.playerAnimationConfig.maxConcurrentMovers ?? 24}</strong>
                  </span>
                  <input
                    type="range"
                    min={4}
                    max={60}
                    step={2}
                    value={config.playerAnimationConfig.maxConcurrentMovers ?? 24}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.playerAnimationConfig.maxConcurrentMovers = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Khoảng cách chống chồng: <strong>{(config.playerAnimationConfig.minSeparationDist ?? 5.2).toFixed(1)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={2.5}
                    max={9.0}
                    step={0.2}
                    value={config.playerAnimationConfig.minSeparationDist ?? 5.2}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.playerAnimationConfig.minSeparationDist = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Tốc độ đi bộ: <strong>{config.playerAnimationConfig.walkSpeedMultiplier.toFixed(1)}x</strong>
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={2.2}
                    step={0.1}
                    value={config.playerAnimationConfig.walkSpeedMultiplier}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.playerAnimationConfig.walkSpeedMultiplier = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Tốc độ chạy: <strong>{config.playerAnimationConfig.runSpeedMultiplier.toFixed(1)}x</strong>
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    value={config.playerAnimationConfig.runSpeedMultiplier}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.playerAnimationConfig.runSpeedMultiplier = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="text-stone-400 block">
                    Chu kỳ đổi hành vi: <strong>{config.playerAnimationConfig.decisionIntervalRangeSec?.[0] ?? 3}s – {config.playerAnimationConfig.decisionIntervalRangeSec?.[1] ?? 8}s</strong>
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={1}
                    value={config.playerAnimationConfig.decisionIntervalRangeSec?.[1] ?? 8}
                    onChange={e => {
                      const maxS = Number(e.target.value);
                      const minS = Math.max(1, maxS - 4);
                      updateAndSyncConfig(d => {
                        d.playerAnimationConfig.decisionIntervalRangeSec = [minS, maxS];
                      });
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Behavior Distribution Weights (Stroll, Kungfu, Meditate, Greet Leader, Social) */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2 tabular-nums">
                <div className="font-bold text-amber-300 text-[11px]">
                  ⚖️ Tỷ Trọng Hành Vi Tự Sinh Hoạt (Đi Dạo / Luyện Võ / Ngồi Thiền / Chào Giáo Chủ / Giao Lưu):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Đi dạo & Qua sảnh: {config.playerAnimationConfig.strollWeight ?? 34}%
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={70}
                      step={1}
                      value={config.playerAnimationConfig.strollWeight ?? 34}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.playerAnimationConfig.strollWeight = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Luyện võ & Nhảy: {config.playerAnimationConfig.kungfuWeight ?? 28}%
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={70}
                      step={1}
                      value={config.playerAnimationConfig.kungfuWeight ?? 28}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.playerAnimationConfig.kungfuWeight = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Ngồi thiền: {config.playerAnimationConfig.meditateWeight ?? 16}%
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={1}
                      value={config.playerAnimationConfig.meditateWeight ?? 16}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.playerAnimationConfig.meditateWeight = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Chào Giáo Chủ: {config.playerAnimationConfig.greetLeaderWeight ?? 10}%
                    </span>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      step={1}
                      value={config.playerAnimationConfig.greetLeaderWeight ?? 10}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.playerAnimationConfig.greetLeaderWeight = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400 text-[10px]">
                      Xem võ & Vỗ tay: {config.playerAnimationConfig.socialWeight ?? 12}%
                    </span>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      step={1}
                      value={config.playerAnimationConfig.socialWeight ?? 12}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.playerAnimationConfig.socialWeight = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                </div>
              </div>

              <div className="font-semibold text-amber-300 pt-1">
                ⚡ Phát Lệnh Đồng Diễn Toàn Giáo (17 Trạng Thái 2D):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    'idle',
                    'walk',
                    'run',
                    'bow',
                    'punch',
                    'kick',
                    'combo_kungfu',
                    'jump',
                    'dodge',
                    'meditate',
                    'stand_up',
                    'clap',
                    'celebrate',
                    'stagger',
                    'depart',
                    'sweep_floor',
                    'cast_seal',
                  ] as PlayerAnimationState[]
                ).map(anim => (
                  <button
                    key={anim}
                    onClick={() => sectGameManager.triggerMassPlayerAnimation(anim)}
                    className="px-2.5 py-1.5 rounded bg-stone-800 hover:bg-red-800 text-amber-200 border border-stone-700 font-semibold cursor-pointer"
                  >
                    ▶ {anim}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            13. MINI GAME LUYỆN VÕ (3 MINI-GAMES & SWEEPING COURTYARD PENALTY)
           ================================================================== */}
        {activeTab === 'minigames' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">
                ⚔️ Quản Lý 3 Mini Game Luyện Võ & Hình Phạt Quét Sân (Tối đa 5 người)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sectGameManager.startMiniGame('ma_quyen_loan_vu')}
                  className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold cursor-pointer"
                >
                  🥊 Bắt đầu Game 1: Ma Quyền Loạn Vũ (Gõ MÚA)
                </button>
                <button
                  onClick={() => sectGameManager.startMiniGame('ma_anh_than_phap')}
                  className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer"
                >
                  ⚡ Bắt đầu Game 2: Ma Ảnh Thân Pháp (TRÁI/PHẢI/NHẢY)
                </button>
                <button
                  onClick={() => sectGameManager.startMiniGame('tam_khi_ma_tran')}
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                >
                  ☯️ Bắt đầu Game 3: Tam Khí Ma Trận (LỬA/BĂNG/GIÓ)
                </button>
              </div>

              {miniGame.isActive && (
                <div className="p-2.5 rounded bg-red-950/60 border border-amber-400 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-amber-300">
                      Đang diễn ra: {miniGame.title} (Còn {miniGame.remainingSec}s)
                    </div>
                    <div className="text-[11px] text-stone-200">
                      Hoàn thành: {miniGame.completedUserIds.length}/{Math.max(1, miniGame.participantUserIds.length)} ({miniGame.completionPct}%)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sectGameManager.finishMiniGame(true)}
                      className="px-3 py-1 rounded bg-emerald-600 text-white font-bold cursor-pointer"
                    >
                      ✓ Xử Thắng Ngay
                    </button>
                    <button
                      onClick={() => sectGameManager.finishMiniGame(false)}
                      className="px-3 py-1 rounded bg-red-700 text-white font-bold cursor-pointer"
                    >
                      🧹 Xử Thua (Phạt 5 Người Quét Sân)
                    </button>
                  </div>
                </div>
              )}

              {sweepingDisciples.length > 0 && (
                <div className="p-2.5 rounded bg-amber-950/60 border border-amber-500/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-300">
                      🧹 Đang quét sân ({sweepingDisciples.length}/5):
                    </span>{' '}
                    {sweepingDisciples.map(d => d.displayName).join(', ')}
                  </div>
                  <button
                    onClick={() => sectGameManager.releaseSweepingDisciple()}
                    className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold cursor-pointer"
                  >
                    Tha Phạt Tất Cả
                  </button>
                </div>
              )}
            </div>

            {config.miniGames.map((mg, idx) => (
              <div key={mg.id} className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-300">
                    {mg.name} ({mg.subtitle})
                  </div>
                  <input
                    type="checkbox"
                    checked={mg.enabled}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.miniGames[idx].enabled = e.target.checked;
                      })
                    }
                  />
                </div>
                <div className="text-[11px] text-stone-400">{mg.rulesText}</div>
                <div className="grid grid-cols-2 gap-3 tabular-nums">
                  <label className="block">
                    <span className="text-stone-400">Thời lượng (giây): {mg.durationSec}s</span>
                    <input
                      type="range"
                      min={15}
                      max={60}
                      step={5}
                      value={mg.durationSec}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.miniGames[idx].durationSec = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-stone-400">Ngưỡng thắng đồng đội: {mg.winThresholdPct}%</span>
                    <input
                      type="range"
                      min={20}
                      max={90}
                      step={5}
                      value={mg.winThresholdPct}
                      onChange={e =>
                        updateAndSyncConfig(d => {
                          d.miniGames[idx].winThresholdPct = Number(e.target.value);
                        })
                      }
                      className="w-full"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================================================================
            14. CHUYỂN CẢNH (150–180s SCENE TRANSITION CYCLE)
           ================================================================== */}
        {activeTab === 'scene_transition' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">
                🌄 Chu Kỳ Chuyển Cảnh Tự Động (Đại Điện ⇄ Sân Luyện Võ mỗi 150–180s)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sectGameManager.switchSceneNow('main_hall')}
                  className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 font-bold cursor-pointer"
                >
                  🏛️ Chuyển Về Đại Điện Ngay
                </button>
                <button
                  onClick={() => sectGameManager.switchSceneNow('training_ground')}
                  className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold cursor-pointer"
                >
                  ⚔️ Chuyển Sang Sân Luyện Võ Ngay
                </button>
                <button
                  onClick={() =>
                    updateAndSyncConfig(d => {
                      d.sceneTransition.isPaused = !d.sceneTransition.isPaused;
                    })
                  }
                  className="px-3 py-1.5 rounded bg-amber-600 text-black font-bold cursor-pointer"
                >
                  {config.sceneTransition.isPaused ? '▶ Tiếp Tục Chu Kỳ' : '⏸ Tạm Dừng Chu Kỳ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            15. THÔNG BÁO & BẢNG XẾP HẠNG (8 NOTICE PANELS)
           ================================================================== */}
        {activeTab === 'notices_leaderboard' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-amber-400 uppercase">
                🏆 Cấu Hình 8 Bảng Thông Báo & Bảng Xếp Hạng Trưởng Lão
              </div>
              <div className="text-[11px] text-emerald-300">
                Opacity nền: <strong>{(config.overlayConfig.panelBgOpacity ?? 0.4).toFixed(2)}</strong> • Tự ẩn Popup:{' '}
                <strong>{((config.overlayConfig.popupDurationMs || 4000) / 1000).toFixed(1)}s</strong> (Fade:{' '}
                {((config.overlayConfig.popupFadeOutMs || 700) / 1000).toFixed(1)}s)
              </div>
            </div>
            {config.noticePanels.map((panel, idx) => (
              <div
                key={panel.id}
                className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-amber-200">{panel.title}</div>
                  <div className="text-[10px] text-stone-400">
                    ID: {panel.id} • Vị trí: {panel.position} • Thời lượng:{' '}
                    {panel.durationMs === 0
                      ? 'Cố định (Luôn hiển thị)'
                      : `${config.overlayConfig.popupDurationMs || panel.durationMs}ms (Tự ẩn)`}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={panel.enabled}
                  onChange={e =>
                    updateAndSyncConfig(d => {
                      d.noticePanels[idx].enabled = e.target.checked;
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* ==================================================================
            16. LAYOUT & CSS (9:16 FRAMING, THRONE POS, SWEEPING POS, OPACITY 0.4 & POPUP 4S)
           ================================================================== */}
        {activeTab === 'layout_css' && (
          <div className="space-y-3 tabular-nums">
            {/* A. VỊ TRÍ GIÁO CHỦ & CỤM NGAI VÀNG (HẠ 30PX TRÊN KHUNG 9:16) */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-amber-400 uppercase">
                    👑 1. Vị Trí Ngai Giáo Chủ & Nhân Vật Giáo Chủ (Khung Dọc 9:16)
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Tọa độ hiện tại: <strong className="text-amber-300">X = {config.sectLeader.thronePosition.x.toFixed(1)}%</strong>,{' '}
                    <strong className="text-amber-300">Y = {config.sectLeader.thronePosition.y.toFixed(2)}%</strong>{' '}
                    <span className="text-emerald-300">
                      (Dịch chuyển dọc so với gốc 19%: {Math.round(((config.sectLeader.thronePosition.y - 19) / 100) * 960) >= 0 ? '+' : ''}
                      {Math.round(((config.sectLeader.thronePosition.y - 19) / 100) * 960)}px — Chuẩn hạ xuống: +30px)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    updateAndSyncConfig(d => {
                      d.sectLeader.thronePosition = { x: 50, y: 22.13 };
                    });
                    notifySync('Đã khôi phục vị trí Ngai Giáo Chủ mặc định (X: 50%, Y: 22.13% — Hạ xuống 30px)!');
                  }}
                  className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer"
                >
                  ↺ Khôi Phục Vị Trí Ngai Mặc Định (+30px)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-300 font-semibold">Tọa độ ngang X Ngai Giáo Chủ (%):</span>
                    <span className="text-amber-300 font-mono font-bold">{config.sectLeader.thronePosition.x.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={65}
                    step={0.5}
                    value={config.sectLeader.thronePosition.x}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sectLeader.thronePosition.x = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </label>

                <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-300 font-semibold">Tọa độ dọc Y Ngai Giáo Chủ (%):</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {config.sectLeader.thronePosition.y.toFixed(2)}% ({Math.round((config.sectLeader.thronePosition.y / 100) * 960)}px)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={29}
                    step={0.1}
                    value={config.sectLeader.thronePosition.y}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.sectLeader.thronePosition.y = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sectGameManager.triggerSectLeaderAnimation('stand_up_throne')}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-xs font-semibold cursor-pointer"
                >
                  🧍 Test Đứng Dậy Tại Ngai
                </button>
                <button
                  onClick={() => sectGameManager.triggerSectLeaderAnimation('walk_down_steps')}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-xs font-semibold cursor-pointer"
                >
                  🚶 Test Bước Xuống Thềm
                </button>
                <button
                  onClick={() => sectGameManager.triggerSectLeaderAnimation('return_to_throne')}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-xs font-semibold cursor-pointer"
                >
                  🐉 Test Trở Về Ngai Vàng
                </button>
              </div>
            </div>

            {/* B. VỊ TRÍ KHU VỰC QUÉT SÂN (NÂNG LÊN 25PX TRÊN KHUNG 9:16) */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              {(() => {
                const sweepRect = config.sceneConfig.zones.sweeping_courtyard || {
                  xMin: 73,
                  xMax: 94,
                  yMin: 85.4,
                  yMax: 92.4,
                  label: 'Góc Phạt Quét Sân',
                };
                const sweepWidth = Math.max(12, sweepRect.xMax - sweepRect.xMin);
                const sweepHeight = Math.max(5, sweepRect.yMax - sweepRect.yMin);
                const offsetPxY = Math.round(((sweepRect.yMin - 88) / 100) * 960);

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-amber-400 uppercase">
                          🧹 2. Vị Trí Khu Vực Quét Sân (Đồng Bộ Sân & Nhân Vật Quét Sân)
                        </div>
                        <div className="text-[11px] text-stone-400">
                          Tọa độ hiện tại: <strong className="text-amber-300">X = {sweepRect.xMin.toFixed(1)}%..{sweepRect.xMax.toFixed(1)}%</strong>,{' '}
                          <strong className="text-amber-300">Y = {sweepRect.yMin.toFixed(1)}%..{sweepRect.yMax.toFixed(1)}%</strong>{' '}
                          <span className="text-emerald-300">
                            (Dịch chuyển dọc so với gốc 88%: {offsetPxY >= 0 ? '+' : ''}{offsetPxY}px — Chuẩn nâng lên: -25px)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          updateAndSyncConfig(d => {
                            d.sceneConfig.zones.sweeping_courtyard = {
                              xMin: 73,
                              xMax: 94,
                              yMin: 85.4,
                              yMax: 92.4,
                              label: 'Góc Phạt Quét Sân',
                            };
                          });
                          notifySync('Đã khôi phục vị trí Khu vực Quét sân mặc định (Nâng lên 25px, Y: 85.4%..92.4%)!');
                        }}
                        className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer"
                      >
                        ↺ Khôi Phục Vị Trí Quét Sân Mặc Định (-25px)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-300 font-semibold">Vị trí ngang X Khu Quét Sân (%):</span>
                          <span className="text-amber-300 font-mono font-bold">
                            {sweepRect.xMin.toFixed(1)}% ➔ {sweepRect.xMax.toFixed(1)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={76}
                          step={0.5}
                          value={sweepRect.xMin}
                          onChange={e => {
                            const newXMin = Number(e.target.value);
                            updateAndSyncConfig(d => {
                              d.sceneConfig.zones.sweeping_courtyard = {
                                ...sweepRect,
                                xMin: newXMin,
                                xMax: Math.min(95, Number((newXMin + sweepWidth).toFixed(1))),
                              };
                            });
                          }}
                          className="w-full"
                        />
                      </label>

                      <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-300 font-semibold">Vị trí dọc Y Khu Quét Sân (%):</span>
                          <span className="text-amber-300 font-mono font-bold">
                            {sweepRect.yMin.toFixed(1)}% ➔ {sweepRect.yMax.toFixed(1)}% ({Math.round((sweepRect.yMin / 100) * 960)}px)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={68}
                          max={89}
                          step={0.2}
                          value={sweepRect.yMin}
                          onChange={e => {
                            const newYMin = Number(e.target.value);
                            updateAndSyncConfig(d => {
                              d.sceneConfig.zones.sweeping_courtyard = {
                                ...sweepRect,
                                yMin: newYMin,
                                yMax: Math.min(96, Number((newYMin + sweepHeight).toFixed(1))),
                              };
                            });
                          }}
                          className="w-full"
                        />
                      </label>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* C. BẢNG THÔNG BÁO, POPUP TỰ ẨN 4 GIÂY & OPACITY NỀN 0.4 */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-amber-400 uppercase">
                    📜 3. Bảng Thông Báo, Opacity Nền (0.4) & Tự Động Ẩn Popup (4 Giây)
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Chỉ giảm Opacity của lớp nền <code>rgba(..., {(config.overlayConfig.panelBgOpacity ?? 0.4).toFixed(2)})</code>, giữ chữ & icon sắc nét 100%.
                  </div>
                </div>
                <button
                  onClick={() => {
                    updateAndSyncConfig(d => {
                      d.overlayConfig.panelBgOpacity = 0.4;
                      d.overlayConfig.popupDurationMs = 4000;
                      d.overlayConfig.popupFadeOutMs = 700;
                      d.overlayConfig.autoHidePopups = true;
                    });
                    notifySync('Đã khôi phục chuẩn: Opacity nền = 0.4, Popup hiển thị 4.0s, Fade-out 0.7s!');
                  }}
                  className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer"
                >
                  ↺ Khôi Phục Chuẩn (Opacity 0.4 • Tự Ẩn 4s)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-300 font-semibold">Opacity nền bảng (Chuẩn: 0.40):</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {(config.overlayConfig.panelBgOpacity ?? 0.4).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.95}
                    step={0.05}
                    value={config.overlayConfig.panelBgOpacity ?? 0.4}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.panelBgOpacity = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </label>

                <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-300 font-semibold">Thời gian hiện Popup (Chuẩn: 4.0s):</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {((config.overlayConfig.popupDurationMs || 4000) / 1000).toFixed(1)}s ({config.overlayConfig.popupDurationMs || 4000}ms)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1500}
                    max={10000}
                    step={500}
                    value={config.overlayConfig.popupDurationMs || 4000}
                    onChange={e => {
                      const val = Number(e.target.value);
                      updateAndSyncConfig(d => {
                        d.overlayConfig.popupDurationMs = val;
                        d.noticePanels.forEach(p => {
                          if (p.durationMs > 0) p.durationMs = val;
                        });
                      });
                    }}
                    className="w-full"
                  />
                </label>

                <label className="block p-2.5 rounded bg-stone-950 border border-stone-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-300 font-semibold">Thời gian Fade-Out (Chuẩn: 0.7s):</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {((config.overlayConfig.popupFadeOutMs || 700) / 1000).toFixed(1)}s ({config.overlayConfig.popupFadeOutMs || 700}ms)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={2000}
                    step={100}
                    value={config.overlayConfig.popupFadeOutMs || 700}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.popupFadeOutMs = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                <label className="flex items-center justify-between p-2 rounded bg-stone-950 border border-amber-500/30 cursor-pointer">
                  <span className="text-amber-200 font-semibold">⏱️ Tự ẩn Popup tạm thời sau 4s</span>
                  <input
                    type="checkbox"
                    checked={config.overlayConfig.autoHidePopups !== false}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.autoHidePopups = e.target.checked;
                      })
                    }
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-stone-950 border border-stone-800 cursor-pointer">
                  <span className="text-stone-200">🏆 Hiện Bảng TRƯỞNG LÃO (Cố định)</span>
                  <input
                    type="checkbox"
                    checked={config.overlayConfig.showElderLeaderboard}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.showElderLeaderboard = e.target.checked;
                      })
                    }
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-stone-950 border border-stone-800 cursor-pointer">
                  <span className="text-stone-200">🎁 Hiện Bảng PHONG CẤP (Cố định)</span>
                  <input
                    type="checkbox"
                    checked={config.overlayConfig.showGiftRankTable}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.showGiftRankTable = e.target.checked;
                      })
                    }
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-stone-950 border border-stone-800 cursor-pointer">
                  <span className="text-stone-200">📜 Hiện Thánh Chỉ Giáo Chủ</span>
                  <input
                    type="checkbox"
                    checked={config.overlayConfig.showSectLeaderSpeechBubble}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.showSectLeaderSpeechBubble = e.target.checked;
                      })
                    }
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-stone-950 border border-stone-800 cursor-pointer">
                  <span className="text-stone-200">🧹 Hiện Bảng Phạt Quét Sân</span>
                  <input
                    type="checkbox"
                    checked={config.overlayConfig.showSweepingPenaltyPanel}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.showSweepingPenaltyPanel = e.target.checked;
                      })
                    }
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-stone-950 border border-stone-800 cursor-pointer">
                  <span className="text-stone-200">🐉 Hiện Thanh Tiêu Đề Trên Cùng</span>
                  <input
                    type="checkbox"
                    checked={config.overlayConfig.showHeaderBanner}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.showHeaderBanner = e.target.checked;
                      })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => {
                    const target = selectedDisciple || disciples[0];
                    const evt: TikTokLiveEvent = {
                      id: `preview_promo_${Date.now()}`,
                      type: 'gift',
                      timestamp: Date.now(),
                      userId: target?.userId || 'preview_hero',
                      uniqueId: target?.uniqueId || 'preview_hero',
                      nickname: target?.displayName || 'Lệnh Hồ Xung',
                      coinValue: 20,
                      giftName: 'Thánh Hỏa Lệnh (Test Popup 4s)',
                      giftCount: 1,
                      isDemo: true,
                    };
                    sectGameManager.handleGiftEvent(evt);
                    notifySync('Đã bật Popup Thăng Cấp — Quan sát hiệu ứng tự mờ dần (0.7s) và biến mất sau 4 giây!');
                  }}
                  className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs cursor-pointer"
                >
                  ✨ Test Hiện Popup Thăng Cấp (Tự Ẩn Sau 4 Giây)
                </button>
                <button
                  onClick={() => {
                    sectGameManager.triggerSectLeaderSpeech('silly_evil_boast', {}, 'boast_idle');
                    notifySync('Đã bật Popup Thánh Chỉ Giáo Chủ — Tự ẩn sau 4 giây!');
                  }}
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs cursor-pointer"
                >
                  📜 Test Hiện Popup Thánh Chỉ Giáo Chủ (Tự Ẩn Sau 4 Giây)
                </button>
              </div>
            </div>

            {/* D. TỶ LỆ KHUNG HÌNH 9:16 & CUSTOM CSS */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3 tabular-nums">
              <div className="font-bold text-amber-400 uppercase">🎨 4. Tinh Chỉnh Tỷ Lệ 9:16 & Custom CSS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-stone-400">Tỷ lệ HUD (hudScale): {config.overlayConfig.hudScale.toFixed(2)}x</span>
                  <input
                    type="range"
                    min={0.75}
                    max={1.25}
                    step={0.05}
                    value={config.overlayConfig.hudScale}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.hudScale = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </label>
                <label className="block">
                  <span className="text-stone-400">Kích thước Đệ Tử (avatarScale): {config.overlayConfig.avatarScale.toFixed(2)}x</span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.5}
                    step={0.05}
                    value={config.overlayConfig.avatarScale}
                    onChange={e =>
                      updateAndSyncConfig(d => {
                        d.overlayConfig.avatarScale = Number(e.target.value);
                      })
                    }
                    className="w-full"
                  />
                </label>
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Custom CSS (Áp dụng trực tiếp lên khung 9:16 & OBS)</label>
                <textarea
                  rows={4}
                  value={config.overlayConfig.customCss}
                  onChange={e =>
                    updateAndSyncConfig(d => {
                      d.overlayConfig.customCss = e.target.value;
                    })
                  }
                  className="w-full p-2 rounded bg-stone-950 border border-stone-700 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            17. OBS & PHÁT SÓNG (?obs=1 CLEAN VIEW & SYNC)
           ================================================================== */}
        {activeTab === 'obs_broadcast' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">🎥 Cấu Hình OBS Browser Source (TikTok LIVE Studio)</div>
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-1.5">
                <div className="text-stone-400">URL chuẩn cho OBS Browser Source (Ẩn toàn bộ thanh công cụ Admin):</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded bg-black text-amber-300 font-mono select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/?obs=1` : 'http://localhost:3000/?obs=1'}
                  </code>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/?obs=1`;
                      navigator.clipboard?.writeText(url);
                      notifySync('Đã sao chép URL OBS (?obs=1)!');
                    }}
                    className="px-3 py-1.5 rounded bg-amber-600 text-black font-bold cursor-pointer"
                  >
                    Sao Chép URL
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-stone-300 space-y-1">
                <div>• Kích thước khuyên dùng trong OBS: <strong>Width: 1080</strong> × <strong>Height: 1920</strong> (Khung dọc 9:16, 60 FPS).</div>
                <div>• Mọi thay đổi trong bảng Admin này hoặc tại <code>/admincp</code> đều tự động đồng bộ sang cửa sổ OBS ngay lập tức qua Socket.IO.</div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            18. DEMO & KIỂM THỬ (TIKTOK COMMENT TESTER, SIMULATED USERS, LOAD TEST)
           ================================================================== */}
        {activeTab === 'demo_testing' && (
          <div className="space-y-3">
            {/* PANEL A: TEST BÌNH LUẬN TIKTOK & QUẢN LÝ USER GIẢ LẬP */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-400 uppercase">
                  💬 Test Bình Luận TikTok & Điều Khiển User Giả Lập (Đồng Bộ Game & OBS)
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px]">
                  Chế độ Test Độc Lập • Không đẩy lên TikTok thật
                </span>
              </div>

              {/* Select Existing Simulated User to Continue Interacting */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-stone-300 font-semibold">
                    👤 Chọn User giả lập đang có trong Đại Điện ({disciples.length} người) để tiếp tục tương tác:
                  </label>
                  {selectedDisciple && (
                    <span className="text-[11px] text-amber-300">
                      Đang chọn: <strong>{selectedDisciple.displayName}</strong> (ID:{' '}
                      <code>{selectedDisciple.userId}</code> • Đã bình luận: {selectedDisciple.commentCount} lần • Trạng thái:{' '}
                      <code>{selectedDisciple.animation}</code>)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={testUserId}
                    onChange={e => {
                      const uid = e.target.value;
                      setTestUserId(uid);
                      const found =
                        disciples.find(d => d.userId === uid) ||
                        waitingQueue.find(d => d.userId === uid);
                      if (found) {
                        setTestDisplayName(found.displayName);
                        onSelectDiscipleId(found.userId);
                      }
                    }}
                    className="flex-1 min-w-[220px] px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-amber-200"
                  >
                    <option value={testUserId}>
                      -- Đang nhập ID: {testUserId} ({testDisplayName}) --
                    </option>
                    {disciples.map((d, idx) => (
                      <option key={d.userId} value={d.userId}>
                        #{idx + 1}. {d.displayName} (ID: {d.userId}) — [{d.rankName}] — Bình luận: {d.commentCount}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const targetId = testUserId.trim() || selectedDisciple?.userId;
                      if (!targetId) return;
                      const ok = sectGameManager.removeDisciple(targetId);
                      liveConnectionManager.emitAdminCommand({
                        action: 'remove_disciple',
                        userId: targetId,
                      });
                      notifySync(
                        ok
                          ? `Đã xóa riêng User test "${targetId}" khỏi Đại Điện!`
                          : `Không tìm thấy User "${targetId}" trong Đại Điện.`
                      );
                    }}
                    className="px-3 py-1.5 rounded bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-500/40 font-bold cursor-pointer"
                  >
                    🗑 Xóa Riêng User Này
                  </button>
                  <button
                    onClick={() => {
                      sectGameManager.clearDemoData();
                      liveConnectionManager.emitAdminCommand({ action: 'clear_demo' });
                      notifySync('Đã xóa toàn bộ dữ liệu User test / Demo!');
                    }}
                    className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold cursor-pointer"
                  >
                    🧹 Xóa Toàn Bộ Dữ Liệu Test
                  </button>
                </div>
              </div>

              {/* Input Fields: TikTok User ID, Display Name, Comment Content */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-stone-400 text-[11px] block mb-1">
                    1. TikTok User ID (Hoặc tự tạo ID):
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={testUserId}
                      onChange={e => setTestUserId(e.target.value)}
                      placeholder="VD: tiktok_user_01"
                      className="flex-1 px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 font-mono text-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sampleNames = [
                          'Lệnh Hồ Xung',
                          'Nhậm Doanh Doanh',
                          'Đông Phương Vũ',
                          'Trương Vô Kỵ',
                          'Chu Chỉ Nhược',
                          'Triệu Mẫn',
                          'Dương Quá',
                          'Tiểu Long Nữ',
                          'Kiều Phong',
                          'Đoàn Dự',
                        ];
                        const nextIdx = testUserCounter;
                        setTestUserCounter(c => c + 1);
                        const newId = `test_user_${String(nextIdx).padStart(2, '0')}`;
                        const newName = `${sampleNames[nextIdx % sampleNames.length]} ${nextIdx}`;
                        setTestUserId(newId);
                        setTestDisplayName(newName);
                      }}
                      title="Tạo mã TikTok User ID thử nghiệm mới"
                      className="px-2 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 font-bold cursor-pointer"
                    >
                      🎲 ID Mới
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-stone-400 text-[11px] block mb-1">
                    2. Tên hiển thị TikTok (Tự cắt 5 ký tự dưới chân):
                  </label>
                  <input
                    type="text"
                    value={testDisplayName}
                    onChange={e => setTestDisplayName(e.target.value)}
                    placeholder="VD: Lệnh Hồ Xung"
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>

                <div>
                  <label className="text-stone-400 text-[11px] block mb-1">
                    3. Nội dung bình luận bất kỳ (Hoặc lệnh võ học):
                  </label>
                  <input
                    type="text"
                    value={testCommentText}
                    onChange={e => setTestCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        dispatchTestComment(testUserId, testDisplayName, testCommentText);
                      }
                    }}
                    placeholder="Nhập câu bình luận hoặc: đi, chạy, múa, võ..."
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>
              </div>

              {/* Primary Action Buttons: Send Comment & Spawn New User Walking In */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => dispatchTestComment(testUserId, testDisplayName, testCommentText)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-bold shadow cursor-pointer"
                >
                  📨 Gửi Bình Luận Thử (Cùng User ID Không Tạo Trùng)
                </button>
                <button
                  onClick={() => {
                    const sampleNames = [
                      'Lệnh Hồ Xung',
                      'Nhậm Doanh Doanh',
                      'Độc Cô Cầu Bại',
                      'Trương Vô Kỵ',
                      'Triệu Mẫn',
                      'Dương Tiêu',
                      'Phạm Dao',
                      'Vi Nhất Tiếu',
                      'Tạ Tốn',
                      'Ân Thiên Chính',
                    ];
                    const nextIdx = testUserCounter;
                    setTestUserCounter(c => c + 1);
                    const newUid = `user_moi_${Date.now().toString(36).slice(-4)}_${nextIdx}`;
                    const newName = `${sampleNames[nextIdx % sampleNames.length]} ${nextIdx}`;
                    const commentToUse = testCommentText.trim() || 'Đệ tử mới xin bái kiến Giáo Chủ!';
                    setTestUserId(newUid);
                    setTestDisplayName(newName);
                    dispatchTestComment(newUid, newName, commentToUse);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold shadow cursor-pointer"
                >
                  ➕ Tạo User Mới (Đi Từ Cổng Vào Đại Điện)
                </button>
              </div>

              {/* 10 Quick Command Buttons for Selected Test User */}
              <div className="p-2.5 rounded bg-stone-950 border border-amber-500/30 space-y-2">
                <div className="text-amber-300 font-bold text-[11px]">
                  ⚡ Nút Test Nhanh 10 Lệnh Bình Luận (Áp dụng cho User đang chọn: <span className="text-white">{testDisplayName}</span> — ID: <code>{testUserId}</code>):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { kw: 'đi', label: '🚶 Đi', desc: 'walk' },
                    { kw: 'chạy', label: '🏃 Chạy', desc: 'run' },
                    { kw: 'múa', label: '💃 Múa', desc: 'combo_kungfu' },
                    { kw: 'võ', label: '🥋 Võ', desc: 'combo_kungfu' },
                    { kw: 'đấm', label: '👊 Đấm', desc: 'punch' },
                    { kw: 'đá', label: '🦵 Đá', desc: 'kick' },
                    { kw: 'nhảy', label: '🦘 Nhảy', desc: 'jump' },
                    { kw: 'thiền', label: '🧘 Thiền', desc: 'meditate' },
                    { kw: 'đứng', label: '🧍 Đứng', desc: 'stand_up' },
                    { kw: 'chào', label: '🙇 Chào', desc: 'bow' },
                  ].map(item => (
                    <button
                      key={item.kw}
                      onClick={() => {
                        setTestCommentText(item.kw);
                        dispatchTestComment(testUserId, testDisplayName, item.kw);
                      }}
                      className="px-2.5 py-1.5 rounded bg-stone-800 hover:bg-amber-600 hover:text-black text-amber-200 border border-stone-700 font-bold transition cursor-pointer flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      <code className="text-[10px] opacity-75">"{item.kw}"</code>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-User Simultaneous Comment Testing */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                <div className="text-sky-300 font-bold text-[11px]">
                  👥 Test Nhiều User Bình Luận & Hành Động Cùng Lúc:
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 30, 80].map(cnt => (
                    <button
                      key={`multi_cmt_${cnt}`}
                      onClick={() => {
                        const actual = sectGameManager.triggerMultiUserTestComments(cnt);
                        liveConnectionManager.emitAdminCommand({
                          action: 'multi_test_comments',
                          count: cnt,
                        });
                        notifySync(`Đã cho ${actual} User đồng loạt gửi bình luận & thi triển võ học!`);
                      }}
                      className="px-3 py-1.5 rounded bg-sky-800 hover:bg-sky-700 text-white font-bold cursor-pointer"
                    >
                      ⚡ {cnt} User Bình Luận Cùng Lúc
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const custom = testCommentText.trim() || 'múa';
                      const count = Math.max(1, disciples.length);
                      const actual = sectGameManager.triggerMultiUserTestComments(count, custom);
                      liveConnectionManager.emitAdminCommand({
                        action: 'multi_test_comments',
                        count,
                        comment: custom,
                      });
                      notifySync(`Toàn bộ ${actual} User trong sảnh đồng loạt bình luận: "${custom}"!`);
                    }}
                    className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer"
                  >
                    🗣️ Tất Cả Sảnh Cùng Gửi "{testCommentText.trim() || 'múa'}"
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL B: BỘ CÔNG CỤ KIỂM THỬ TẢI & SỰ KIỆN (1 - 200 NGƯỜI CHƠI) */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">🧪 Bộ Công Cụ Kiểm Thử Tải & Sự Kiện (1 – 200 Người Chơi)</div>

              <div>
                <div className="text-stone-400 mb-1.5">1. Đặt chính xác quân số kiểm thử trên sàn Đại Điện (1 / 10 / 30 / 50 / 80 nhân vật):</div>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {[1, 10, 30, 50, 80].map(cnt => (
                    <button
                      key={`preset_${cnt}`}
                      onClick={() => {
                        sectGameManager.setPopulationPreset(cnt);
                        liveConnectionManager.emitAdminCommand({
                          action: 'set_population',
                          count: cnt,
                        });
                        notifySync(`Đã đặt chính xác ${cnt} nhân vật phân bố toàn Đại Điện!`);
                      }}
                      className={`px-3 py-1.5 rounded font-bold cursor-pointer ${
                        disciples.length === cnt
                          ? 'bg-amber-500 text-black'
                          : 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-500/40'
                      }`}
                    >
                      🎯 Xem {cnt} Nhân Vật
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      sectGameManager.redistributeAllDisciples();
                      liveConnectionManager.emitAdminCommand({ action: 'redistribute' });
                      notifySync('Đã phân bố lại toàn bộ nhân vật trên khắp mặt sàn!');
                    }}
                    className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold cursor-pointer"
                  >
                    🔀 Phân Bố Lại Vị Trí
                  </button>
                </div>

                <div className="text-stone-400 mb-1.5">1b. Cộng thêm người chơi bình luận nhập môn (+1 đến +200):</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 10, 30, 50, 80, 200].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => {
                        sectGameManager.spawnDemoPlayers(cnt);
                        liveConnectionManager.emitAdminCommand({
                          action: 'spawn_demo',
                          count: cnt,
                        });
                        notifySync(`Đã giả lập +${cnt} người chơi bình luận!`);
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                    >
                      +{cnt} Người Chơi {cnt === 200 ? '(Test Hàng Chờ 80+120)' : ''}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      sectGameManager.clearDemoData();
                      liveConnectionManager.emitAdminCommand({ action: 'clear_demo' });
                      notifySync('Đã xóa sạch toàn bộ dữ liệu Demo!');
                    }}
                    className="px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer"
                  >
                    🧹 Xóa Sạch Demo
                  </button>
                </div>
              </div>

              <div>
                <div className="text-stone-400 mb-1.5">2. Giả lập tặng quà thăng cấp (1 ➔ 199 X & Đoạt Ngai):</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 5, 10, 20, 50, 99, 199].map(coin => (
                    <button
                      key={coin}
                      onClick={() => {
                        const evt: TikTokLiveEvent = {
                          id: `sim_gift_${Date.now()}`,
                          type: 'gift',
                          timestamp: Date.now(),
                          userId: selectedDisciple?.userId || `hero_${coin}`,
                          uniqueId: selectedDisciple?.uniqueId || `hero_${coin}`,
                          nickname: selectedDisciple?.displayName || `Cao Thủ ${coin} X`,
                          coinValue: coin,
                          giftName: 'Bảo Vật Ma Giáo',
                          giftCount: 1,
                          isDemo: true,
                        };
                        sectGameManager.handleGiftEvent(evt);
                        liveConnectionManager.emitAdminCommand({
                          action: 'test_live_event',
                          event: evt,
                        });
                      }}
                      className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold cursor-pointer"
                    >
                      🎁 Tặng {coin} X
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const evt: TikTokLiveEvent = {
                        id: `sim_throne_${Date.now()}`,
                        type: 'gift',
                        timestamp: Date.now(),
                        userId: 'supreme_leader_demo',
                        uniqueId: 'supreme_leader_demo',
                        nickname: 'Đông Phương Bất Bại',
                        giftId: 9999,
                        giftName: 'Long Ngai Chí Tôn',
                        coinValue: 1000,
                        giftCount: 1,
                        isDemo: true,
                      };
                      sectGameManager.handleGiftEvent(evt);
                      liveConnectionManager.emitAdminCommand({
                        action: 'test_live_event',
                        event: evt,
                      });
                    }}
                    className="px-3 py-1.5 rounded bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold cursor-pointer"
                  >
                    🐉 Tặng Quà Chí Tôn (Soán Ngai Giáo Chủ)
                  </button>
                </div>
              </div>

              <div>
                <div className="text-stone-400 mb-1.5">3. Kiểm thử âm thanh Võ Hiệp (Web Audio Synthesizer):</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => soundSynthesizer.playGong(1.0)}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                  >
                    🔔 Tiếng Chiêng Đồng
                  </button>
                  <button
                    onClick={() => soundSynthesizer.playWarDrum(3)}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                  >
                    🥁 Trống Trận Ma Giáo
                  </button>
                  <button
                    onClick={() => soundSynthesizer.playSwordSlash()}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                  >
                    ⚔️ Kiếm Khí Xé Gió
                  </button>
                  <button
                    onClick={() => soundSynthesizer.playThroneFanfare()}
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                  >
                    🎺 Nhạc Đăng Cơ Giáo Chủ
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL C: KIỂM THỬ THỜI GIAN Ở LẠI & TỰ ĐỘNG RỜI SẢNH (TEST NHANH 5s / 10s / 15s / 30s) */}
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-amber-400 uppercase">
                    ⏱️ Kiểm Thử Thời Gian Ở Lại & Tự Động Rời Sảnh (Test Nhanh 5s – 30s & Bảo Lưu Cấp Bậc)
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Đang cấu hình: <strong className="text-amber-300">{config.stayDurationConfig?.inactivityTimeoutSec || 420}s ({config.stayDurationConfig?.inactivityTimeoutMinutes || 7} phút)</strong> • Cảnh báo trước: {config.stayDurationConfig?.warningBeforeDepartSec || 30}s • Đi ra cổng: {config.stayDurationConfig?.walkToGateOnDepart ? `${config.stayDurationConfig?.departAnimationDurationSec || 4}s` : 'TẮT'}
                  </div>
                </div>
                <button
                  onClick={() => handleResetStayConfig()}
                  className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-bold cursor-pointer"
                >
                  ↺ Khôi Phục Chuẩn 7 Phút (420s)
                </button>
              </div>

              {/* 1. Đặt thời gian rời sảnh ngắn để test nhanh (5s, 10s, 15s, 30s) */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                <div className="text-amber-300 font-bold text-[11px]">
                  1. Đặt thời gian rời sảnh ngắn để kiểm thử nhanh (Áp dụng ngay cho toàn sảnh):
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { sec: 5, warn: 3, label: '⚡ Test Nhanh 5 Giây' },
                    { sec: 10, warn: 4, label: '⚡ Test Nhanh 10 Giây' },
                    { sec: 15, warn: 5, label: '⚡ Test Nhanh 15 Giây' },
                    { sec: 30, warn: 10, label: '⚡ Test Nhanh 30 Giây' },
                  ].map(preset => (
                    <button
                      key={`fast_timeout_${preset.sec}`}
                      onClick={() => {
                        handleSaveStayConfig({
                          inactivityTimeoutSec: preset.sec,
                          inactivityTimeoutMinutes: 1,
                          warningBeforeDepartEnabled: true,
                          warningBeforeDepartSec: preset.warn,
                          autoDepartEnabled: true,
                          walkToGateOnDepart: true,
                          departAnimationDurationSec: 3,
                          applyMode: 'immediate',
                        });
                      }}
                      className={`px-3 py-1.5 rounded font-bold cursor-pointer ${
                        config.stayDurationConfig?.inactivityTimeoutSec === preset.sec
                          ? 'bg-amber-500 text-black'
                          : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Tua nhanh thời gian trôi qua để kiểm tra Cảnh Báo & Đi Ra Cổng Rời Sảnh tức thì */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                <div className="text-sky-300 font-bold text-[11px]">
                  2. Giả lập trôi thời gian không tương tác (Test cảnh báo sắp hết giờ & nhân vật đi bộ ra cổng rời sảnh):
                </div>
                <div className="flex flex-wrap gap-2">
                  {[10, 30, 60, 180, 420].map(sec => (
                    <button
                      key={`sim_elapsed_${sec}`}
                      onClick={() => {
                        sectGameManager.simulateTimeElapsed(sec);
                        liveConnectionManager.emitAdminCommand({
                          action: 'simulate_time_elapsed',
                          seconds: sec,
                        });
                        notifySync(`Đã tua nhanh +${sec}s không tương tác cho toàn bộ người chơi trong sảnh!`);
                      }}
                      className="px-3 py-1.5 rounded bg-sky-800 hover:bg-sky-700 text-white font-bold cursor-pointer"
                    >
                      ⏩ Tua Nhanh +{sec}s {sec === 420 ? '(Đủ 7 Phút Rời Sảnh)' : ''}
                    </button>
                  ))}
                  {selectedDisciple && (
                    <button
                      onClick={() => {
                        const timeoutSec = config.stayDurationConfig?.inactivityTimeoutSec || 420;
                        sectGameManager.simulateTimeElapsed(timeoutSec + 5, selectedDisciple.userId);
                        liveConnectionManager.emitAdminCommand({
                          action: 'simulate_time_elapsed',
                          seconds: timeoutSec + 5,
                          userId: selectedDisciple.userId,
                        });
                        notifySync(`Đã cho riêng ${selectedDisciple.displayName} hết thời gian và đi bộ ra cổng!`);
                      }}
                      className="px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer"
                    >
                      🚪 Cho "{selectedDisciple.displayName}" Hết Giờ & Rời Sảnh Ngay
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Kịch bản kiểm thử tự động: Rời sảnh rồi bình luận quay lại vẫn giữ nguyên Cấp Bậc & Tổng X */}
              <div className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-2">
                <div className="text-emerald-300 font-bold text-[11px]">
                  3. Kiểm thử kịch bản thực tế (Làm mới bộ đếm • Tự múa không kéo dài giờ • Rời sảnh quay lại giữ nguyên Cấp Bậc & X):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const uid = 'test_return_hero';
                      const name = 'Trương Vô Kỵ';
                      // Bước 1: Tạo User & tặng 50 X lên Trưởng Lão
                      sectGameManager.handleCommentEvent({
                        id: `ret_c1_${Date.now()}`,
                        type: 'comment',
                        timestamp: Date.now(),
                        userId: uid,
                        uniqueId: uid,
                        nickname: name,
                        comment: 'Bái kiến Giáo Chủ!',
                        isDemo: true,
                      });
                      sectGameManager.handleGiftEvent({
                        id: `ret_g1_${Date.now()}`,
                        type: 'gift',
                        timestamp: Date.now(),
                        userId: uid,
                        uniqueId: uid,
                        nickname: name,
                        coinValue: 50,
                        giftName: 'Trưởng Lão Lệnh',
                        giftCount: 1,
                        isDemo: true,
                      });
                      // Bước 2: Cho hết giờ rời sảnh ngay
                      const prevWalk = config.stayDurationConfig?.walkToGateOnDepart;
                      sectGameManager.setStayDurationConfig({ walkToGateOnDepart: false });
                      sectGameManager.simulateTimeElapsed(9999, uid);
                      sectGameManager.setStayDurationConfig({ walkToGateOnDepart: prevWalk ?? true });
                      // Bước 3: Bình luận quay lại sảnh -> Kiểm tra giữ nguyên 50 X & Trưởng Lão
                      const res = sectGameManager.handleCommentEvent({
                        id: `ret_c2_${Date.now() + 1}`,
                        type: 'comment',
                        timestamp: Date.now() + 1,
                        userId: uid,
                        uniqueId: uid,
                        nickname: name,
                        comment: 'Đệ tử đã quay lại đại điện!',
                        isDemo: true,
                      });
                      onSelectDiscipleId(uid);
                      notifySync(
                        `✓ Kịch bản hoàn tất: ${name} rời sảnh rồi bình luận quay lại vẫn giữ nguyên ${res.disciple?.totalCoins} X & chức danh [${res.disciple?.rankName}]!`
                      );
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    🔄 Test Rời Sảnh Rồi Quay Lại Giữ Nguyên 50 X & Chức Danh
                  </button>

                  <button
                    onClick={() => {
                      if (!selectedDisciple) return;
                      const beforeSec = selectedDisciple.remainingStaySec;
                      sectGameManager.triggerMassPlayerAnimation('combo_kungfu');
                      const afterSnap = sectGameManager.getSnapshot();
                      const afterUser = afterSnap.disciples.find(d => d.userId === selectedDisciple.userId);
                      notifySync(
                        `✓ Đã phát hoạt ảnh tự múa võ: Thời gian còn lại của ${selectedDisciple.displayName} giữ nguyên (${beforeSec}s ➔ ${afterUser?.remainingStaySec}s), KHÔNG bị cộng thêm giờ!`
                      );
                    }}
                    className="px-3 py-1.5 rounded bg-purple-800 hover:bg-purple-700 text-white font-bold cursor-pointer"
                  >
                    🧘 Kiểm Chứng Tự Múa Võ Không Làm Mới Bộ Đếm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            19. CẤU HÌNH BACKEND & API (BACKUP / RESTORE / RESET)
           ================================================================== */}
        {activeTab === 'backend_api' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-stone-900 border border-amber-500/30 space-y-3">
              <div className="font-bold text-amber-400 uppercase">⚙️ Sao Lưu, Khôi Phục & Cấu Hình Backend</div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/config/export"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded bg-amber-600 text-black font-bold"
                >
                  ⬇ Tải Xuống Toàn Bộ Cấu Hình JSON
                </a>
                <button
                  onClick={async () => {
                    const resp = await fetch('/api/config/reset', { method: 'POST' });
                    if (resp.ok) {
                      const data = await resp.json();
                      if (data.config) sectGameManager.updateMasterConfig(data.config);
                      notifySync('Đã khôi phục toàn bộ cấu hình gốc!');
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer"
                >
                  ↺ Khôi Phục Cài Đặt Gốc (Factory Reset)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            20. NHẬT KÝ & CHẨN ĐOÁN (FILTERED SYSTEM LOGS)
           ================================================================== */}
        {activeTab === 'logs_diagnostics' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 p-2.5 rounded-lg border border-amber-500/30">
              <div className="font-bold text-amber-400 uppercase">📋 Nhật Ký Hệ Thống ({logs.length})</div>
              <div className="flex flex-wrap gap-1">
                {['ALL', 'comment', 'gift', 'promotion', 'minigame', 'tts', 'leader', 'scene', 'system'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setLogFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                      logFilter === cat ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1 font-mono text-[11px]">
              {logs
                .filter(l => logFilter === 'ALL' || l.type === logFilter)
                .map(entry => (
                  <div
                    key={entry.id}
                    className="p-2 rounded bg-stone-900/90 border border-stone-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="text-amber-400 font-bold mr-1.5">[{entry.type.toUpperCase()}]</span>
                      <span className="text-stone-100 font-semibold">{entry.title}</span>
                      <div className="text-stone-400 text-[10px]">{entry.detail}</div>
                    </div>
                    <span className="text-[10px] text-stone-500 shrink-0 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
