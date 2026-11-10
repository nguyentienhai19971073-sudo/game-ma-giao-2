import React, { useEffect, useRef } from 'react';
import {
  ActiveSceneType,
  DietMonRuntimeState,
  SectDisciple,
  SectLeaderRuntimeState,
  MiniGameActiveState,
  SceneConfig,
  OverlayConfig,
} from '../../types/magiao';

interface MaGiao2DCanvasProps {
  activeScene: ActiveSceneType;
  sectLeader: SectLeaderRuntimeState;
  disciples: SectDisciple[];
  miniGame: MiniGameActiveState;
  sceneConfig: SceneConfig;
  overlayConfig: OverlayConfig;
  dietMon?: DietMonRuntimeState;
  thronePosition?: { x: number; y: number };
  minSeparationDist?: number;
  onSelectDisciple?: (disciple: SectDisciple) => void;
  selectedDiscipleId?: string | null;
}

interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: 'ember' | 'mist' | 'leaf';
}

export const MaGiao2DCanvas: React.FC<MaGiao2DCanvasProps> = ({
  activeScene,
  sectLeader,
  disciples,
  miniGame,
  sceneConfig,
  overlayConfig,
  dietMon,
  thronePosition,
  minSeparationDist = 5.2,
  onSelectDisciple,
  selectedDiscipleId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    activeScene,
    sectLeader,
    disciples,
    miniGame,
    sceneConfig,
    overlayConfig,
    dietMon,
    thronePosition,
    minSeparationDist,
    selectedDiscipleId,
  });

  useEffect(() => {
    stateRef.current = {
      activeScene,
      sectLeader,
      disciples,
      miniGame,
      sceneConfig,
      overlayConfig,
      dietMon,
      thronePosition,
      minSeparationDist,
      selectedDiscipleId,
    };
  }, [
    activeScene,
    sectLeader,
    disciples,
    miniGame,
    sceneConfig,
    overlayConfig,
    dietMon,
    thronePosition,
    minSeparationDist,
    selectedDiscipleId,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = 0;
    const particles: FloatingParticle[] = Array.from({ length: 42 }, (_, i) => ({
      x: Math.random() * 540,
      y: Math.random() * 960,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.25 - Math.random() * 0.45,
      size: i % 5 === 0 ? 18 + Math.random() * 22 : 2 + Math.random() * 3,
      alpha: 0.18 + Math.random() * 0.45,
      color: i % 3 === 0 ? '#D4AF37' : i % 2 === 0 ? '#DC2626' : '#9333EA',
      type: i % 5 === 0 ? 'mist' : i % 7 === 0 ? 'leaf' : 'ember',
    }));

    const renderLoop = (timeMs: number) => {
      const {
        activeScene: curScene,
        sectLeader: leader,
        disciples: list,
        miniGame: mg,
        sceneConfig: sCfg,
        overlayConfig: oCfg,
        dietMon: dm,
        thronePosition: thronePosProp,
        minSeparationDist: minSep,
        selectedDiscipleId: selId,
      } = stateRef.current;

      const W = canvas.width;
      const H = canvas.height;
      const t = timeMs * 0.001;

      // Resolve Throne Position (default x: 50%, y: 22.13% = lowered by 30px from 19% on 960px canvas)
      const throneZone = sCfg.zones?.throne_zone;
      const resolvedThronePos = thronePosProp || {
        x: throneZone ? (throneZone.xMin + throneZone.xMax) * 0.5 : 50,
        y: throneZone ? throneZone.yMin + 4.03 : 22.13,
      };
      const throneDxPx = ((resolvedThronePos.x - 50) / 100) * W;
      const throneDyPx = ((resolvedThronePos.y - 19) / 100) * H; // +30px at y=22.13%

      ctx.clearRect(0, 0, W, H);
      ctx.save();

      // Controlled camera tremor during Diệt Môn Phase 1 (tremor) & Phase 2 (collapse)
      if (dm?.isActive && (dm.phase === 'tremor' || dm.phase === 'collapse')) {
        const mult = dm.phase === 'tremor' ? 0.55 + dm.phaseProgress * 0.65 : 1.0 - dm.phaseProgress * 0.35;
        const shakeX = Math.sin(t * 54) * 7.5 * mult;
        const shakeY = Math.cos(t * 48) * 5.5 * mult;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Draw Background Architecture (Đại Điện Ma Giáo or Sân Luyện Võ)
      if (curScene === 'main_hall') {
        drawMainHallEnvironment(ctx, W, H, t, sCfg, throneDxPx, throneDyPx, dm);
      } else {
        drawTrainingGroundEnvironment(ctx, W, H, t, sCfg, mg, throneDxPx, throneDyPx);
      }

      // 1B. Draw Diệt Môn Central Energy Vortex behind characters during Phases 3, 4 & 5
      if (
        dm?.isActive &&
        (dm.phase === 'avatar_descend' || dm.phase === 'vortex_suck' || dm.phase === 'rebuild')
      ) {
        drawDietMonEnergyVortex(ctx, W, H, t, dm);
      }

      // 2. Optional Debug Zone Overlay (Admin Inspection Mode)
      if (sCfg.showDebugZones) {
        drawDebugZonesOverlay(ctx, W, H, sCfg, list, minSep);
      }

      // 3. Draw Guardian NPCs (Tả / Hữu Hộ Pháp) flanking the Throne platform (synchronized with Throne offset)
      drawGuardianNPC(ctx, W * 0.31 + throneDxPx, H * 0.24 + throneDyPx, 'left', t);
      drawGuardianNPC(ctx, W * 0.69 + throneDxPx, H * 0.24 + throneDyPx, 'right', t);

      // 4. If a player has taken over the Throne, draw Thái Thượng Giáo Chủ on the elder dais
      if (leader.hasCustomPlayerLeader) {
        drawThaiThuongGiaoChu(
          ctx,
          W * 0.22 + throneDxPx,
          H * 0.22 + throneDyPx,
          t,
          leader.formerLeaderName
        );
      }

      // 5. Draw Sect Leader (Giáo Chủ Dạ Thiên Minh / Tân Giáo Chủ) with 35 animations + lip-sync
      const leaderScale = (sCfg.sectLeaderScale || 1.45) * (oCfg.sectLeaderScale || 1.0);
      drawArticulatedSectLeader(
        ctx,
        (leader.x / 100) * W,
        (leader.y / 100) * H,
        leaderScale,
        leader,
        t
      );

      // 6. Sort Disciples by Y depth so front characters naturally overlap back characters
      const sortedDisciples = [...list].sort((a, b) => a.y - b.y);
      const globalAvatarScale = (sCfg.playerBaseScale || 1.0) * (oCfg.avatarScale || 1.0);

      for (const d of sortedDisciples) {
        const px = (d.x / 100) * W;
        const py = (d.y / 100) * H;
        let vortexScale = 1.0;
        if (dm?.isActive && dm.phase === 'vortex_suck') {
          const vp = d.vortexProgress ?? dm.phaseProgress;
          vortexScale = Math.max(0.12, 1 - vp * 0.88);
        }
        const scale = d.scale * globalAvatarScale * vortexScale;
        const isSelected = selId === d.userId;
        drawArticulatedDisciple(ctx, px, py, scale, d, t, timeMs, isSelected, dm);
      }

      // 7. Draw Active Mini-Game Field Effects (Obstacle Beams or 3-Element Trigram Energy)
      if (mg.isActive && mg.phase === 'playing') {
        drawMiniGameFieldOverlay(ctx, W, H, t, mg);
      }

      // 8. Draw Atmospheric Particles (Embers, Purple Mist, Red Lantern Glow, Sweeping Leaves)
      drawAtmosphericParticles(ctx, W, H, particles, sCfg.mistIntensity, curScene);

      ctx.restore();
      animFrameId = window.requestAnimationFrame(renderLoop);
    };

    animFrameId = window.requestAnimationFrame(renderLoop);
    return () => {
      window.cancelAnimationFrame(animFrameId);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectDisciple || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    let closest: SectDisciple | null = null;
    let bestDist = 6.5; // % radius
    for (const d of disciples) {
      const dist = Math.hypot(d.x - clickX, d.y - clickY);
      if (dist < bestDist) {
        bestDist = dist;
        closest = d;
      }
    }
    if (closest) {
      onSelectDisciple(closest);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={540}
      height={960}
      onClick={handleCanvasClick}
      className="w-full h-full block select-none cursor-pointer"
    />
  );
};

// ============================================================================
// ENVIRONMENT RENDERING: ĐẠI ĐIỆN MA GIÁO (OPEN FLOOR & WIDE CENTRAL AISLE)
// ============================================================================
function drawMainHallEnvironment(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  sCfg: SceneConfig,
  throneDxPx: number,
  throneDyPx: number,
  dietMon?: DietMonRuntimeState
) {
  const isCollapsed =
    dietMon?.isActive &&
    (dietMon.phase === 'collapse' ||
      dietMon.phase === 'avatar_descend' ||
      dietMon.phase === 'vortex_suck');
  const isRebuild = dietMon?.isActive && dietMon.phase === 'rebuild';
  const collapseFactor =
    dietMon?.phase === 'collapse'
      ? dietMon.phaseProgress
      : isCollapsed
      ? 1
      : isRebuild
      ? Math.max(0, 1 - dietMon.phaseProgress)
      : 0;

  // Deep obsidian-crimson sanctuary gradient (intensifies during Diệt Môn)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, collapseFactor > 0.2 ? '#24040E' : '#07050A');
  bgGrad.addColorStop(0.26, collapseFactor > 0.2 ? '#35081B' : '#150916');
  bgGrad.addColorStop(0.62, '#130D1B');
  bgGrad.addColorStop(1, '#0A070F');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Open Grand Hall Stone Floor Tiles (from below the Throne steps down to 93%)
  const floorTopY = Math.min(H * 0.36, Math.max(H * 0.25, H * 0.28 + throneDyPx));
  const floorHeight = Math.max(H * 0.55, H * 0.93 - floorTopY);
  ctx.fillStyle = 'rgba(22, 13, 29, 0.85)';
  ctx.fillRect(W * 0.06, floorTopY, W * 0.88, floorHeight);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
  ctx.lineWidth = 1;
  for (let y = floorTopY; y < H * 0.93; y += 36) {
    ctx.beginPath();
    ctx.moveTo(W * 0.06, y);
    ctx.lineTo(W * 0.94, y);
    ctx.stroke();
  }
  for (let x = W * 0.06; x <= W * 0.94; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, floorTopY);
    ctx.lineTo(x, H * 0.93);
    ctx.stroke();
  }

  // Giant Ma Giáo Sacred Emblem behind the Throne (shifted synchronously with Throne)
  ctx.save();
  ctx.translate(W * 0.5 + throneDxPx, H * 0.13 + throneDyPx);
  ctx.rotate(Math.sin(t * 0.4) * 0.04);
  const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 95);
  auraGrad.addColorStop(0, 'rgba(220, 38, 38, 0.36)');
  auraGrad.addColorStop(0.55, 'rgba(147, 51, 234, 0.18)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 95, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.stroke();

  // Inner octagonal wuxia seal
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + t * 0.15;
    const rx = Math.cos(ang) * 48;
    const ry = Math.sin(ang) * 48;
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Elevated Imperial Steps & Throne Dais (shifted down by +30px with Throne)
  ctx.fillStyle = '#1C0D18';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.6;
  ctx.fillRect(W * 0.26 + throneDxPx, H * 0.14 + throneDyPx, W * 0.48, H * 0.14);
  ctx.strokeRect(W * 0.26 + throneDxPx, H * 0.14 + throneDyPx, W * 0.48, H * 0.14);

  // WIDE CENTRAL AISLE (LỐI ĐI CHÍNH GIỮA: x = 32%..68%)
  const aisleX = W * 0.32;
  const aisleW = W * 0.36;
  const carpetGrad = ctx.createLinearGradient(aisleX, floorTopY, aisleX + aisleW, floorTopY);
  carpetGrad.addColorStop(0, 'rgba(92, 11, 22, 0.78)');
  carpetGrad.addColorStop(0.15, 'rgba(127, 17, 30, 0.85)');
  carpetGrad.addColorStop(0.5, 'rgba(145, 20, 36, 0.88)');
  carpetGrad.addColorStop(0.85, 'rgba(127, 17, 30, 0.85)');
  carpetGrad.addColorStop(1, 'rgba(92, 11, 22, 0.78)');
  ctx.fillStyle = carpetGrad;
  ctx.fillRect(aisleX, floorTopY, aisleW, floorHeight);

  // Double Golden Dragon Borders along the Wide Central Aisle
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.62)';
  ctx.lineWidth = 2;
  ctx.strokeRect(aisleX + 2, floorTopY, aisleW - 4, floorHeight);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(aisleX + 8, floorTopY + 6, aisleW - 16, floorHeight - 12);

  // Grand Center Hall Martial Medallion Inlay (Right in the middle of the Central Aisle: x=50%, y=60%)
  ctx.save();
  ctx.translate(W * 0.5, H * 0.60);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.font = 'bold 9px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText('TRUNG TÂM ĐẠI ĐIỆN MA GIÁO', 0, W * 0.14 + 14);
  ctx.restore();

  // Subtle Left & Right Open Floor Wing Inlays
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(W * 0.08, H * 0.335, W * 0.22, H * 0.475);
  ctx.strokeRect(W * 0.70, H * 0.335, W * 0.22, H * 0.475);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.26)';
  ctx.font = 'bold 8px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText('TẢ VÕ ĐƯỜNG', W * 0.19, H * 0.355);
  ctx.fillText('HỮU VÕ ĐƯỜNG', W * 0.81, H * 0.355);
  ctx.restore();

  // Steps leading up from the Central Aisle to the Throne Platform (shifted with Throne)
  for (let s = 0; s < 4; s++) {
    const sy = H * 0.262 + throneDyPx + s * 5.5;
    ctx.fillStyle = s % 2 === 0 ? '#2E1524' : '#3E1C30';
    ctx.fillRect(W * 0.34 + throneDxPx, sy, W * 0.32, 5);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
    ctx.strokeRect(W * 0.34 + throneDxPx, sy, W * 0.32, 5);
  }

  // Grand Obsidian-Gold Dragon Throne (shifted down +30px from H * 0.19 to H * 0.19 + throneDyPx)
  drawGrandThrone(ctx, W * 0.5 + throneDxPx, H * 0.19 + throneDyPx);

  // Co-Leader Dais (Đài Đồng Tôn - 99 Xu) synchronized with co_leader_dais zone
  const coDaisZone = sCfg.zones?.co_leader_dais;
  const coDaisX = coDaisZone ? ((coDaisZone.xMin + coDaisZone.xMax) * 0.5 / 100) * W : W * 0.80 + throneDxPx;
  const coDaisY = coDaisZone ? ((coDaisZone.yMin + coDaisZone.yMax) * 0.5 / 100) * H : H * 0.23 + throneDyPx;
  drawCoLeaderDais(ctx, coDaisX, coDaisY, t);

  // Dedicated Sweeping Courtyard Pad (raised by 25px = -2.6% Y, dynamically bound to sCfg.zones.sweeping_courtyard)
  const sweepZone = sCfg.zones?.sweeping_courtyard || {
    xMin: 73,
    xMax: 94,
    yMin: 85.4,
    yMax: 92.4,
    label: 'Góc Phạt Quét Sân',
  };
  const sweepX = (sweepZone.xMin / 100) * W;
  const sweepY = (sweepZone.yMin / 100) * H;
  const sweepW = Math.max(W * 0.16, ((sweepZone.xMax - sweepZone.xMin) / 100) * W);
  const sweepH = Math.max(H * 0.065, ((sweepZone.yMax - sweepZone.yMin) / 100) * H);
  drawZoneFloorPad(ctx, sweepX, sweepY, sweepW, sweepH, 'GÓC QUÉT SÂN', '#D97706');

  // Dragon Pillars on Outer Left & Right Walls (with collapse/rebuild physics during Diệt Môn)
  if (sCfg.dragonPillars) {
    drawDragonPillar(ctx, W * 0.04, H * 0.12, H * 0.76, t, 'left', collapseFactor);
    drawDragonPillar(ctx, W * 0.96, H * 0.12, H * 0.76, t, 'right', collapseFactor);
  }

  // Draw Diệt Môn Floor/Wall Cracks, Lightning & Falling Debris
  if (dietMon?.isActive && dietMon.phase !== 'inactive') {
    drawDietMonHallDestructionEffects(ctx, W, H, t, dietMon, collapseFactor);
  }

  // Swaying Sect Banners & Red Lanterns (fall during collapse, restored in rebuild)
  if (sCfg.sectBanners && collapseFactor < 0.78) {
    const bannerSpeed = dietMon?.isActive ? t * 4 : t;
    drawSectBanner(ctx, W * 0.14, H * 0.07 + collapseFactor * 45, 'THIÊN HẠ', bannerSpeed);
    drawSectBanner(ctx, W * 0.86, H * 0.07 + collapseFactor * 45, 'ĐỆ NHẤT', bannerSpeed + 1.2);
  }

  if (sCfg.redLanterns && collapseFactor < 0.82) {
    drawRedLantern(ctx, W * 0.25, H * 0.08 + collapseFactor * 60, t);
    drawRedLantern(ctx, W * 0.75, H * 0.08 + collapseFactor * 60, t + 1.5);
  }

  // Bottom Stone Entry Gate Archway
  drawEntryGateArch(ctx, W, H);
}

// ============================================================================
// DEBUG ZONE OVERLAY (FOR ADMIN VERIFICATION OF FREE ROAM & AISLE MOVEMENT)
// ============================================================================
function drawDebugZonesOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sCfg: SceneConfig,
  disciples: SectDisciple[],
  minSeparationDist: number
) {
  ctx.save();

  const freeRoam = sCfg.freeRoamBounds || { xMin: 10, xMax: 90, yMin: 31, yMax: 90 };
  const throne = sCfg.throneReservedZone || { xMin: 28, xMax: 72, yMin: 10, yMax: 29.5 };

  // 1. FreeRoamArea (Emerald Green)
  const fx = (freeRoam.xMin / 100) * W;
  const fy = (freeRoam.yMin / 100) * H;
  const fw = ((freeRoam.xMax - freeRoam.xMin) / 100) * W;
  const fh = ((freeRoam.yMax - freeRoam.yMin) / 100) * H;

  ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(fx, fy, fw, fh);

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    `FREE ROAM AREA (x:${freeRoam.xMin}-${freeRoam.xMax}%, y:${freeRoam.yMin}-${freeRoam.yMax}%)`,
    fx + 6,
    fy + 13
  );

  // 2. Central Aisle Highlight (Gold)
  const cx = W * 0.32;
  const cw = W * 0.36;
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx, fy, cw, fh);
  ctx.fillStyle = '#FACC15';
  ctx.textAlign = 'center';
  ctx.fillText('LỐI ĐI CHÍNH GIỮA (ACTIVE)', cx + cw / 2, fy + 25);

  // 3. Throne Reserved Zone (Crimson Red)
  const tx = (throne.xMin / 100) * W;
  const ty = (throne.yMin / 100) * H;
  const tw = ((throne.xMax - throne.xMin) / 100) * W;
  const th = ((throne.yMax - throne.yMin) / 100) * H;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
  ctx.fillRect(tx, ty, tw, th);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
  ctx.strokeRect(tx, ty, tw, th);
  ctx.fillStyle = '#F87171';
  ctx.fillText('NGAI GIÁO CHỦ (PROTECTED)', tx + tw / 2, ty + 14);

  ctx.setLineDash([]);

  // 4. Per-Disciple Target Vectors & Separation Radius
  const sepRadiusPx = (minSeparationDist / 100) * W * 0.5;
  for (const d of disciples) {
    const px = (d.x / 100) * W;
    const py = (d.y / 100) * H;
    const tpx = (d.targetX / 100) * W;
    const tpy = (d.targetY / 100) * H;

    // Separation circle
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, sepRadiusPx, 0, Math.PI * 2);
    ctx.stroke();

    // Movement vector line if moving
    if (Math.hypot(tpx - px, tpy - py) > 4) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tpx, tpy);
      ctx.stroke();

      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(tpx, tpy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawTrainingGroundEnvironment(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  sCfg: SceneConfig,
  mg: MiniGameActiveState,
  throneDxPx: number,
  throneDyPx: number
) {
  // Twilight martial peak sky + stone arena
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(0.25, '#1E142B');
  bgGrad.addColorStop(0.32, '#1A1822');
  bgGrad.addColorStop(1, '#100E14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Distant Mountain Peaks
  ctx.fillStyle = '#120C1C';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.26);
  ctx.lineTo(W * 0.18, H * 0.12);
  ctx.lineTo(W * 0.35, H * 0.22);
  ctx.lineTo(W * 0.52, H * 0.09);
  ctx.lineTo(W * 0.72, H * 0.21);
  ctx.lineTo(W * 0.88, H * 0.13);
  ctx.lineTo(W, H * 0.25);
  ctx.lineTo(W, H * 0.30);
  ctx.lineTo(0, H * 0.30);
  ctx.closePath();
  ctx.fill();

  // Giant Martial Arts Taiji / Bagua Arena Circle in the center of the courtyard
  ctx.save();
  ctx.translate(W * 0.5, H * 0.60);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(220, 38, 38, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  // If Game 3 (Tam Khí Ma Trận) is active, highlight the 3 Elemental Sectors (LỬA, BĂNG, GIÓ)
  if (mg.gameId === 'tam_khi_ma_tran') {
    const sectors: { label: string; color: string; angle: number }[] = [
      { label: 'HỎA (LỬA)', color: 'rgba(239, 68, 68, 0.25)', angle: -Math.PI / 2 },
      { label: 'BĂNG HÀN', color: 'rgba(56, 189, 248, 0.25)', angle: Math.PI / 6 },
      { label: 'CUỒNG PHONG (GIÓ)', color: 'rgba(52, 211, 153, 0.25)', angle: (5 * Math.PI) / 6 },
    ];
    sectors.forEach(sec => {
      const sx = Math.cos(sec.angle) * (W * 0.22);
      const sy = Math.sin(sec.angle) * (W * 0.22);
      ctx.fillStyle = sec.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
    });
  }
  ctx.restore();

  // Command Platform for Sect Leader at top of Training Ground (shifted down +30px with Throne)
  ctx.fillStyle = '#1E1122';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.fillRect(W * 0.24 + throneDxPx, H * 0.14 + throneDyPx, W * 0.52, H * 0.12);
  ctx.strokeRect(W * 0.24 + throneDxPx, H * 0.14 + throneDyPx, W * 0.52, H * 0.12);
  drawGrandThrone(ctx, W * 0.5 + throneDxPx, H * 0.19 + throneDyPx);
  const coDaisZone = sCfg.zones?.co_leader_dais;
  const coDaisX = coDaisZone ? ((coDaisZone.xMin + coDaisZone.xMax) * 0.5 / 100) * W : W * 0.80 + throneDxPx;
  const coDaisY = coDaisZone ? ((coDaisZone.yMin + coDaisZone.yMax) * 0.5 / 100) * H : H * 0.23 + throneDyPx;
  drawCoLeaderDais(ctx, coDaisX, coDaisY, t);

  // Sweeping Courtyard Penalty Corner (raised by 25px = -2.6% Y, synchronized with sCfg.zones.sweeping_courtyard)
  const sweepZone = sCfg.zones?.sweeping_courtyard || {
    xMin: 73,
    xMax: 94,
    yMin: 85.4,
    yMax: 92.4,
    label: 'Góc Phạt Quét Sân',
  };
  const sweepX = (sweepZone.xMin / 100) * W;
  const sweepY = (sweepZone.yMin / 100) * H;
  const sweepW = Math.max(W * 0.16, ((sweepZone.xMax - sweepZone.xMin) / 100) * W);
  const sweepH = Math.max(H * 0.065, ((sweepZone.yMax - sweepZone.yMin) / 100) * H);
  drawZoneFloorPad(ctx, sweepX, sweepY, sweepW, sweepH, 'SÂN PHẠT QUÉT LÁ', '#D97706');
}

function drawGrandThrone(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Backrest of the Dragon Throne
  ctx.fillStyle = '#2A0810';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-46, 12);
  ctx.lineTo(-52, -36);
  ctx.lineTo(-24, -52);
  ctx.lineTo(0, -60);
  ctx.lineTo(24, -52);
  ctx.lineTo(52, -36);
  ctx.lineTo(46, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Throne armrests
  ctx.fillStyle = '#450A14';
  ctx.fillRect(-54, -4, 16, 22);
  ctx.fillRect(38, -4, 16, 22);
  ctx.strokeRect(-54, -4, 16, 22);
  ctx.strokeRect(38, -4, 16, 22);

  // Throne seat cushion
  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(-40, 6, 80, 14);
  ctx.strokeRect(-40, 6, 80, 14);

  ctx.restore();
}

function drawCoLeaderDais(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  ctx.save();
  ctx.translate(cx, cy);

  const glow = 0.25 + Math.sin(t * 2.5) * 0.08;
  ctx.fillStyle = `rgba(147, 51, 234, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(0, 8, 34, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#241038';
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-28, -16, 56, 26);
  ctx.strokeRect(-28, -16, 56, 26);

  ctx.fillStyle = '#E9D5FF';
  ctx.font = 'bold 7.5px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ĐÀI ĐỒNG TÔN (99 X)', 0, 20);
  ctx.restore();
}

function drawThaiThuongGiaoChu(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  label: string
) {
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t * 2) * 1.5);

  // Elder Golden Aura
  ctx.fillStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.beginPath();
  ctx.arc(0, -12, 26, 0, Math.PI * 2);
  ctx.fill();

  // Robe
  ctx.fillStyle = '#3B0764';
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-14, 14);
  ctx.lineTo(-10, -16);
  ctx.lineTo(10, -16);
  ctx.lineTo(14, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head & White Beard
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(0, -24, 9, 0, Math.PI * 2);
  ctx.fill();

  // Crown
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-6, -37, 12, 5);

  // White sage beard
  ctx.fillStyle = '#F3F4F6';
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(0, -8);
  ctx.lineTo(4, -18);
  ctx.fill();

  ctx.fillStyle = '#FDE047';
  ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label.slice(0, 22), 0, 26);
  ctx.restore();
}

function drawZoneFloorPad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  borderColor: string
) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 10, 24, 0.65)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + w / 2, y + 12);
  ctx.restore();
}

function drawDragonPillar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  height: number,
  t: number,
  side: 'left' | 'right' = 'left',
  collapseFactor: number = 0
) {
  ctx.save();
  const baseBottomY = topY + height;
  ctx.translate(cx, baseBottomY);
  const tiltSign = side === 'left' ? 1 : -1;
  ctx.rotate(tiltSign * collapseFactor * 0.28);

  const grad = ctx.createLinearGradient(-12, -height, 12, -height);
  grad.addColorStop(0, '#3B0810');
  grad.addColorStop(0.5, '#7F1D1D');
  grad.addColorStop(1, '#28050A');
  ctx.fillStyle = grad;
  ctx.fillRect(-10, -height, 20, height);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-10, -height, 20, height);

  // Coiling golden dragon motif along the pillar
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let py = -height + 10; py < -10; py += 8) {
    const px = Math.sin(py * 0.06 + t) * 7;
    if (py === -height + 10) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Fracture lines across pillar during Diệt Môn collapse
  if (collapseFactor > 0.05) {
    ctx.strokeStyle = `rgba(244, 63, 94, ${Math.min(1, collapseFactor * 1.2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -height * 0.65);
    ctx.lineTo(4, -height * 0.61);
    ctx.lineTo(10, -height * 0.67);
    ctx.moveTo(-10, -height * 0.35);
    ctx.lineTo(-2, -height * 0.31);
    ctx.lineTo(10, -height * 0.37);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDietMonHallDestructionEffects(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  dietMon: DietMonRuntimeState,
  collapseFactor: number
) {
  ctx.save();
  const phase = dietMon.phase;
  const crackAlpha =
    phase === 'tremor'
      ? Math.min(1, 0.35 + dietMon.phaseProgress * 0.65)
      : phase === 'rebuild'
      ? Math.max(0, 1 - dietMon.phaseProgress)
      : 0.92;

  // 1. Glowing Crimson-Purple Fissure Cracks across Hall Floor & Upper Walls
  if (crackAlpha > 0.05) {
    ctx.strokeStyle = `rgba(236, 72, 153, ${crackAlpha})`;
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.2;

    const fissures = [
      [
        [W * 0.5, H * 0.52],
        [W * 0.38, H * 0.44],
        [W * 0.24, H * 0.38],
        [W * 0.14, H * 0.29],
      ],
      [
        [W * 0.5, H * 0.52],
        [W * 0.63, H * 0.43],
        [W * 0.77, H * 0.39],
        [W * 0.88, H * 0.31],
      ],
      [
        [W * 0.5, H * 0.52],
        [W * 0.42, H * 0.67],
        [W * 0.29, H * 0.79],
        [W * 0.18, H * 0.91],
      ],
      [
        [W * 0.5, H * 0.52],
        [W * 0.59, H * 0.66],
        [W * 0.72, H * 0.78],
        [W * 0.84, H * 0.9],
      ],
    ];

    for (const chain of fissures) {
      ctx.beginPath();
      chain.forEach(([x, y], idx) => {
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 2. Red-Purple Apocalyptic Lightning Arcs during Phase 1 (tremor) & Phase 2 (collapse)
  if ((phase === 'tremor' || phase === 'collapse') && Math.sin(t * 28) > -0.2) {
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.9)';
    ctx.lineWidth = 2;
    for (let b = 0; b < 2; b++) {
      const startX = W * (0.25 + b * 0.5 + Math.sin(t * 9 + b) * 0.12);
      ctx.beginPath();
      ctx.moveTo(startX, H * 0.05);
      ctx.lineTo(startX - 18, H * 0.18);
      ctx.lineTo(startX + 14, H * 0.31);
      ctx.lineTo(startX - 10, H * 0.48);
      ctx.stroke();
    }
  }

  // 3. Falling / Rising Mystical Roof & Wall Energy Shards (Phase 2 collapse vs Phase 5 rebuild)
  if (collapseFactor > 0.05 || phase === 'rebuild') {
    for (let i = 0; i < 14; i++) {
      const seed = i * 37.3;
      const sx = ((seed * 13) % (W * 0.84)) + W * 0.08;
      const baseFall =
        phase === 'rebuild'
          ? (1 - dietMon.phaseProgress) * H * 0.75
          : ((t * 140 + seed * 9) % (H * 0.75)) + H * 0.12;
      ctx.save();
      ctx.translate(sx, baseFall);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(147, 51, 234, 0.75)' : 'rgba(220, 38, 38, 0.75)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.fillRect(-6, -4, 12, 8);
      ctx.strokeRect(-6, -4, 12, 8);
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawDietMonEnergyVortex(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  dietMon: DietMonRuntimeState
) {
  ctx.save();
  const cx = W * 0.5;
  const cy = H * 0.5;
  const scale =
    dietMon.phase === 'avatar_descend'
      ? 0.45 + dietMon.phaseProgress * 0.55
      : dietMon.phase === 'vortex_suck'
      ? 1.0 + Math.sin(t * 12) * 0.08
      : Math.max(0, 1 - dietMon.phaseProgress);

  if (scale <= 0.02) {
    ctx.restore();
    return;
  }

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const maxR = W * 0.42;
  const coreGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, maxR);
  coreGrad.addColorStop(0, 'rgba(15, 3, 28, 0.96)');
  coreGrad.addColorStop(0.35, 'rgba(147, 51, 234, 0.72)');
  coreGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.45)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, maxR, 0, Math.PI * 2);
  ctx.fill();

  // Spiraling Ma Ấn Suction Rings
  for (let ring = 1; ring <= 4; ring++) {
    ctx.save();
    ctx.rotate(t * (ring % 2 === 0 ? 3.4 : -2.8) + ring);
    ctx.strokeStyle =
      ring % 2 === 0 ? 'rgba(244, 63, 94, 0.78)' : 'rgba(212, 175, 55, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, ring * 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawSectBanner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  text: string,
  t: number
) {
  ctx.save();
  const sway = Math.sin(t * 1.8) * 4;
  ctx.translate(cx, topY);

  ctx.fillStyle = '#450A0A';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, 0);
  ctx.lineTo(14 + sway, 68);
  ctx.lineTo(sway, 80);
  ctx.lineTo(-14 + sway, 68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FDE047';
  ctx.font = 'bold 8px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, sway * 0.5, 38);
  ctx.restore();
}

function drawRedLantern(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  ctx.save();
  const swing = Math.sin(t * 2.1) * 3;
  ctx.translate(cx + swing, cy);

  const glow = ctx.createRadialGradient(0, 14, 2, 0, 14, 28);
  glow.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
  glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 14, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 14, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEntryGateArch(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  ctx.fillStyle = '#180B16';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  ctx.fillRect(W * 0.32, H * 0.94, 14, H * 0.06);
  ctx.fillRect(W * 0.68 - 14, H * 0.94, 14, H * 0.06);
  ctx.strokeRect(W * 0.32, H * 0.94, 14, H * 0.06);
  ctx.strokeRect(W * 0.68 - 14, H * 0.94, 14, H * 0.06);

  ctx.fillStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.font = 'bold 9px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText('▲ CỔNG CHÍNH ĐẠI ĐIỆN MA GIÁO ▲', W * 0.5, H * 0.985);
  ctx.restore();
}

function drawGuardianNPC(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  side: 'left' | 'right',
  t: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  const breathe = Math.sin(t * 2.5 + (side === 'left' ? 0 : 1)) * 1.2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Halberd Weapon
  const wx = side === 'left' ? -14 : 14;
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(wx, 16);
  ctx.lineTo(wx, -34 + breathe);
  ctx.stroke();

  // Halberd crescent blade
  ctx.fillStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.arc(wx + (side === 'left' ? -3 : 3), -28 + breathe, 6, 0, Math.PI);
  ctx.fill();

  // Guardian Armor Body
  ctx.fillStyle = '#31102F';
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-11, 14);
  ctx.lineTo(-9, -12 + breathe);
  ctx.lineTo(9, -12 + breathe);
  ctx.lineTo(11, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(0, -19 + breathe, 7, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  ctx.arc(0, -21 + breathe, 7.5, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = 'rgba(216, 180, 254, 0.75)';
  ctx.font = 'bold 7px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(side === 'left' ? 'TẢ HỘ PHÁP' : 'HỮU HỘ PHÁP', 0, 25);
  ctx.restore();
}

// ============================================================================
// ARTICULATED 2D SECT LEADER RENDERER (ALL 35 ANIMATIONS + LIP-SYNC)
// ============================================================================
function drawArticulatedSectLeader(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  leader: SectLeaderRuntimeState,
  t: number
) {
  ctx.save();
  const anim = leader.currentAnimation;

  let offsetY = Math.sin(t * 2.6) * 2;
  let offsetX = 0;
  if (anim === 'levitate_throne' || anim === 'summon_dark_dragon') {
    offsetY = -16 + Math.sin(t * 5) * 4;
  } else if (anim === 'shocked_jump') {
    offsetY = -Math.abs(Math.sin(t * 9)) * 14;
  } else if (anim === 'comical_rage' || anim === 'evil_laugh') {
    offsetX = Math.sin(t * 22) * 2.5;
  }

  ctx.translate(cx + offsetX, cy + offsetY);
  ctx.scale(scale, scale);

  if (anim === 'split_three_shadows') {
    ctx.save();
    ctx.globalAlpha = 0.45;
    drawSectLeaderCoreBody(ctx, -42 + Math.sin(t * 4) * 5, -4, leader, t);
    drawSectLeaderCoreBody(ctx, 42 - Math.sin(t * 4) * 5, -4, leader, t);
    ctx.restore();
  }

  if (
    anim === 'unleash_aura' ||
    anim === 'summon_dark_dragon' ||
    anim === 'cast_dark_magic' ||
    anim === 'throne_handover' ||
    anim === 'promote_disciple'
  ) {
    const pulseR = 36 + Math.sin(t * 8) * 8;
    const grad = ctx.createRadialGradient(0, -14, 4, 0, -14, pulseR);
    grad.addColorStop(0, 'rgba(220, 38, 38, 0.65)');
    grad.addColorStop(0.6, 'rgba(147, 51, 234, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -14, pulseR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (anim === 'shield_barrier') {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -14, 38, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawSectLeaderCoreBody(ctx, 0, 0, leader, t);

  if (anim === 'drink_tea' || anim === 'choke_on_tea') {
    ctx.fillStyle = '#F9FAFB';
    ctx.strokeStyle = '#D4AF37';
    ctx.fillRect(8, -16, 7, 6);
    if (anim === 'choke_on_tea') {
      ctx.fillStyle = '#93C5FD';
      ctx.beginPath();
      ctx.arc(16, -18, 2.5, 0, Math.PI * 2);
      ctx.arc(20, -14, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (anim === 'fan_self') {
    ctx.save();
    ctx.translate(14, -14);
    ctx.rotate(Math.sin(t * 10) * 0.45);
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 14, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (anim === 'read_scroll') {
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#B45309';
    ctx.fillRect(-14, -18, 28, 12);
    ctx.strokeRect(-14, -18, 28, 12);
  } else if (anim === 'raise_command_token') {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(12, -36, 8, 14);
  } else if (anim === 'punish_sweep') {
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -32);
    ctx.lineTo(26, -8);
    ctx.stroke();
  } else if (anim === 'palm_strike') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 22 + ((t * 40) % 35), 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (anim === 'sword_rain_summon') {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    for (let s = -2; s <= 2; s++) {
      const sx = s * 16;
      const sy = -40 + (((t * 60 + Math.abs(s) * 15) % 50));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 14);
      ctx.stroke();
    }
  } else if (anim === 'sleepy_yawn') {
    ctx.fillStyle = '#E9D5FF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Zzz...', 18, -32 - ((t * 10) % 10));
  }

  ctx.restore();
}

function drawSectLeaderCoreBody(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  leader: SectLeaderRuntimeState,
  t: number
) {
  ctx.save();
  ctx.translate(ox, oy);

  const capeSway = Math.sin(t * 3.2) * 4;
  ctx.fillStyle = '#450A0A';
  ctx.beginPath();
  ctx.moveTo(-16, -16);
  ctx.lineTo(16, -16);
  ctx.lineTo(24 + capeSway, 18);
  ctx.lineTo(-24 + capeSway, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-15, 16);
  ctx.lineTo(-12, -16);
  ctx.lineTo(12, -16);
  ctx.lineTo(15, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-13, -1, 26, 5);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(-4, -2, 8, 7);

  const armWave =
    leader.currentAnimation === 'wave_sleeve' ||
    leader.currentAnimation === 'unleash_aura' ||
    leader.currentAnimation === 'evil_laugh'
      ? Math.sin(t * 10) * 10
      : Math.sin(t * 2.5) * 2;

  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -12);
  ctx.lineTo(-22, -4 - armWave);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, -12);
  ctx.lineTo(22, -4 + armWave);
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(0, -25, 10.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#090D16';
  ctx.fillRect(-11, -28, 3.5, 18);
  ctx.fillRect(7.5, -28, 3.5, 18);

  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, -34);
  ctx.lineTo(-11, -44);
  ctx.lineTo(-4, -39);
  ctx.lineTo(0, -47);
  ctx.lineTo(4, -39);
  ctx.lineTo(11, -44);
  ctx.lineTo(9, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.4;
  const expr = leader.expression;
  if (expr === 'angry_comical' || expr === 'evil_grin') {
    ctx.beginPath();
    ctx.moveTo(-6, -28);
    ctx.lineTo(-2, -26);
    ctx.moveTo(6, -28);
    ctx.lineTo(2, -26);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-6, -27);
    ctx.lineTo(-2, -27);
    ctx.moveTo(2, -27);
    ctx.lineTo(6, -27);
    ctx.stroke();
  }

  ctx.fillStyle = expr === 'evil_grin' ? '#DC2626' : '#111827';
  if (expr === 'sleepy') {
    ctx.fillRect(-5, -25, 3, 1);
    ctx.fillRect(2, -25, 3, 1);
  } else {
    ctx.beginPath();
    ctx.arc(-4, -25, 1.4, 0, Math.PI * 2);
    ctx.arc(4, -25, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const mouthOpen = leader.isSpeaking ? Math.max(0.2, leader.mouthOpenness) : 0;
  ctx.fillStyle = '#991B1B';
  if (mouthOpen > 0.1) {
    ctx.beginPath();
    ctx.ellipse(0, -19.5, 3.2, 1.2 + mouthOpen * 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -20.5, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// ARTICULATED 2D DISCIPLE RENDERER (4 DIRECTIONS, REAL FOOTSTEPS, 3-PHASE JUMP,
// LOTUS MEDITATION SIT/STAND TRANSITION, DYNAMIC KUNG FU FORMS)
// ============================================================================
function drawArticulatedDisciple(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  scale: number,
  d: SectDisciple,
  t: number,
  nowMs: number,
  isSelected: boolean,
  dietMon?: DietMonRuntimeState
) {
  ctx.save();

  const phase = (d.userId.charCodeAt(0) || 1) * 0.7;
  const anim = d.animation;
  const stridePhase = d.stepPhase ?? t * 7 + phase;
  const isSideView = d.direction === 'left' || d.direction === 'right';
  const sideSign = d.direction === 'left' ? -1 : 1;

  // Compute vertical body offset, torso tilt, leg kinematics, and arm angles
  let bounceY = 0;
  let sitDropY = 0;
  let tiltAngle = 0;
  let leftFootX = isSideView ? 0 : -3.8;
  let leftFootY = 12;
  let rightFootX = isSideView ? 0 : 3.8;
  let rightFootY = 12;
  let rightArmAngle = 0;
  let leftArmAngle = 0;
  let showKickArc = false;
  let showPunchWave = false;
  let showLandingDust = false;

  if (anim === 'walk' || anim === 'run' || anim === 'depart') {
    const isRun = anim === 'run';
    const strideAmp = isRun ? 6.5 : 4.2;
    const liftAmp = isRun ? 4.2 : 2.6;
    const sSin = Math.sin(stridePhase);
    const sCos = Math.cos(stridePhase);

    bounceY = -Math.abs(sSin) * (isRun ? 3.8 : 2.2);
    tiltAngle = isSideView ? sideSign * (isRun ? 0.16 : 0.07) : sSin * 0.04;

    if (isSideView) {
      // Side profile walking: legs scissor forward/backward along X with real foot lift
      leftFootX = sSin * strideAmp * sideSign;
      leftFootY = 12 - Math.max(0, sCos) * liftAmp;
      rightFootX = -sSin * strideAmp * sideSign;
      rightFootY = 12 - Math.max(0, -sCos) * liftAmp;
    } else {
      // Front/Rear walking: alternating knee/foot lift
      leftFootX = -3.8;
      leftFootY = 12 - Math.max(0, sSin) * liftAmp * 1.15;
      rightFootX = 3.8;
      rightFootY = 12 - Math.max(0, -sSin) * liftAmp * 1.15;
    }

    rightArmAngle = sSin * (isRun ? 0.85 : 0.52);
    leftArmAngle = -rightArmAngle;
  } else if (anim === 'jump' || anim === 'celebrate') {
    // 3-Stage Jump: 0..0.22 Takeoff Crouch -> 0.22..0.78 Airborne -> 0.78..1.00 Landing
    const jumpCycle = (t * 1.45 + phase * 0.2) % 1;
    if (jumpCycle < 0.22) {
      const crouchP = jumpCycle / 0.22;
      bounceY = Math.sin(crouchP * Math.PI) * 3.5;
      rightArmAngle = 0.45;
      leftArmAngle = -0.45;
    } else if (jumpCycle < 0.78) {
      const airP = (jumpCycle - 0.22) / 0.56;
      bounceY = -Math.sin(airP * Math.PI) * 15;
      leftFootX = -6;
      leftFootY = 9;
      rightFootX = 6;
      rightFootY = 8;
      rightArmAngle = -2.2;
      leftArmAngle = 2.2;
    } else {
      const landP = (jumpCycle - 0.78) / 0.22;
      bounceY = (1 - landP) * 3.0;
      showLandingDust = landP < 0.6;
      rightArmAngle = -0.6 * (1 - landP);
      leftArmAngle = 0.6 * (1 - landP);
    }
  } else if (anim === 'meditate' || anim === 'stand_up') {
    const elapsed = Math.max(0, nowMs - (d.actionStartedAt || nowMs));
    let sitProgress = 1;
    if (anim === 'meditate' && d.meditationPhase === 'sitting_down') {
      sitProgress = Math.min(1, elapsed / 600);
    } else if (anim === 'stand_up') {
      sitProgress = Math.max(0, 1 - elapsed / 900);
    }
    sitDropY = sitProgress * 5.2;
    bounceY = sitProgress > 0.8 ? Math.sin(t * 2.5 + phase) * 0.8 : 0;
    rightArmAngle = -0.45 * sitProgress;
    leftArmAngle = 0.45 * sitProgress;
  } else if (anim === 'bow') {
    const bowWave = Math.sin(t * 4.2 + phase);
    tiltAngle = isSideView ? sideSign * 0.35 : bowWave * 0.18;
    bounceY = Math.abs(bowWave) * 2.2;
    rightArmAngle = -0.65;
    leftArmAngle = 0.65;
  } else if (anim === 'punch') {
    const punchWave = Math.sin(t * 14 + phase);
    rightArmAngle = punchWave > 0 ? -1.45 : -0.3;
    leftArmAngle = punchWave <= 0 ? 1.45 : 0.3;
    leftFootX = -5.5;
    rightFootX = 5.5;
    bounceY = -Math.abs(punchWave) * 1.8;
    showPunchWave = Math.abs(punchWave) > 0.75;
  } else if (anim === 'kick') {
    const kickWave = Math.sin(t * 10 + phase);
    leftFootX = -4;
    leftFootY = 12;
    if (kickWave > -0.2) {
      rightFootX = isSideView ? sideSign * 11 : 10;
      rightFootY = 2 - Math.max(0, kickWave) * 5;
      tiltAngle = -0.18 * (isSideView ? sideSign : 1);
      showKickArc = true;
    }
    rightArmAngle = -0.9;
    leftArmAngle = 0.8;
  } else if (anim === 'combo_kungfu') {
    const stage = Math.floor((t * 2.4 + phase) % 3);
    if (stage === 0) {
      // Twin Dragon Palms
      rightArmAngle = Math.sin(t * 15 + phase) * 1.4;
      leftArmAngle = Math.cos(t * 15 + phase) * 1.4;
      leftFootX = -5.5;
      rightFootX = 5.5;
      showPunchWave = true;
    } else if (stage === 1) {
      // Whirlwind Crescent Kick
      rightFootX = 10.5;
      rightFootY = 1;
      tiltAngle = -0.22;
      rightArmAngle = -1.2;
      leftArmAngle = 1.1;
      showKickArc = true;
    } else {
      // Aerial Martial Leap
      bounceY = -Math.abs(Math.sin(t * 9 + phase)) * 9;
      leftFootX = -6;
      rightFootX = 6;
      rightArmAngle = -1.8;
      leftArmAngle = 1.8;
    }
  } else if (anim === 'clap') {
    const clapWave = Math.abs(Math.sin(t * 12 + phase));
    rightArmAngle = -0.55 - clapWave * 0.35;
    leftArmAngle = 0.55 + clapWave * 0.35;
  } else if (anim === 'dodge') {
    tiltAngle = Math.sin(t * 10 + phase) * 0.35;
  } else if (anim === 'stagger') {
    tiltAngle = Math.sin(t * 16) * 0.4;
  } else {
    // Natural breathing idle
    bounceY = Math.sin(t * 2.8 + phase) * 0.8;
    rightArmAngle = Math.sin(t * 2.2 + phase) * 0.08;
    leftArmAngle = -rightArmAngle;
  }

  ctx.translate(px, py);
  ctx.scale(scale, scale);

  // Spiral rotation during Diệt Môn Phase 4 (vortex_suck)
  if (dietMon?.isActive && dietMon.phase === 'vortex_suck') {
    const vp = d.vortexProgress ?? dietMon.phaseProgress;
    ctx.rotate((d.vortexAngle ?? t * 8) * vp);
    ctx.globalAlpha = Math.max(0.15, 1 - vp * 0.85);
  }

  if (d.fsmState === 'departing_gate' || d.stayStatus === 'departing') {
    const fadeProgress = d.y > 86 ? Math.max(0.25, 1 - (d.y - 86) / 10) : 0.9;
    ctx.globalAlpha = fadeProgress;
  }

  // Descending Gold-Purple Light Pillar during Trưởng Lão (50 xu) / Đồng Tôn (99 xu) / Giáo Chủ (199 xu) Promotion
  if (
    d.promotionCeremonyUntil &&
    d.promotionCeremonyUntil > nowMs &&
    (d.rankId === 'truong_lao' ||
      d.rankId === 'ho_phap_ma_giao' ||
      d.rankId === 'dong_ton' ||
      d.rankId === 'dai_truong_lao' ||
      d.rankId === 'giao_chu' ||
      d.rankId === 'tan_giao_chu')
  ) {
    const beamGrad = ctx.createLinearGradient(0, -140, 0, 16);
    beamGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
    beamGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.38)');
    beamGrad.addColorStop(1, 'rgba(250, 204, 21, 0.65)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-16, -140, 32, 156);
  }

  // Ground Shadow & Rank Aura Ring
  const shadowScale = Math.max(0.55, 1 - Math.abs(bounceY) * 0.025);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 10 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (showLandingDust) {
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Per-Rank Ground Effects (1 xu Đệ Tử smoke -> 5 xu Chân Truyền Ma Ấn -> 10 xu Tinh Anh rays -> 20 xu Hộ Pháp dark qi -> 99 xu Đồng Tôn seal -> 199 xu Giáo Chủ dragon aura)
  if (d.rankId === 'de_tu' || d.rankId === 'ngoai_mon_do_de') {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
    ctx.beginPath();
    ctx.ellipse(Math.sin(t * 3 + phase) * 2, 12, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.rankId === 'chan_truyen' || d.rankId === 'noi_mon_de_tu') {
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.78)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 12, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 12, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (d.rankId === 'tinh_anh' || d.rankId === 'su_huynh_su_ty') {
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
    ctx.lineWidth = 1.4;
    for (let r = 0; r < 6; r++) {
      const ang = t * 3.2 + (r * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 7, 12 + Math.sin(ang) * 2.5);
      ctx.lineTo(Math.cos(ang) * 15, 12 + Math.sin(ang) * 5.5);
      ctx.stroke();
    }
  } else if (d.rankId === 'ho_phap' || d.rankId === 'tinh_anh_de_tu') {
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 12, 15 + Math.sin(t * 6) * 1.5, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (
    d.rankId === 'dong_ton' ||
    d.rankId === 'dai_truong_lao' ||
    d.rankId === 'dong_ton_giao_chu' ||
    d.rankId === 'giao_chu' ||
    d.rankId === 'tan_giao_chu'
  ) {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 12, 16 + Math.sin(t * 5) * 2, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (d.auraColor && d.auraColor !== 'transparent') {
    ctx.strokeStyle = d.auraColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 12, 13 + Math.sin(t * 4 + phase) * 1.5, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (d.stayStatus === 'expiring_soon') {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(0, 12, 15, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (d.stayStatus === 'departing' || d.fsmState === 'departing_gate') {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.font = 'bold 6.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RỜI SẢNH', 0, -29);
  }

  // Meditation Qi Lotus Halo when seated
  if (anim === 'meditate' && sitDropY > 3.5) {
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, 10, 14 + Math.sin(t * 5 + phase) * 2, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isSelected) {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -32, 32, 48);
  }

  ctx.translate(0, bounceY + sitDropY);
  ctx.rotate(tiltAngle);

  // Articulated Legs & Boots (or Crossed Lotus Legs when Meditating)
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  if ((anim === 'meditate' || anim === 'stand_up') && sitDropY > 2.5) {
    // Crossed lotus posture
    ctx.beginPath();
    ctx.moveTo(-8.5, 7.5);
    ctx.lineTo(8.5, 7.5);
    ctx.stroke();
  } else {
    const hipLeftX = isSideView ? -1 : -3.5;
    const hipRightX = isSideView ? 1 : 3.5;
    ctx.beginPath();
    ctx.moveTo(hipLeftX, 4);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.moveTo(hipRightX, 4);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.stroke();

    // Martial boots highlight
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(leftFootX, leftFootY, 1.8, 0, Math.PI * 2);
    ctx.arc(rightFootX, rightFootY, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crescent Kick Qi Arc
  if (showKickArc) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 2, 13, -0.8, 0.5);
    ctx.stroke();
  }

  // Flowing Cape for Tinh Anh / Hộ Pháp / Trưởng Lão / Đồng Tôn / Giáo Chủ ranks
  if (
    d.rankId === 'tinh_anh' ||
    d.rankId === 'ho_phap' ||
    d.rankId === 'truong_lao' ||
    d.rankId === 'dong_ton' ||
    d.rankId === 'giao_chu' ||
    d.rankId === 'su_huynh_su_ty' ||
    d.rankId === 'tinh_anh_de_tu' ||
    d.rankId === 'ho_phap_ma_giao' ||
    d.rankId === 'dai_truong_lao' ||
    d.rankId === 'dong_ton_giao_chu' ||
    d.rankId === 'tan_giao_chu'
  ) {
    ctx.fillStyle = d.secondaryColor;
    const capeDir = isSideView ? -sideSign * 4 : Math.sin(t * 4 + phase) * 2;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(8, -10);
    ctx.lineTo(11 + capeDir, 9);
    ctx.lineTo(-11 + capeDir, 9);
    ctx.closePath();
    ctx.fill();
  }

  // Torso Robe (narrower in side profile for authentic 4-directional silhouette)
  const torsoHalfW = isSideView ? 5.6 : 7.8;
  ctx.fillStyle = d.primaryColor;
  ctx.strokeStyle = d.secondaryColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-torsoHalfW, 6.5);
  ctx.lineTo(-torsoHalfW + 0.8, -10);
  ctx.lineTo(torsoHalfW - 0.8, -10);
  ctx.lineTo(torsoHalfW, 6.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Martial Armor Shoulder Pauldrons for Hộ Pháp (20 xu) and higher
  if (
    d.rankId === 'ho_phap' ||
    d.rankId === 'truong_lao' ||
    d.rankId === 'dong_ton' ||
    d.rankId === 'giao_chu' ||
    d.rankId === 'tinh_anh_de_tu' ||
    d.rankId === 'ho_phap_ma_giao'
  ) {
    ctx.fillStyle = d.secondaryColor;
    ctx.fillRect(-torsoHalfW - 2, -10.5, 3.5, 3);
    ctx.fillRect(torsoHalfW - 1.5, -10.5, 3.5, 3);
  }

  // Rear back-emblem vs Front lapel collar
  if (d.direction === 'rear') {
    ctx.strokeStyle = d.secondaryColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -3.5, 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (d.direction === 'front') {
    ctx.strokeStyle = d.secondaryColor;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-3.5, -10);
    ctx.lineTo(0, -3);
    ctx.lineTo(3.5, -10);
    ctx.stroke();
  }

  // Waist Sash
  ctx.fillStyle = d.secondaryColor;
  ctx.fillRect(-torsoHalfW + 0.5, -1, (torsoHalfW - 0.5) * 2, 2.5);

  // Articulated Left Arm
  ctx.save();
  ctx.translate(isSideView ? -1.5 : -7, -8);
  ctx.rotate(leftArmAngle);
  ctx.strokeStyle = d.primaryColor;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(isSideView ? sideSign * 4 : -5, 7);
  ctx.stroke();
  ctx.restore();

  // Articulated Right Arm
  ctx.save();
  ctx.translate(isSideView ? 1.5 : 7, -8);
  ctx.rotate(rightArmAngle);
  ctx.strokeStyle = d.primaryColor;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(isSideView ? sideSign * 5 : 5, 7);
  ctx.stroke();

  // Punch Fist Qi Burst
  if (showPunchWave) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(isSideView ? sideSign * 6 : 6, 7, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // If sweeping penalty (sweep_floor), draw animated Bamboo Broom in hand!
  if (anim === 'sweep_floor' || d.isSweepingPenalty) {
    const sweepSwing = Math.sin(t * 8 + phase) * 0.45;
    ctx.rotate(sweepSwing);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(8, 16);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(4, 15);
    ctx.lineTo(13, 15);
    ctx.lineTo(15, 21);
    ctx.lineTo(2, 21);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Head (with bow nod when bowing)
  const headBowY = anim === 'bow' ? 2.5 : 0;
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(0, -16 + headBowY, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // 4-Directional Hair & Facial Rendering (Rear vs Front vs Left/Right Profile)
  ctx.fillStyle = '#111827';
  if (d.direction === 'rear') {
    // Full back of hair looking up toward the Sect Leader on the Throne
    ctx.beginPath();
    ctx.arc(0, -16 + headBowY, 6.7, 0, Math.PI * 2);
    ctx.fill();
    // Hair ribbon trailing down the back
    ctx.strokeStyle = d.secondaryColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -15 + headBowY);
    ctx.lineTo(Math.sin(t * 5 + phase) * 2, -8 + headBowY);
    ctx.stroke();
  } else if (isSideView) {
    // Side Profile (Left or Right)
    ctx.beginPath();
    ctx.arc(0, -17.2 + headBowY, 6.7, Math.PI, 0);
    ctx.fill();
    // Back of hair in profile
    ctx.beginPath();
    ctx.arc(-sideSign * 2.2, -15.5 + headBowY, 5.2, 0, Math.PI * 2);
    ctx.fill();
    // Profile Eye looking in movement direction
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(sideSign * 3.2, -16 + headBowY, 1.0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Front View looking toward the Gate / Viewer
    ctx.beginPath();
    ctx.arc(0, -17.5 + headBowY, 6.7, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-2.2, -16 + headBowY, 0.95, 0, Math.PI * 2);
    ctx.arc(2.2, -16 + headBowY, 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gender Hair Bun / Rank Crown Accessory
  if (
    d.rankId === 'giao_chu' ||
    d.rankId === 'dong_ton' ||
    d.rankId === 'truong_lao' ||
    d.rankId === 'tan_giao_chu' ||
    d.rankId === 'dong_ton_giao_chu' ||
    d.rankId === 'dai_truong_lao'
  ) {
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-4, -25 + headBowY, 8, 3.5);
  } else if (d.gender === 'nu') {
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-5, -21 + headBowY, 2.6, 0, Math.PI * 2);
    ctx.arc(5, -21 + headBowY, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(0, -23 + headBowY, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Elemental seal in Mini Game 3
  if (anim === 'cast_seal') {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -8, 12 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// MINI-GAME FIELD OVERLAY & ATMOSPHERIC PARTICLES
// ============================================================================
function drawMiniGameFieldOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  mg: MiniGameActiveState
) {
  ctx.save();
  if (mg.gameId === 'ma_anh_than_phap' && mg.currentObstacleDirection) {
    const dir = mg.currentObstacleDirection;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.lineWidth = 2;

    if (dir === 'TRAI') {
      ctx.fillRect(W * 0.5, H * 0.34, W * 0.44, H * 0.46);
      ctx.strokeRect(W * 0.5, H * 0.34, W * 0.44, H * 0.46);
    } else if (dir === 'PHAI') {
      ctx.fillRect(W * 0.06, H * 0.34, W * 0.44, H * 0.46);
      ctx.strokeRect(W * 0.06, H * 0.34, W * 0.44, H * 0.46);
    } else {
      const waveY = H * 0.36 + (((t * 140) % (H * 0.44)));
      ctx.fillRect(W * 0.08, waveY, W * 0.84, 18);
    }
  }
  ctx.restore();
}

function drawAtmosphericParticles(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  particles: FloatingParticle[],
  mistIntensity: number,
  curScene: ActiveSceneType
) {
  if (mistIntensity <= 0.02) return;

  ctx.save();
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < -30) {
      p.y = H + 20;
      p.x = Math.random() * W;
    }
    if (p.x < -20) p.x = W + 20;
    if (p.x > W + 20) p.x = -20;

    ctx.globalAlpha = p.alpha * mistIntensity;
    if (p.type === 'mist') {
      const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'leaf' && curScene === 'training_ground') {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4, 2, p.x * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
