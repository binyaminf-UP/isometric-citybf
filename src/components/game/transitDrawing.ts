/**
 * ציור קווי אוטובוס, תחנות, אוטובוסים וטיוטת קו על קנבס הרכבים.
 */
import type { TransitState, GridPoint, BusLine } from '@/transit/types';
import { waitingAt, busLoad } from '@/transit/sim';
import { BUS_CAPACITY } from '@/transit/balance';
import { TILE_WIDTH, TILE_HEIGHT } from './types';
import { gridToScreen } from './utils';

/** Smoothed bus positions between simulation ticks (renderer only) */
export type BusDisplayMap = Map<number, number>;

function center(p: { x: number; y: number }) {
  const { screenX, screenY } = gridToScreen(p.x, p.y, 0, 0);
  return { x: screenX + TILE_WIDTH / 2, y: screenY + TILE_HEIGHT / 2 };
}

function pointOnPath(path: GridPoint[], pos: number) {
  const L = path.length - 1;
  const p = Math.max(0, Math.min(L, pos));
  const i = Math.min(L - 1, Math.floor(p));
  const f = p - i;
  const a = path[i];
  const b = path[Math.min(L, i + 1)];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x, dy: b.y - a.y };
}

function strokePath(ctx: CanvasRenderingContext2D, path: GridPoint[], offY: number) {
  if (path.length < 2) return;
  ctx.beginPath();
  path.forEach((p, i) => {
    const c = center(p);
    if (i === 0) ctx.moveTo(c.x, c.y + offY);
    else ctx.lineTo(c.x, c.y + offY);
  });
  ctx.stroke();
}

export function drawTransit(
  ctx: CanvasRenderingContext2D,
  transit: TransitState | undefined,
  offset: { x: number; y: number },
  zoom: number,
  display: BusDisplayMap,
  delta: number
) {
  if (!transit || (transit.lines.length === 0 && !transit.draft)) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr * zoom, dpr * zoom);
  ctx.translate(offset.x / zoom, offset.y / zoom);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const n = transit.lines.length;
  const lineOffset = (idx: number) => (idx - (n - 1) / 2) * 3;

  // Lines
  transit.lines.forEach((line, idx) => {
    ctx.strokeStyle = line.broken ? 'rgba(120,120,120,0.7)' : line.color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3.5;
    ctx.setLineDash(line.broken ? [6, 6] : []);
    strokePath(ctx, line.path, lineOffset(idx));
  });
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Draft
  const d = transit.draft;
  if (d) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    for (const seg of d.segments) strokePath(ctx, seg, 0);
    ctx.setLineDash([]);
    d.tiles.forEach((p, i) => {
      const c = center(p);
      ctx.beginPath();
      ctx.arc(c.x, c.y, i === 0 ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#facc15' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111827';
      ctx.stroke();
    });
  }

  // Stops
  const lineColorsAt = new Map<number, string[]>();
  for (const line of transit.lines) for (const s of line.stopIds) {
    if (!lineColorsAt.has(s)) lineColorsAt.set(s, []);
    lineColorsAt.get(s)!.push(line.color);
  }
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const s of transit.stops) {
    const c = center(s);
    const colors = lineColorsAt.get(s.id) ?? ['#888'];
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = colors.length > 1 ? 3 : 2.5;
    ctx.strokeStyle = colors.length > 1 ? '#111827' : colors[0];
    ctx.stroke();
    const w = waitingAt(transit, s.id);
    if (w >= 1 && zoom >= 0.45) {
      const label = `${Math.round(w)}`;
      const bw = 6 + label.length * 5.5;
      const crowded = w > BUS_CAPACITY;
      ctx.fillStyle = crowded ? '#dc2626' : 'rgba(17,24,39,0.85)';
      ctx.beginPath();
      ctx.roundRect(c.x - bw / 2, c.y - 21, bw, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, c.x, c.y - 15);
    }
  }

  // Buses
  const lineById = new Map<number, BusLine>(transit.lines.map(l => [l.id, l]));
  const seen = new Set<number>();
  const k = Math.min(1, delta * 5);
  for (const bus of transit.buses) {
    const line = lineById.get(bus.lineId);
    if (!line || line.path.length < 2) continue;
    seen.add(bus.id);
    const L = line.path.length - 1;
    let disp = display.get(bus.id) ?? bus.pos;
    let diff = bus.pos - disp;
    if (line.loop && Math.abs(diff) > L / 2) diff -= Math.sign(diff) * L;
    if (Math.abs(diff) > 8) disp = bus.pos;
    else disp += diff * k;
    if (line.loop) disp = ((disp % L) + L) % L;
    display.set(bus.id, disp);

    const pt = pointOnPath(line.path, disp);
    const c = center(pt);
    const idx = transit.lines.indexOf(line);
    // Screen direction of travel
    const sdx = (pt.dx - pt.dy) * (TILE_WIDTH / 2) * bus.dir;
    const sdy = (pt.dx + pt.dy) * (TILE_HEIGHT / 2) * bus.dir;
    const angle = Math.atan2(sdy, sdx);
    ctx.save();
    ctx.translate(c.x, c.y + lineOffset(idx) - 3);
    ctx.rotate(angle);
    ctx.fillStyle = line.color;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-8, -4, 16, 8, 2);
    ctx.fill();
    ctx.stroke();
    const fill = Math.min(1, busLoad(bus) / BUS_CAPACITY);
    ctx.fillStyle = fill > 0.95 ? '#fecaca' : '#ffffff';
    ctx.fillRect(-6, -1.5, 12 * fill, 3);
    ctx.restore();
  }
  for (const id of display.keys()) if (!seen.has(id)) display.delete(id);

  ctx.restore();
}
