import React, { useEffect, useMemo, useState } from 'react';
import { GameStateSnapshot } from '../../systems/SectGameManager';
import {
  labelCollisionManager,
  LabelRectInput,
} from '../../systems/LabelCollisionManager';
import { NoticePanelId } from '../../types/magiao';

interface MaGiaoOverlayHUDProps {
  snapshot: GameStateSnapshot;
  isOBSMode?: boolean;
}

const CRISP_TEXT_SHADOW: React.CSSProperties = {
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.96), 0 0 6px rgba(0, 0, 0, 0.85)',
};

/**
 * Custom Ma Giáo Sacred Seal SVG Emblem (replaces all generic TikTok gift emojis in PHONG CẤP)
 */
const MaGiaoRankEmblemSVG: React.FC<{
  coreColor: string;
  flameColor?: string;
  isApocalypse?: boolean;
}> = ({ coreColor, flameColor = '#A855F7', isApocalypse = false }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-3 h-3 shrink-0 inline-block mr-1"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10.2"
      fill="#12071D"
      stroke="#D4AF37"
      strokeWidth="1.8"
    />
    <polygon
      points="12,3.2 14.6,8.4 20.2,9.2 16,13.2 17,18.8 12,16 7,18.8 8,13.2 3.8,9.2 9.4,8.4"
      fill={flameColor}
      fillOpacity="0.42"
      stroke="#D4AF37"
      strokeWidth="0.9"
    />
    <path
      d="M12 5.2 C14.8 8.5, 16.5 11.2, 12 18.2 C7.5 11.2, 9.2 8.5, 12 5.2 Z"
      fill={coreColor}
    />
    <circle
      cx="12"
      cy="12"
      r={isApocalypse ? '3.1' : '2.2'}
      fill={isApocalypse ? '#FEF08A' : '#FDE68A'}
    />
  </svg>
);

export const MaGiaoOverlayHUD: React.FC<MaGiaoOverlayHUDProps> = ({
  snapshot,
}) => {
  const {
    config,
    activeScene,
    nextSceneCountdownSec,
    sectLeader,
    disciples,
    waitingQueue,
    sweepingDisciples,
    elderLeaderboard,
    promotions,
    miniGame,
    dietMon,
  } = snapshot;

  const { overlayConfig, commentSettings, noticePanels } = config;
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [avatarLoadError, setAvatarLoadError] = useState<boolean>(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [dietMon?.triggerAvatarUrl, dietMon?.startedAt]);

  // Smooth 50ms clock for 0.7s fade-out and 4.0s auto-unmount of temporary popups
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  const now = Math.max(nowMs, Date.now());

  // Background opacity (default 0.4) applied ONLY to rgba() background so text/icons stay 100% sharp
  const panelBgOpacity = Math.max(0.05, Math.min(0.95, overlayConfig.panelBgOpacity ?? 0.4));
  const popupDurationMs = Math.max(1000, overlayConfig.popupDurationMs || 4000);
  const popupFadeOutMs = Math.min(
    popupDurationMs - 200,
    Math.max(100, overlayConfig.popupFadeOutMs || 700)
  );
  const autoHidePopups = overlayConfig.autoHidePopups !== false;

  const isPanelEnabled = (id: NoticePanelId): boolean => {
    const found = noticePanels.find(p => p.id === id);
    return found ? found.enabled : true;
  };

  const computePopupVisibility = (startedAt?: number): { visible: boolean; opacity: number } => {
    if (!startedAt) return { visible: false, opacity: 0 };
    if (!autoHidePopups) return { visible: true, opacity: 1 };
    const elapsed = Math.max(0, now - startedAt);
    if (elapsed >= popupDurationMs) {
      return { visible: false, opacity: 0 };
    }
    const fadeStart = popupDurationMs - popupFadeOutMs;
    if (elapsed >= fadeStart) {
      const ratio = Math.max(0, Math.min(1, (popupDurationMs - elapsed) / popupFadeOutMs));
      return { visible: true, opacity: Number(ratio.toFixed(3)) };
    }
    return { visible: true, opacity: 1 };
  };

  // Solve non-overlapping positions for 5-char nameplates (below feet) and comment bubbles (above head)
  const solvedLabels = useMemo(() => {
    const inputs: LabelRectInput[] = [];

    for (const d of disciples) {
      // Nameplate synchronized directly below character's feet
      inputs.push({
        id: `name_${d.userId}`,
        anchorX: d.x,
        anchorY: Math.min(95.5, d.y + 2.9),
        widthPct: 9.5,
        heightPct: 2.1,
        priority: d.totalCoins + (d.isSectLeader ? 10000 : d.isCoLeader ? 5000 : 10),
        type: 'nameplate',
      });

      // Active comment bubble above head
      if (
        commentSettings.showCommentBubble &&
        d.lastComment &&
        d.commentBubbleExpiresAt &&
        d.commentBubbleExpiresAt > now
      ) {
        inputs.push({
          id: `bubble_${d.userId}`,
          anchorX: d.x,
          anchorY: Math.max(8, d.y - 4.8),
          widthPct: 22,
          heightPct: 4.0,
          priority: 1000 + d.totalCoins,
          type: 'bubble',
        });
      }
    }

    return labelCollisionManager.solveLayout(
      inputs,
      commentSettings.maxConcurrentBubbles || 12,
      80
    );
  }, [disciples, commentSettings.showCommentBubble, commentSettings.maxConcurrentBubbles, now]);

  const latestPromotion = useMemo(() => {
    if (promotions.length === 0) return null;
    const candidate = promotions[0];
    if (!candidate) return null;
    if (autoHidePopups && now - candidate.timestamp >= popupDurationMs) {
      return null;
    }
    return candidate;
  }, [promotions, now, autoHidePopups, popupDurationMs]);

  const promotionFade = computePopupVisibility(latestPromotion?.timestamp);
  const speechFade = computePopupVisibility(
    sectLeader.currentSpeechText ? sectLeader.speechStartedAt || sectLeader.animationStartedAt : undefined
  );
  const miniGameResultFade = computePopupVisibility(
    miniGame.isActive && miniGame.phase === 'result'
      ? miniGame.resultStartedAt || miniGame.startedAt
      : undefined
  );

  // Synchronized Throne & Sweeping Courtyard HUD positions
  const thronePos = config.sectLeader.thronePosition || { x: 50, y: 22.13 };
  const leaderNameplateTopPct = Math.max(6.2, thronePos.y - 10.5); // ~11.63% (lowered by 30px from 8.5%)
  const leaderSpeechTopPct = Math.min(44, thronePos.y + 7.4); // ~29.53% (below Throne steps, never covers Sect Leader's face)

  const sweepZone = config.sceneConfig.zones?.sweeping_courtyard || {
    xMin: 73,
    xMax: 94,
    yMin: 85.4,
    yMax: 92.4,
  };
  // Raised by 25px (+2.6% from bottom: 6.5% -> 9.1%)
  const sweepingPanelBottomPct = Math.max(6.5, Math.min(28, 100 - sweepZone.yMax + 1.5));

  // Live behavior distribution counter for transparency
  const behaviorStats = useMemo(() => {
    let moving = 0;
    let kungfu = 0;
    let meditating = 0;
    for (const d of disciples) {
      if (d.animation === 'walk' || d.animation === 'run') moving += 1;
      else if (
        d.animation === 'punch' ||
        d.animation === 'kick' ||
        d.animation === 'combo_kungfu' ||
        d.animation === 'jump'
      ) {
        kungfu += 1;
      } else if (d.animation === 'meditate' || d.animation === 'stand_up') {
        meditating += 1;
      }
    }
    return { moving, kungfu, meditating };
  }, [disciples]);

  // Official rank rows in PHONG CẤP table (dynamically bound to config.ranks + Diệt Môn threshold)
  const phongCapRows = useMemo(() => {
    const sorted = [...config.ranks]
      .filter(r => r.minCoins > 0)
      .sort((a, b) => a.minCoins - b.minCoins);
    return sorted.map(r => {
      let textColor = 'text-emerald-300';
      let coreColor = '#10B981';
      let flameColor = '#A855F7';
      if (r.minCoins >= 199) {
        textColor = 'text-yellow-300 font-bold';
        coreColor = '#EF4444';
        flameColor = '#FACC15';
      } else if (r.minCoins >= 99) {
        textColor = 'text-amber-300 font-bold';
        coreColor = '#F59E0B';
        flameColor = '#E879F9';
      } else if (r.minCoins >= 50) {
        textColor = 'text-rose-200';
        coreColor = '#F43F5E';
      } else if (r.minCoins >= 20) {
        textColor = 'text-fuchsia-200';
        coreColor = '#D946EF';
      } else if (r.minCoins >= 10) {
        textColor = 'text-purple-200';
        coreColor = '#A855F7';
      } else if (r.minCoins >= 5) {
        textColor = 'text-sky-300';
        coreColor = '#38BDF8';
      }
      return {
        id: r.id,
        coins: r.minCoins,
        name: r.displayName,
        textColor,
        coreColor,
        flameColor,
      };
    });
  }, [config.ranks]);

  const dietMonThreshold = config.dietMonConfig?.coinThreshold || 1000;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ transform: `scale(${overlayConfig.hudScale || 1})`, transformOrigin: 'top center' }}
    >
      {/* Scoped Custom CSS from Tab 16 */}
      {overlayConfig.customCss && <style>{overlayConfig.customCss}</style>}

      {/* 1. TOP HEADER BAR: SECT TITLE, SCENE STATUS & MINI-GAME COUNTDOWN */}
      {overlayConfig.showHeaderBanner && (
        <div
          className="magiao-hud-panel absolute top-1.5 left-2 right-2 z-20 flex items-center justify-between px-2.5 py-1 rounded-lg border border-amber-500/55 shadow-lg"
          style={{
            backgroundColor: `rgba(10, 6, 18, ${Math.min(0.85, panelBgOpacity + 0.25)})`,
            ...CRISP_TEXT_SHADOW,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="truncate">
              <div className="text-[10.5px] font-bold tracking-wider text-amber-300 uppercase font-['Cinzel']">
                MA GIÁO ONLINE • THIÊN HẠ ĐỆ NHẤT TÀ PHÁI
              </div>
              <div className="text-[8.5px] text-white flex items-center gap-1.5 tabular-nums">
                <span>
                  Cảnh: <strong className="text-red-400">{activeScene === 'main_hall' ? 'ĐẠI ĐIỆN' : 'SÂN LUYỆN VÕ'}</strong>
                </span>
                <span>•</span>
                <span>
                  Quân số: <strong className="text-amber-300">{disciples.length}/{config.sceneConfig.maxConcurrentPlayers}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-semibold">
                  Đi:{behaviorStats.moving} Võ:{behaviorStats.kungfu} Thiền:{behaviorStats.meditating}
                </span>
                {waitingQueue.length > 0 && (
                  <span className="text-purple-200 font-semibold">(Chờ: {waitingQueue.length})</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 tabular-nums">
            <div className="text-[8px] uppercase text-amber-200">Kỳ Sát Hạch</div>
            <div className="text-[10.5px] font-bold text-amber-300 font-mono">
              {miniGame.isActive ? `ĐANG THI (${miniGame.remainingSec}s)` : `${nextSceneCountdownSec}s`}
            </div>
          </div>
        </div>
      )}

      {/* 2. SECT LEADER NAMEPLATE (SYNCHRONIZED WITH LOWERED THRONE +30PX) */}
      <div
        className="absolute -translate-x-1/2 z-20 flex flex-col items-center w-[46%]"
        style={{
          left: `${thronePos.x}%`,
          top: `${leaderNameplateTopPct}%`,
          ...CRISP_TEXT_SHADOW,
        }}
      >
        <div
          className="px-2.5 py-0.5 rounded-full border border-amber-400/75 shadow-md"
          style={{ backgroundColor: `rgba(22, 8, 18, ${Math.min(0.85, panelBgOpacity + 0.25)})` }}
        >
          <span className="text-[9.5px] font-bold text-amber-300 tracking-wide">
            👑 {sectLeader.currentLeaderName}
          </span>
        </div>
        {sectLeader.hasCustomPlayerLeader && (
          <div
            className="mt-0.5 px-2 py-0.2 rounded border border-purple-400/65 text-[7.5px] text-purple-100 font-semibold"
            style={{ backgroundColor: `rgba(28, 10, 42, ${panelBgOpacity})` }}
          >
            Thái Thượng: {sectLeader.formerLeaderName}
          </div>
        )}
      </div>

      {/* 2B. TEMPORARY SECT LEADER SPEECH POPUP (AUTO-HIDE AFTER 4S WITH 0.7S FADE-OUT, BELOW THRONE STEPS) */}
      {overlayConfig.showSectLeaderSpeechBubble &&
        isPanelEnabled('sect_leader_speech') &&
        sectLeader.currentSpeechText &&
        speechFade.visible && (
          <div
            data-testid="popup-sect-leader-speech"
            className="magiao-hud-panel pointer-events-none absolute -translate-x-1/2 z-30 w-[56%] px-2.5 py-1.5 rounded-xl border border-amber-400/75 shadow-xl transition-opacity duration-150"
            style={{
              left: `${thronePos.x}%`,
              top: `${leaderSpeechTopPct}%`,
              backgroundColor: `rgba(16, 8, 26, ${panelBgOpacity})`,
              opacity: speechFade.opacity,
              ...CRISP_TEXT_SHADOW,
            }}
          >
            <div className="flex items-center justify-between text-[8px] text-amber-300 font-bold mb-0.5">
              <span>📜 THÁNH CHỈ GIÁO CHỦ</span>
              <span className="uppercase text-[7.5px] text-red-300 font-semibold">
                {sectLeader.currentAnimation}
              </span>
            </div>
            <p className="text-[9.5px] leading-snug text-white font-semibold line-clamp-2">
              “{sectLeader.currentSpeechText}”
            </p>
          </div>
        )}

      {/* 3. UPPER-LEFT FIXED PANEL: BẢNG TRƯỞNG LÃO (BACKGROUND OPACITY 0.4, CRISP TEXT) */}
      {overlayConfig.showElderLeaderboard && isPanelEnabled('elder_leaderboard') && (
        <div
          data-testid="panel-elder-leaderboard"
          className="magiao-hud-panel absolute left-1.5 z-20 w-[26.5%] rounded-lg border border-[#D4AF37]/70 p-1.5 shadow-md"
          style={{
            top: '8.2%',
            backgroundColor: `rgba(12, 8, 22, ${panelBgOpacity})`,
            ...CRISP_TEXT_SHADOW,
          }}
        >
          <div className="text-[8px] font-bold uppercase tracking-wider text-amber-300 border-b border-amber-400/35 pb-0.5 mb-1 flex items-center justify-between">
            <span>🏆 TRƯỞNG LÃO</span>
            <span className="text-[7px] text-amber-200 font-semibold">TOP 4</span>
          </div>
          {elderLeaderboard.length === 0 ? (
            <div className="text-[7.5px] text-stone-100 italic py-0.5 leading-tight">
              Chưa có cao thủ dâng lễ vật.
            </div>
          ) : (
            <div className="space-y-0.5">
              {elderLeaderboard.map((elder, idx) => (
                <div
                  key={elder.userId}
                  className="flex items-center justify-between text-[8px] px-1 py-0.5 rounded border border-amber-400/25"
                  style={{ backgroundColor: `rgba(18, 12, 32, ${panelBgOpacity})` }}
                >
                  <div className="truncate pr-1">
                    <span className="text-amber-300 font-bold mr-0.5">#{idx + 1}</span>
                    <span className="text-white font-bold">{elder.compactName}</span>
                  </div>
                  <span className="text-yellow-300 font-mono font-bold shrink-0 tabular-nums text-[7.5px]">
                    {elder.totalCoins}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. UPPER-RIGHT FIXED PANEL: BẢNG PHONG CẤP (CUSTOM MA GIÁO SVG EMBLEMS, NO GIFT EMOJIS) */}
      {overlayConfig.showGiftRankTable && isPanelEnabled('gift_rank_table') && (
        <div
          data-testid="panel-gift-rank-table"
          className="magiao-hud-panel absolute right-1.5 z-20 w-[28.5%] rounded-lg border border-[#D4AF37]/70 p-1.5 shadow-md"
          style={{
            top: '8.2%',
            backgroundColor: `rgba(12, 8, 22, ${panelBgOpacity})`,
            ...CRISP_TEXT_SHADOW,
          }}
        >
          <div className="text-[8px] font-bold uppercase tracking-wider text-amber-300 border-b border-amber-400/35 pb-0.5 mb-0.5 flex items-center gap-1">
            <MaGiaoRankEmblemSVG coreColor="#EF4444" flameColor="#F59E0B" />
            <span>PHONG CẤP</span>
          </div>
          <div className="space-y-0.5 text-[7.5px] leading-tight tabular-nums font-semibold">
            {phongCapRows.map(row => (
              <div key={row.id} className="flex items-center justify-between text-white">
                <span className="flex items-center font-mono text-amber-100">
                  <MaGiaoRankEmblemSVG coreColor={row.coreColor} flameColor={row.flameColor} />
                  {row.coins}
                </span>
                <span className={`truncate ml-1 ${row.textColor}`}>{row.name}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-red-200 font-bold pt-0.5 border-t border-amber-400/40">
              <span className="flex items-center font-mono text-yellow-300">
                <MaGiaoRankEmblemSVG coreColor="#DC2626" flameColor="#FACC15" isApocalypse />
                {dietMonThreshold}
              </span>
              <span className="text-red-400 tracking-tight">DIỆT MÔN</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. ACTIVE MINI-GAME HUD PANEL (BACKGROUND OPACITY 0.4, BELOW THRONE) */}
      {overlayConfig.showMiniGameHUD &&
        isPanelEnabled('minigame_hud') &&
        miniGame.isActive &&
        miniGame.phase === 'playing' && (
          <div
            className="magiao-hud-panel absolute left-3 right-3 z-30 rounded-xl border border-amber-400/80 p-2.5 shadow-2xl"
            style={{
              top: '34%',
              backgroundColor: `rgba(16, 8, 28, ${panelBgOpacity})`,
              ...CRISP_TEXT_SHADOW,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] font-bold text-amber-300 uppercase font-['Cinzel']">
                ⚔️ {miniGame.title} (Hiệp {miniGame.currentRound}/{miniGame.totalRounds})
              </div>
              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold font-mono tabular-nums">
                Còn {miniGame.remainingSec}s
              </span>
            </div>

            {miniGame.gameId === 'ma_quyen_loan_vu' && (
              <div className="text-[10px] text-white font-semibold mb-1.5">
                Bình luận từ khóa <strong className="text-yellow-300 underline">MÚA</strong> (mỗi người chỉ cần 1 bình luận) để đồng diễn Ma Quyền!
              </div>
            )}

            {miniGame.gameId === 'ma_anh_than_phap' && (
              <div className="text-[10px] text-white font-semibold mb-1.5">
                Chướng ngại vật đang tới! Mau bình luận:{' '}
                <strong className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold">
                  {miniGame.currentObstacleDirection === 'TRAI'
                    ? 'TRÁI'
                    : miniGame.currentObstacleDirection === 'PHAI'
                    ? 'PHẢI'
                    : 'NHẢY'}
                </strong>
              </div>
            )}

            {miniGame.gameId === 'tam_khi_ma_tran' && (
              <div className="text-[10px] text-white font-semibold mb-1.5">
                Giáo Chủ tung chưởng{' '}
                <strong className="text-red-300">
                  {miniGame.leaderElement === 'LUA'
                    ? 'HỎA (LỬA)'
                    : miniGame.leaderElement === 'BANG'
                    ? 'HÀN (BĂNG)'
                    : 'PHONG (GIÓ)'}
                </strong>
                ! Hãy bình luận nguyên tố khắc chế:{' '}
                <strong className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold">
                  {miniGame.expectedCounterCommand === 'LUA'
                    ? 'LỬA'
                    : miniGame.expectedCounterCommand === 'BANG'
                    ? 'BĂNG'
                    : 'GIÓ'}
                </strong>
              </div>
            )}

            {/* Team Progress Bar */}
            <div className="w-full h-2.5 bg-stone-900/80 rounded-full overflow-hidden border border-amber-400/50">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${miniGame.completionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-amber-100 font-semibold mt-1 tabular-nums">
              <span>
                Hoàn thành: <strong>{miniGame.completedUserIds.length}/{Math.max(1, miniGame.participantUserIds.length)}</strong> ({miniGame.completionPct}%)
              </span>
              <span>Yêu cầu thắng: {miniGame.winThresholdPct}%</span>
            </div>
          </div>
        )}

      {/* 6. TEMPORARY MINI-GAME RESULT BANNER (AUTO-HIDE AFTER 4S + 0.7S FADE-OUT, OPACITY 0.4) */}
      {isPanelEnabled('minigame_result') &&
        miniGame.isActive &&
        miniGame.phase === 'result' &&
        miniGameResultFade.visible && (
          <div
            data-testid="popup-minigame-result"
            className="magiao-hud-panel pointer-events-none absolute left-4 right-4 z-30 rounded-xl border border-amber-400/80 p-2.5 text-center shadow-2xl transition-opacity duration-150"
            style={{
              bottom: '22%',
              backgroundColor: `rgba(12, 8, 22, ${panelBgOpacity})`,
              opacity: miniGameResultFade.opacity,
              ...CRISP_TEXT_SHADOW,
            }}
          >
            <div
              className={`text-xs font-bold uppercase font-['Cinzel'] ${
                miniGame.isVictory ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              {miniGame.isVictory
                ? `🎉 ĐẠI THẮNG ${miniGame.title}!`
                : `🧹 CHƯA ĐẠT NGƯỠNG ${miniGame.title} (${miniGame.completionPct}%)`}
            </div>
            {!miniGame.isVictory && miniGame.sweepingPenaltyNames.length > 0 && (
              <div className="mt-1 text-[10px] text-white font-semibold">
                Phạt quét sân: <strong className="text-amber-300">{miniGame.sweepingPenaltyNames.join(', ')}</strong>
                <div className="text-[9px] text-emerald-300 mt-0.5">
                  (Chỉ cần bình luận lại 1 câu bất kỳ để quay về Đại Điện ngay!)
                </div>
              </div>
            )}
          </div>
        )}

      {/* 7. TEMPORARY PROMOTION / THRONE TRANSFER BANNER (AUTO-HIDE AFTER 4S + 0.7S FADE-OUT, OPACITY 0.4, NEVER COVERS SECT LEADER FACE) */}
      {latestPromotion &&
        promotionFade.visible &&
        ((latestPromotion.isThroneTakeover && isPanelEnabled('throne_transfer_banner')) ||
          (!latestPromotion.isThroneTakeover && isPanelEnabled('promotion_banner'))) && (
          <div
            data-testid="popup-promotion-banner"
            className={`magiao-hud-panel pointer-events-none absolute left-3 right-3 z-30 rounded-xl p-2 text-center border transition-opacity duration-150 shadow-2xl ${
              latestPromotion.isThroneTakeover
                ? 'border-yellow-300/85'
                : 'border-[#D4AF37]/80'
            }`}
            style={{
              bottom: '13.5%',
              backgroundColor: latestPromotion.isThroneTakeover
                ? `rgba(45, 10, 18, ${panelBgOpacity})`
                : `rgba(16, 10, 30, ${panelBgOpacity})`,
              opacity: promotionFade.opacity,
              ...CRISP_TEXT_SHADOW,
            }}
          >
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-amber-300">
              {latestPromotion.isThroneTakeover
                ? '🐉 ĐẠI LỄ ĐĂNG CƠ TÂN GIÁO CHỦ 🐉'
                : '✨ SẮC PHONG CẤP BẬC MA GIÁO ✨'}
            </div>
            <div className="text-[11px] font-bold text-white mt-0.5">
              <span className="text-yellow-300">{latestPromotion.displayName}</span> dâng{' '}
              <span className="text-amber-300">{latestPromotion.giftName}</span> ➔ Vinh thăng{' '}
              <span className="text-red-300 underline">{latestPromotion.newRankName}</span>!
            </div>
          </div>
        )}

      {/* 8. SWEEPING COURTYARD PENALTY LIST (RAISED BY 25PX, BACKGROUND OPACITY 0.4) */}
      {overlayConfig.showSweepingPenaltyPanel &&
        isPanelEnabled('sweeping_list') &&
        sweepingDisciples.length > 0 && (
          <div
            data-testid="panel-sweeping-list"
            className="magiao-hud-panel absolute right-1.5 z-20 w-[36%] rounded-lg border border-amber-400/70 p-1.5 shadow-lg"
            style={{
              bottom: `${sweepingPanelBottomPct}%`,
              backgroundColor: `rgba(24, 12, 8, ${panelBgOpacity})`,
              ...CRISP_TEXT_SHADOW,
            }}
          >
            <div className="text-[8.5px] font-bold text-amber-300 uppercase flex items-center justify-between">
              <span>🧹 QUÉT SÂN ({sweepingDisciples.length}/5)</span>
            </div>
            <div className="mt-0.5 space-y-0.5">
              {sweepingDisciples.map(sd => (
                <div
                  key={sd.userId}
                  className="text-[8px] text-white flex items-center justify-between px-1 py-0.5 rounded border border-amber-400/25"
                  style={{ backgroundColor: `rgba(10, 6, 14, ${panelBgOpacity})` }}
                >
                  <span className="truncate font-bold">{sd.displayName}</span>
                  <span className="text-[7.5px] text-amber-300 font-semibold shrink-0">Quét lá...</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 9. 80 DISCIPLE COMPACT 5-CHAR NAMEPLATES (BELOW FEET) & COMMENT BUBBLES (ABOVE HEAD) */}
      {disciples.map(d => {
        const namePos = solvedLabels.get(`name_${d.userId}`);
        const bubblePos = solvedLabels.get(`bubble_${d.userId}`);
        const hasActiveBubble =
          commentSettings.showCommentBubble &&
          d.lastComment &&
          d.commentBubbleExpiresAt &&
          d.commentBubbleExpiresAt > now;

        return (
          <React.Fragment key={d.userId}>
            {/* Compact 5-character nameplate synchronized with character's feet */}
            {namePos && namePos.visible && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 px-1 py-0.5 rounded bg-black/75 border text-center whitespace-nowrap"
                style={{
                  left: `${namePos.xPct}%`,
                  top: `${namePos.yPct}%`,
                  opacity: namePos.opacity,
                  borderColor: d.secondaryColor || 'rgba(212, 175, 55, 0.45)',
                  transform: `translate(-50%, -50%) scale(${overlayConfig.nameplateScale || 1})`,
                }}
              >
                <span className="text-[8px] font-bold text-amber-100 tracking-tight block leading-none">
                  {d.compactName}
                </span>
              </div>
            )}

            {/* Comment bubble above head */}
            {hasActiveBubble && bubblePos && bubblePos.visible && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-25 max-w-[125px] px-2 py-0.5 rounded-lg shadow-md border text-center"
                style={{
                  left: `${bubblePos.xPct}%`,
                  top: `${bubblePos.yPct}%`,
                  backgroundColor: commentSettings.bubbleBgColor || 'rgba(14, 10, 20, 0.92)',
                  borderColor: commentSettings.bubbleBorderColor || '#D4AF37',
                  color: commentSettings.bubbleTextColor || '#FDE68A',
                  transform: `translate(-50%, -50%) scale(${overlayConfig.bubbleScale || 1})`,
                }}
              >
                <div className="text-[8.5px] font-semibold leading-tight break-words">
                  {d.lastComment}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* 9B. ĐẠI SỰ KIỆN DIỆT MÔN (1.000 XU) CENTRAL AVATAR, ROTATING MA ẤN & PHASE BANNER */}
      {dietMon?.isActive && (
        <div
          data-testid="overlay-diet-mon"
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center"
        >
          {/* Top Phase Indicator Pill */}
          <div
            className="absolute top-[15.5%] left-3 right-3 px-3 py-1.5 rounded-xl border border-red-500/85 text-center shadow-2xl"
            style={{
              backgroundColor: 'rgba(28, 4, 16, 0.78)',
              ...CRISP_TEXT_SHADOW,
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 font-['Cinzel']">
              ⚡ MA GIÁO ĐẠI KIẾP • DIỆT MÔN ({Math.max(0, Math.ceil((1 - dietMon.progress) * (config.dietMonConfig?.durationSec || 15)))}s) ⚡
            </div>
            <div className="text-[11.5px] font-extrabold text-amber-300 mt-0.5">
              {dietMon.triggerDisplayName} ĐÃ KÍCH HOẠT DIỆT MÔN!
            </div>
            <div className="text-[8.5px] text-purple-200 font-semibold mt-0.5">
              {dietMon.phase === 'tremor' && 'Giai đoạn 1/5: Đại Điện Rung Chuyển Dữ Dội (0–3s)'}
              {dietMon.phase === 'collapse' && 'Giai đoạn 2/5: Trụ Rồng Nứt Vỡ • Đại Điện Đổ Sập (3–6s)'}
              {dietMon.phase === 'avatar_descend' && 'Giai đoạn 3/5: Chân Dung Bá Chủ Diệt Môn Giáng Thế (6–9s)'}
              {dietMon.phase === 'vortex_suck' && `Giai đoạn 4/5: Hố Đen Ma Pháp Cuốn Phăng Toàn Bộ Nhân Vật (9–12s)`}
              {dietMon.phase === 'rebuild' && 'Giai đoạn 5/5: Tái Thiết Đại Điện Ma Giáo Từ Tro Tàn (12–15s)'}
            </div>
          </div>

          {/* Giant Central TikTok Avatar + Rotating Ma Ấn Frame (Visible in Phase 3 & Phase 4) */}
          {config.dietMonConfig?.showBigAvatar !== false &&
            (dietMon.phase === 'avatar_descend' || dietMon.phase === 'vortex_suck') && (
              <div
                data-testid="diet-mon-central-avatar"
                className="relative flex flex-col items-center justify-center transition-transform duration-300"
                style={{
                  transform: `scale(${
                    dietMon.phase === 'avatar_descend'
                      ? (0.55 + dietMon.phaseProgress * 0.45) * (config.dietMonConfig?.avatarScale || 1)
                      : (1.0 - dietMon.phaseProgress * 0.15) * (config.dietMonConfig?.avatarScale || 1)
                  })`,
                  ...CRISP_TEXT_SHADOW,
                }}
              >
                {/* Outer Rotating Crimson-Purple Ma Ấn SVG Seal */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-0 w-full h-full animate-spin"
                    style={{ animationDuration: '6s' }}
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="94"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="3"
                      strokeDasharray="14 8"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="84"
                      fill="rgba(88, 28, 135, 0.35)"
                      stroke="#EC4899"
                      strokeWidth="2.5"
                    />
                    <polygon
                      points="100,10 124,66 184,74 138,114 150,174 100,142 50,174 62,114 16,74 76,66"
                      fill="rgba(220, 38, 38, 0.25)"
                      stroke="#FACC15"
                      strokeWidth="2"
                    />
                  </svg>

                  {/* Circular Player TikTok Avatar or Fallback Ma Giáo Sacred Emblem */}
                  <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_30px_rgba(236,72,153,0.95)] bg-[#160724] flex items-center justify-center">
                    {dietMon.triggerAvatarUrl && !avatarLoadError ? (
                      <img
                        src={dietMon.triggerAvatarUrl}
                        alt={dietMon.triggerDisplayName}
                        onError={() => setAvatarLoadError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-20 h-20">
                        <circle cx="50" cy="50" r="44" fill="#2A081C" stroke="#D4AF37" strokeWidth="3" />
                        <path
                          d="M50 16 C65 34, 78 46, 50 82 C22 46, 35 34, 50 16 Z"
                          fill="#DC2626"
                          stroke="#FACC15"
                          strokeWidth="2"
                        />
                        <circle cx="50" cy="52" r="12" fill="#FDE047" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Trigger Player Display Name & Title Badge */}
                <div className="mt-2 px-4 py-1 rounded-full bg-gradient-to-r from-red-950/90 via-purple-950/95 to-red-950/90 border-2 border-amber-400 text-center shadow-2xl">
                  <div className="text-xs font-extrabold text-yellow-300 tracking-wide">
                    {dietMon.triggerDisplayName}
                  </div>
                  <div className="text-[9px] font-bold text-red-300 uppercase tracking-widest">
                    BÁ CHỦ DIỆT MÔN • {dietMon.triggerCoins} XU
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* 10. BOTTOM COMMAND GUIDE BAR */}
      <div className="absolute bottom-1 left-2 right-2 z-20 flex items-center justify-between px-2.5 py-1 rounded bg-black/80 border border-amber-500/35 text-[8.5px] text-amber-200/90">
        <span className="truncate">
          💬 Gõ: <strong className="text-amber-400">đi, chạy, võ, múa, đấm, đá, nhảy, thiền, đứng, chào</strong>
        </span>
        <span className="text-red-400 font-bold shrink-0 ml-1">LIVE 9:16</span>
      </div>
    </div>
  );
};
