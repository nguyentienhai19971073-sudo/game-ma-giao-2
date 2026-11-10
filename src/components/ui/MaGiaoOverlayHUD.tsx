import React, { useMemo } from 'react';
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
  } = snapshot;

  const { overlayConfig, commentSettings, noticePanels } = config;
  const now = Date.now();

  const isPanelEnabled = (id: NoticePanelId): boolean => {
    const found = noticePanels.find(p => p.id === id);
    return found ? found.enabled : true;
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
    const recent = promotions.find(p => now - p.timestamp < 7500);
    return recent || null;
  }, [promotions, now]);

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

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ transform: `scale(${overlayConfig.hudScale || 1})`, transformOrigin: 'top center' }}
    >
      {/* Scoped Custom CSS from Tab 16 */}
      {overlayConfig.customCss && <style>{overlayConfig.customCss}</style>}

      {/* 1. TOP HEADER BAR: SECT TITLE, SCENE STATUS & MINI-GAME COUNTDOWN */}
      {overlayConfig.showHeaderBanner && (
        <div className="magiao-hud-panel absolute top-1.5 left-2 right-2 z-20 flex items-center justify-between px-2.5 py-1 rounded-lg bg-black/80 border border-amber-500/45 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="truncate">
              <div className="text-[10.5px] font-bold tracking-wider text-amber-400 uppercase font-['Cinzel']">
                MA GIÁO ONLINE • THIÊN HẠ ĐỆ NHẤT TÀ PHÁI
              </div>
              <div className="text-[8.5px] text-amber-100/85 flex items-center gap-1.5 tabular-nums">
                <span>
                  Cảnh: <strong className="text-red-400">{activeScene === 'main_hall' ? 'ĐẠI ĐIỆN' : 'SÂN LUYỆN VÕ'}</strong>
                </span>
                <span>•</span>
                <span>
                  Quân số: <strong className="text-amber-300">{disciples.length}/{config.sceneConfig.maxConcurrentPlayers}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-300">
                  Đi:{behaviorStats.moving} Võ:{behaviorStats.kungfu} Thiền:{behaviorStats.meditating}
                </span>
                {waitingQueue.length > 0 && (
                  <span className="text-purple-300">(Chờ: {waitingQueue.length})</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 tabular-nums">
            <div className="text-[8px] uppercase text-amber-200/70">Kỳ Sát Hạch</div>
            <div className="text-[10.5px] font-bold text-amber-400 font-mono">
              {miniGame.isActive ? `ĐANG THI (${miniGame.remainingSec}s)` : `${nextSceneCountdownSec}s`}
            </div>
          </div>
        </div>
      )}

      {/* 2. SECT LEADER NAMEPLATE & REAL-TIME SPEECH SCROLL */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-[46%]"
        style={{ top: '8.5%' }}
      >
        <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-950/90 via-black/95 to-red-950/90 border border-amber-400/70 shadow-md">
          <span className="text-[9.5px] font-bold text-amber-300 tracking-wide">
            👑 {sectLeader.currentLeaderName}
          </span>
        </div>
        {sectLeader.hasCustomPlayerLeader && (
          <div className="mt-0.5 px-2 py-0.2 rounded bg-purple-950/85 border border-purple-400/50 text-[7.5px] text-purple-200">
            Thái Thượng: {sectLeader.formerLeaderName}
          </div>
        )}
      </div>

      {overlayConfig.showSectLeaderSpeechBubble &&
        isPanelEnabled('sect_leader_speech') &&
        sectLeader.currentSpeechText && (
          <div
            className="magiao-hud-panel absolute left-1/2 -translate-x-1/2 z-30 w-[56%] px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-stone-950/92 to-red-950/88 border border-amber-400/65 shadow-xl"
            style={{ top: '22.5%' }}
          >
            <div className="flex items-center justify-between text-[8px] text-amber-400 font-semibold mb-0.5">
              <span>📜 THÁNH CHỈ GIÁO CHỦ</span>
              <span className="uppercase text-[7.5px] text-red-300">
                {sectLeader.currentAnimation}
              </span>
            </div>
            <p className="text-[9.5px] leading-snug text-amber-50 font-medium line-clamp-2">
              “{sectLeader.currentSpeechText}”
            </p>
          </div>
        )}

      {/* 3. UPPER-LEFT PANEL: BẢNG 4 ĐẠI TRƯỞNG LÃO (COMPACT SO HALL FLOOR IS 100% OPEN) */}
      {overlayConfig.showElderLeaderboard && isPanelEnabled('elder_leaderboard') && (
        <div
          className="magiao-hud-panel absolute left-1.5 z-20 w-[26.5%] rounded-lg bg-black/68 border border-amber-500/35 p-1.5 backdrop-blur-xs"
          style={{ top: '8.2%' }}
        >
          <div className="text-[8px] font-bold uppercase tracking-wider text-amber-400 border-b border-amber-500/20 pb-0.5 mb-1 flex items-center justify-between">
            <span>🏆 TRƯỞNG LÃO</span>
            <span className="text-[7px] text-amber-200/70">TOP 4</span>
          </div>
          {elderLeaderboard.length === 0 ? (
            <div className="text-[7.5px] text-stone-400 italic py-0.5 leading-tight">
              Chưa có cao thủ dâng lễ vật.
            </div>
          ) : (
            <div className="space-y-0.5">
              {elderLeaderboard.map((elder, idx) => (
                <div
                  key={elder.userId}
                  className="flex items-center justify-between text-[8px] bg-stone-900/75 px-1 py-0.5 rounded border border-amber-500/15"
                >
                  <div className="truncate pr-1">
                    <span className="text-amber-400 font-bold mr-0.5">#{idx + 1}</span>
                    <span className="text-stone-100 font-semibold">{elder.compactName}</span>
                  </div>
                  <span className="text-amber-300 font-mono font-bold shrink-0 tabular-nums text-[7.5px]">
                    {elder.totalCoins}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. UPPER-RIGHT PANEL: BẢNG PHONG CẤP & QUÀ TIKTOK (COMPACT TOP-RIGHT PLAQUE) */}
      {overlayConfig.showGiftRankTable && isPanelEnabled('gift_rank_table') && (
        <div
          className="magiao-hud-panel absolute right-1.5 z-20 w-[27.5%] rounded-lg bg-black/68 border border-amber-500/35 p-1.5 backdrop-blur-xs"
          style={{ top: '8.2%' }}
        >
          <div className="text-[8px] font-bold uppercase tracking-wider text-amber-400 border-b border-amber-500/20 pb-0.5 mb-0.5">
            🎁 PHONG CẤP
          </div>
          <div className="space-y-0.2 text-[7.5px] leading-tight tabular-nums">
            <div className="flex justify-between text-stone-200">
              <span>🌹 1x</span>
              <span className="text-emerald-300">Ngoại Môn</span>
            </div>
            <div className="flex justify-between text-stone-200">
              <span>🍵 5x</span>
              <span className="text-sky-300">Nội Môn</span>
            </div>
            <div className="flex justify-between text-stone-200">
              <span>🍶 10x</span>
              <span className="text-indigo-300">Sư Huynh</span>
            </div>
            <div className="flex justify-between text-stone-200">
              <span>⚔️ 20x</span>
              <span className="text-purple-300">Tinh Anh</span>
            </div>
            <div className="flex justify-between text-stone-200">
              <span>🛡️ 50x</span>
              <span className="text-fuchsia-300">Hộ Pháp</span>
            </div>
            <div className="flex justify-between text-stone-200">
              <span>📜 99x</span>
              <span className="text-rose-300">Trưởng Lão</span>
            </div>
            <div className="flex justify-between text-amber-200 font-semibold">
              <span>👑 199x</span>
              <span className="text-amber-400">Đồng Tôn</span>
            </div>
            <div className="flex justify-between text-red-300 font-bold pt-0.5 border-t border-amber-500/20">
              <span>🐉 Chí Tôn</span>
              <span className="text-yellow-300">GIÁO CHỦ</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. ACTIVE MINI-GAME HUD PANEL */}
      {overlayConfig.showMiniGameHUD &&
        isPanelEnabled('minigame_hud') &&
        miniGame.isActive &&
        miniGame.phase === 'playing' && (
          <div
            className="magiao-hud-panel absolute left-3 right-3 z-30 rounded-xl bg-gradient-to-r from-red-950/95 via-stone-950/95 to-purple-950/95 border-2 border-amber-400 p-2.5 shadow-2xl"
            style={{ top: '28%' }}
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
              <div className="text-[10px] text-amber-100 mb-1.5">
                Bình luận từ khóa <strong className="text-yellow-300 underline">MÚA</strong> (mỗi người chỉ cần 1 bình luận) để đồng diễn Ma Quyền!
              </div>
            )}

            {miniGame.gameId === 'ma_anh_than_phap' && (
              <div className="text-[10px] text-amber-100 mb-1.5">
                Chướng ngại vật đang tới! Mau bình luận:{' '}
                <strong className="px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold">
                  {miniGame.currentObstacleDirection === 'TRAI'
                    ? 'TRÁI'
                    : miniGame.currentObstacleDirection === 'PHAI'
                    ? 'PHẢI'
                    : 'NHẢY'}
                </strong>
              </div>
            )}

            {miniGame.gameId === 'tam_khi_ma_tran' && (
              <div className="text-[10px] text-amber-100 mb-1.5">
                Giáo Chủ tung chưởng{' '}
                <strong className="text-red-400">
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
            <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden border border-amber-500/40">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${miniGame.completionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-amber-200/90 mt-1 tabular-nums">
              <span>
                Hoàn thành: <strong>{miniGame.completedUserIds.length}/{Math.max(1, miniGame.participantUserIds.length)}</strong> ({miniGame.completionPct}%)
              </span>
              <span>Yêu cầu thắng: {miniGame.winThresholdPct}%</span>
            </div>
          </div>
        )}

      {/* 6. MINI-GAME RESULT BANNER */}
      {isPanelEnabled('minigame_result') &&
        miniGame.isActive &&
        miniGame.phase === 'result' && (
          <div
            className="magiao-hud-panel absolute left-4 right-4 z-30 rounded-xl bg-black/95 border-2 border-amber-400 p-3 text-center shadow-2xl"
            style={{ top: '42%' }}
          >
            <div
              className={`text-sm font-bold uppercase font-['Cinzel'] ${
                miniGame.isVictory ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {miniGame.isVictory
                ? `🎉 ĐẠI THẮNG ${miniGame.title}!`
                : `🧹 CHƯA ĐẠT NGƯỠNG ${miniGame.title} (${miniGame.completionPct}%)`}
            </div>
            {!miniGame.isVictory && miniGame.sweepingPenaltyNames.length > 0 && (
              <div className="mt-1 text-[10px] text-amber-200">
                Phạt quét sân: <strong>{miniGame.sweepingPenaltyNames.join(', ')}</strong>
                <div className="text-[9px] text-emerald-300 mt-0.5">
                  (Chỉ cần bình luận lại 1 câu bất kỳ để quay về Đại Điện ngay!)
                </div>
              </div>
            )}
          </div>
        )}

      {/* 7. PROMOTION / THRONE TRANSFER BANNER */}
      {latestPromotion &&
        ((latestPromotion.isThroneTakeover && isPanelEnabled('throne_transfer_banner')) ||
          (!latestPromotion.isThroneTakeover && isPanelEnabled('promotion_banner'))) && (
          <div
            className={`magiao-hud-panel absolute left-3 right-3 z-30 rounded-xl p-2 text-center border-2 shadow-2xl ${
              latestPromotion.isThroneTakeover
                ? 'bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-yellow-300'
                : 'bg-gradient-to-r from-stone-950 via-purple-950 to-stone-950 border-amber-400'
            }`}
            style={{ top: '24%' }}
          >
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-amber-300">
              {latestPromotion.isThroneTakeover
                ? '🐉 ĐẠI LỄ ĐĂNG CƠ TÂN GIÁO CHỦ 🐉'
                : '✨ SẮC PHONG CẤP BẬC MA GIÁO ✨'}
            </div>
            <div className="text-[11px] font-bold text-white mt-0.5">
              <span className="text-yellow-300">{latestPromotion.displayName}</span> dâng{' '}
              <span className="text-amber-300">{latestPromotion.giftName}</span> ➔ Vinh thăng{' '}
              <span className="text-red-400 underline">{latestPromotion.newRankName}</span>!
            </div>
          </div>
        )}

      {/* 8. SWEEPING COURTYARD PENALTY LIST (MAX 5 PLAYERS) */}
      {overlayConfig.showSweepingPenaltyPanel &&
        isPanelEnabled('sweeping_list') &&
        sweepingDisciples.length > 0 && (
          <div
            className="magiao-hud-panel absolute left-2 z-20 w-[38%] rounded-lg bg-amber-950/90 border border-amber-400/60 p-1.5 shadow-lg"
            style={{ bottom: '6.5%' }}
          >
            <div className="text-[8.5px] font-bold text-amber-300 uppercase flex items-center justify-between">
              <span>🧹 QUÉT SÂN ({sweepingDisciples.length}/5)</span>
            </div>
            <div className="mt-0.5 space-y-0.5">
              {sweepingDisciples.map(sd => (
                <div
                  key={sd.userId}
                  className="text-[8px] text-amber-100 flex items-center justify-between bg-black/40 px-1 py-0.5 rounded"
                >
                  <span className="truncate font-semibold">{sd.displayName}</span>
                  <span className="text-[7.5px] text-amber-300 shrink-0">Quét lá...</span>
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
