import React, { useEffect, useState } from 'react';
import { MaGiao2DCanvas } from './components/game/MaGiao2DCanvas';
import { MaGiaoOverlayHUD } from './components/ui/MaGiaoOverlayHUD';
import { AdminControlCenter } from './components/admin/AdminControlCenter';
import { sectGameManager, GameStateSnapshot } from './systems/SectGameManager';
import { liveConnectionManager } from './systems/LiveConnectionManager';
import { giftRegistry } from './systems/GiftRegistry';
import { soundSynthesizer } from './systems/SoundSynthesizer';
import {
  LiveConnectionStatus,
  PlayerAnimationState,
  SectLeaderAnimationId,
  TikTokLiveEvent,
} from './types/magiao';

export function App() {
  const [snapshot, setSnapshot] = useState<GameStateSnapshot>(() =>
    sectGameManager.getSnapshot()
  );
  const [liveStatus, setLiveStatus] = useState<LiveConnectionStatus>(() =>
    liveConnectionManager.getStatus()
  );
  const [selectedDiscipleId, setSelectedDiscipleId] = useState<string | null>(null);
  const [showAdminSidebar, setShowAdminSidebar] = useState<boolean>(true);

  // Quick interactive bar inputs for host testing
  const [quickPlayerName, setQuickPlayerName] = useState('Lệnh Hồ Xung');
  const [quickComment, setQuickComment] = useState('võ');

  const isOBSMode =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('obs') === '1' ||
      new URLSearchParams(window.location.search).get('clean') === '1');

  const isAdminRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/admincp') ||
      new URLSearchParams(window.location.search).get('admin') === '1');

  useEffect(() => {
    const unsubGame = sectGameManager.subscribe(setSnapshot);
    const unsubStatus = liveConnectionManager.onStatus(setLiveStatus);
    const unsubEvent = liveConnectionManager.onEvent(evt => {
      sectGameManager.handleIncomingEvent(evt);
    });
    const unsubConfig = liveConnectionManager.onConfigUpdate(cfg => {
      sectGameManager.updateMasterConfig(cfg);
    });
    const unsubAdminCmd = liveConnectionManager.onAdminCommand(cmd => {
      const isRemote = cmd.senderClientId !== liveConnectionManager.getClientId();
      if (cmd.action === 'leader_anim' && typeof cmd.animId === 'string') {
        if (isRemote) {
          sectGameManager.triggerSectLeaderAnimation(cmd.animId as SectLeaderAnimationId);
        }
      } else if (isRemote && cmd.action === 'test_live_event' && cmd.event) {
        sectGameManager.handleIncomingEvent(cmd.event as TikTokLiveEvent);
      } else if (isRemote && cmd.action === 'multi_test_comments') {
        sectGameManager.triggerMultiUserTestComments(
          Number(cmd.count) || 5,
          typeof cmd.comment === 'string' ? cmd.comment : undefined
        );
      } else if (isRemote && cmd.action === 'set_population' && typeof cmd.count === 'number') {
        sectGameManager.setPopulationPreset(cmd.count);
      } else if (isRemote && cmd.action === 'spawn_demo' && typeof cmd.count === 'number') {
        sectGameManager.spawnDemoPlayers(cmd.count);
      } else if (isRemote && cmd.action === 'redistribute') {
        sectGameManager.redistributeAllDisciples();
      } else if (isRemote && cmd.action === 'mass_anim' && typeof cmd.anim === 'string') {
        sectGameManager.triggerMassPlayerAnimation(cmd.anim as PlayerAnimationState);
      } else if (isRemote && cmd.action === 'resume_free_roam') {
        sectGameManager.resumeAllFreeRoam();
      } else if (isRemote && cmd.action === 'remove_disciple' && typeof cmd.userId === 'string') {
        sectGameManager.removeDisciple(cmd.userId);
      } else if (isRemote && cmd.action === 'reset_demo_coins') {
        sectGameManager.resetDemoCoins(typeof cmd.userId === 'string' ? cmd.userId : undefined);
      } else if (isRemote && cmd.action === 'import_rank_ledger' && cmd.payload) {
        sectGameManager.importRankAndLedgerData(cmd.payload as Record<string, unknown>);
      } else if (isRemote && cmd.action === 'extend_stay_time') {
        sectGameManager.extendDiscipleStayTime(
          typeof cmd.userId === 'string' ? cmd.userId : undefined,
          Number(cmd.addSeconds) || 120,
          typeof cmd.reason === 'string' ? cmd.reason : 'Admin gia hạn'
        );
      } else if (isRemote && cmd.action === 'simulate_time_elapsed') {
        sectGameManager.simulateTimeElapsed(
          Number(cmd.seconds) || 30,
          typeof cmd.userId === 'string' ? cmd.userId : undefined
        );
      } else if (isRemote && cmd.action === 'update_stay_config' && cmd.stayDurationConfig) {
        sectGameManager.setStayDurationConfig(cmd.stayDurationConfig as Record<string, unknown>);
      } else if (isRemote && cmd.action === 'reset_stay_config') {
        sectGameManager.resetStayDurationConfig();
      } else if (isRemote && cmd.action === 'test_diet_mon') {
        sectGameManager.triggerTestDietMon(
          typeof cmd.userId === 'string' ? cmd.userId : undefined,
          typeof cmd.displayName === 'string' ? cmd.displayName : undefined,
          typeof cmd.avatarUrl === 'string' ? cmd.avatarUrl : undefined
        );
      } else if (isRemote && cmd.action === 'stop_diet_mon') {
        sectGameManager.stopDietMonEmergency();
      } else if (isRemote && cmd.action === 'rebuild_hall') {
        sectGameManager.rebuildHallImmediately();
      } else if (isRemote && cmd.action === 'update_diet_mon_config' && cmd.dietMonConfig) {
        sectGameManager.setDietMonConfig(cmd.dietMonConfig as Record<string, unknown>);
      } else if (isRemote && cmd.action === 'clear_demo') {
        sectGameManager.clearDemoData();
      } else if (isRemote && cmd.action === 'clear_all') {
        sectGameManager.clearAllPlayers();
      }
    });

    sectGameManager.startLoop();
    liveConnectionManager.connectSocket();
    giftRegistry.fetchFromServer();

    // Load persisted master config from server
    fetch('/api/config')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.config) {
          sectGameManager.updateMasterConfig(data.config);
        }
      })
      .catch(() => {});

    // Spawn 30 initial disciples distributed across the entire Đại Điện & Central Aisle
    if (sectGameManager.getDiscipleCount() === 0) {
      sectGameManager.spawnDemoPlayers(30);
    }

    return () => {
      unsubGame();
      unsubStatus();
      unsubEvent();
      unsubConfig();
      unsubAdminCmd();
      sectGameManager.stopLoop();
    };
  }, []);

  // 1. OBS CLEAN VIEW (?obs=1)
  if (isOBSMode) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="relative h-full aspect-[9/16] max-w-full overflow-hidden shadow-2xl border border-amber-500/20">
          <MaGiao2DCanvas
            activeScene={snapshot.activeScene}
            sectLeader={snapshot.sectLeader}
            disciples={snapshot.disciples}
            miniGame={snapshot.miniGame}
            sceneConfig={snapshot.config.sceneConfig}
            overlayConfig={snapshot.config.overlayConfig}
            dietMon={snapshot.dietMon}
            thronePosition={snapshot.config.sectLeader.thronePosition}
            minSeparationDist={snapshot.config.playerAnimationConfig.minSeparationDist}
          />
          <MaGiaoOverlayHUD snapshot={snapshot} isOBSMode />
        </div>
      </div>
    );
  }

  // 2. DEDICATED /admincp ROUTE OR STUDIO SPLIT VIEW
  return (
    <div
      className="w-screen h-screen bg-[#07050C] text-stone-100 flex flex-col overflow-hidden"
      onClick={() => soundSynthesizer.startAmbientGuqin()}
    >
      {/* TOP STUDIO NAVIGATION HEADER */}
      <header className="h-12 shrink-0 px-3 bg-[#100C1C] border-b border-amber-500/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🐉</span>
          <div className="truncate">
            <h1 className="text-xs sm:text-sm font-bold tracking-wider text-amber-400 uppercase font-['Cinzel'] truncate">
              MA GIÁO ONLINE – THIÊN HẠ ĐỆ NHẤT TÀ PHÁI
            </h1>
            <p className="text-[10px] text-stone-400 truncate">
              Free Roam Đại Điện • Lối Đi Chính Giữa • 80 Đệ Tử • 35 Hoạt Ảnh Giáo Chủ
            </p>
          </div>
        </div>

        {/* Quick Population Presets (1 / 10 / 30 / 50 / 80) for Instant Inspection */}
        <div className="hidden md:flex items-center gap-1 bg-stone-900/90 px-2 py-1 rounded-lg border border-amber-500/30">
          <span className="text-[10px] text-amber-300 font-bold mr-1">Quân số:</span>
          {[1, 10, 30, 50, 80].map(cnt => (
            <button
              key={cnt}
              onClick={() => {
                sectGameManager.setPopulationPreset(cnt);
                liveConnectionManager.emitAdminCommand({ action: 'set_population', count: cnt });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                snapshot.disciples.length === cnt
                  ? 'bg-amber-500 text-black'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-200'
              }`}
            >
              {cnt}
            </button>
          ))}
          <button
            onClick={() => {
              sectGameManager.redistributeAllDisciples();
              liveConnectionManager.emitAdminCommand({ action: 'redistribute' });
            }}
            className="ml-1 px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
            title="Phân bố lại toàn bộ nhân vật trên khắp mặt sàn Đại Điện"
          >
            🔀 Phân Bố
          </button>
        </div>

        {/* Quick Live Simulation Bar in Header */}
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!quickComment.trim()) return;
            const cleanId = `host_${quickPlayerName.toLowerCase().replace(/\s+/g, '_')}`;
            const testEvt: TikTokLiveEvent = {
              id: `quick_${Date.now()}`,
              type: 'comment',
              timestamp: Date.now(),
              userId: cleanId,
              uniqueId: cleanId,
              nickname: quickPlayerName.trim() || 'Độc Cô Cầu Bại',
              comment: quickComment.trim(),
              isDemo: true,
            };
            sectGameManager.handleCommentEvent(testEvt);
            liveConnectionManager.emitAdminCommand({ action: 'test_live_event', event: testEvt });
          }}
          className="hidden xl:flex items-center gap-1.5 bg-stone-900/90 px-2 py-1 rounded-lg border border-stone-700"
        >
          <input
            type="text"
            value={quickPlayerName}
            onChange={e => setQuickPlayerName(e.target.value)}
            placeholder="Tên đệ tử"
            className="w-24 px-2 py-0.5 rounded bg-stone-950 border border-stone-700 text-xs text-amber-200"
          />
          <input
            type="text"
            value={quickComment}
            onChange={e => setQuickComment(e.target.value)}
            placeholder="Gõ: đi, chạy, võ, múa, đấm..."
            className="w-36 px-2 py-0.5 rounded bg-stone-950 border border-stone-700 text-xs text-stone-100"
          />
          <button
            type="submit"
            className="px-2 py-0.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-bold cursor-pointer"
          >
            Gửi
          </button>
        </form>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="/?obs=1"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-amber-500/40 text-amber-300 text-xs font-semibold"
          >
            🎥 OBS (?obs=1)
          </a>
          <button
            onClick={() => setShowAdminSidebar(v => !v)}
            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold cursor-pointer"
          >
            {showAdminSidebar ? 'Ẩn Quản Trị' : '⚙️ Mở Quản Trị (20 Mục)'}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: 9:16 VERTICAL STAGE + 20-CATEGORY ADMIN PANEL */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Center 9:16 Vertical Game Stage */}
        <div
          className={`${
            isAdminRoute ? 'hidden md:flex md:w-[360px] lg:w-[410px]' : showAdminSidebar ? 'w-full md:w-[42%] lg:w-[38%]' : 'w-full'
          } h-full bg-[#050408] flex flex-col items-center justify-center p-2 relative shrink-0`}
        >
          <div className="relative h-full max-h-full aspect-[9/16] rounded-xl overflow-hidden border-2 border-amber-500/45 shadow-[0_0_40px_rgba(220,38,38,0.22)]">
            <MaGiao2DCanvas
              activeScene={snapshot.activeScene}
              sectLeader={snapshot.sectLeader}
              disciples={snapshot.disciples}
              miniGame={snapshot.miniGame}
              sceneConfig={snapshot.config.sceneConfig}
              overlayConfig={snapshot.config.overlayConfig}
              dietMon={snapshot.dietMon}
              thronePosition={snapshot.config.sectLeader.thronePosition}
              minSeparationDist={snapshot.config.playerAnimationConfig.minSeparationDist}
              selectedDiscipleId={selectedDiscipleId}
              onSelectDisciple={d => setSelectedDiscipleId(d.userId)}
            />
            <MaGiaoOverlayHUD snapshot={snapshot} />
          </div>
        </div>

        {/* Right 20-Category Admin Control Center */}
        {(showAdminSidebar || isAdminRoute) && (
          <div className="flex-1 h-full overflow-hidden">
            <AdminControlCenter
              snapshot={snapshot}
              liveStatus={liveStatus}
              selectedDiscipleId={selectedDiscipleId}
              onSelectDiscipleId={setSelectedDiscipleId}
              fullPageMode={isAdminRoute}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
