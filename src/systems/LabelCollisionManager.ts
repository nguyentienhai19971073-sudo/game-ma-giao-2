export interface LabelRectInput {
  id: string;
  anchorX: number; // 0..100 (% of 9:16 viewport width)
  anchorY: number; // 0..100 (% of 9:16 viewport height)
  widthPct: number;
  heightPct: number;
  priority: number; // Higher priority keeps closer to anchor
  type: 'nameplate' | 'bubble';
}

export interface SolvedLabelPosition {
  id: string;
  xPct: number;
  yPct: number;
  visible: boolean;
  opacity: number;
}

export interface ForbiddenZoneRect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Inherited & upgraded from Chùa Online 2:
 * Solves non-overlapping 2D screen positions for 80 player nameplates (below feet)
 * and active comment bubbles (above head) while protecting the Sect Leader, Throne, and HUD panels.
 */
export class LabelCollisionManager {
  // Default forbidden zones (Throne / Sect Leader center top, Top HUD bar, Bottom HUD bar)
  private forbiddenZones: ForbiddenZoneRect[] = [
    { xMin: 34, xMax: 66, yMin: 12, yMax: 29 }, // Sect Leader & Throne platform
    { xMin: 0, xMax: 100, yMin: 0, yMax: 6 },   // Top status bar
  ];

  public setForbiddenZones(zones: ForbiddenZoneRect[]) {
    this.forbiddenZones = zones;
  }

  public solveLayout(
    inputs: LabelRectInput[],
    maxVisibleBubbles = 12,
    maxVisibleNameplates = 80
  ): Map<string, SolvedLabelPosition> {
    const result = new Map<string, SolvedLabelPosition>();

    // Sort by type (bubbles first), then by priority descending
    const sorted = [...inputs].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'bubble' ? -1 : 1;
      }
      return b.priority - a.priority;
    });

    const occupied: { xMin: number; xMax: number; yMin: number; yMax: number; type: string }[] = [];
    let bubbleCount = 0;
    let nameplateCount = 0;

    for (const item of sorted) {
      if (item.type === 'bubble' && bubbleCount >= maxVisibleBubbles) {
        result.set(item.id, {
          id: item.id,
          xPct: item.anchorX,
          yPct: item.anchorY,
          visible: false,
          opacity: 0,
        });
        continue;
      }
      if (item.type === 'nameplate' && nameplateCount >= maxVisibleNameplates) {
        result.set(item.id, {
          id: item.id,
          xPct: item.anchorX,
          yPct: item.anchorY,
          visible: false,
          opacity: 0,
        });
        continue;
      }

      const halfW = item.widthPct / 2;
      const halfH = item.heightPct / 2;

      const stepX = item.widthPct + 0.8;
      const stepY = item.heightPct + 0.6;

      // Candidate offsets (in % of screen) scaled to label dimensions to prevent overlap
      const offsets: [number, number][] =
        item.type === 'bubble'
          ? [
              [0, 0],
              [0, -stepY],
              [-stepX * 0.65, -stepY * 0.5],
              [stepX * 0.65, -stepY * 0.5],
              [-stepX, 0],
              [stepX, 0],
              [0, -stepY * 2],
            ]
          : [
              [0, 0],
              [0, stepY],
              [-stepX, 0],
              [stepX, 0],
              [0, -stepY],
              [-stepX * 0.75, stepY],
              [stepX * 0.75, stepY],
            ];

      let placedX = Math.max(halfW + 1, Math.min(99 - halfW, item.anchorX));
      let placedY = Math.max(halfH + 6, Math.min(97 - halfH, item.anchorY));
      let foundCleanSlot = false;

      for (const [dx, dy] of offsets) {
        const cx = Math.max(halfW + 1, Math.min(99 - halfW, item.anchorX + dx));
        const cy = Math.max(halfH + 6, Math.min(97 - halfH, item.anchorY + dy));
        const rect = {
          xMin: cx - halfW,
          xMax: cx + halfW,
          yMin: cy - halfH,
          yMax: cy + halfH,
        };

        // Never allow comment bubbles to cover the Sect Leader / Throne forbidden zone
        if (item.type === 'bubble' && this.intersectsAny(rect, this.forbiddenZones)) {
          continue;
        }

        if (!this.intersectsAny(rect, occupied)) {
          placedX = cx;
          placedY = cy;
          foundCleanSlot = true;
          occupied.push({ ...rect, type: item.type });
          break;
        }
      }

      if (!foundCleanSlot) {
        // Nudge deterministically if all primary slots are crowded
        placedY = Math.min(97 - halfH, placedY + stepY * ((occupied.length % 3) + 1));
        const rect = {
          xMin: placedX - halfW,
          xMax: placedX + halfW,
          yMin: placedY - halfH,
          yMax: placedY + halfH,
        };
        occupied.push({ ...rect, type: item.type });
      }

      if (item.type === 'bubble') bubbleCount += 1;
      else nameplateCount += 1;

      result.set(item.id, {
        id: item.id,
        xPct: placedX,
        yPct: placedY,
        visible: true,
        opacity: foundCleanSlot ? 1 : 0.88,
      });
    }

    return result;
  }

  private intersectsAny(
    rect: { xMin: number; xMax: number; yMin: number; yMax: number },
    others: { xMin: number; xMax: number; yMin: number; yMax: number }[]
  ): boolean {
    for (const o of others) {
      if (
        rect.xMin < o.xMax &&
        rect.xMax > o.xMin &&
        rect.yMin < o.yMax &&
        rect.yMax > o.yMin
      ) {
        return true;
      }
    }
    return false;
  }
}

export const labelCollisionManager = new LabelCollisionManager();
