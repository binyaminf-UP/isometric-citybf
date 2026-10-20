/**
 * עריכת קווים: טיוטה (הקשה על תחנות ברצף), יצירה, אוטובוסים, מחיקה, ומסלול מחדש אחרי שינוי כבישים.
 * כל הפונקציות מחזירות אובייקט TransitState חדש ולא משנות את הקיים.
 */
import type { Tile } from '@/games/isocity/types';
import type { Bus, BusLine, GridPoint, LineDraft, TransitState } from './types';
import { createTransitState } from './types';
import { findRoadPath, isRoadTile } from './roads';
import { BUS_PRICE, BUS_SELL_REFUND, LINE_COLORS, STOP_COST } from './balance';

export function ensureTransit(t: TransitState | undefined | null): TransitState {
  if (!t || t.version !== 1) return createTransitState();
  return t;
}

const samePoint = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;

export function stopAt(t: TransitState, x: number, y: number) {
  return t.stops.find(s => s.x === x && s.y === y);
}

/** Cost of creating the drafted line: new stops + one bus */
export function draftCost(t: TransitState): number {
  const d = t.draft;
  if (!d) return 0;
  const newStops = d.tiles.filter(p => !stopAt(t, p.x, p.y)).length;
  return newStops * STOP_COST + BUS_PRICE;
}

/** Tap with the bus-line tool: adds a stop to the draft (starts one if needed) */
export function addDraftStop(t: TransitState, grid: Tile[][], size: number, x: number, y: number): TransitState {
  const draft: LineDraft = t.draft
    ? { ...t.draft, tiles: [...t.draft.tiles], segments: [...t.draft.segments], error: null }
    : { tiles: [], segments: [], loop: false, error: null };
  const p = { x, y };

  if (!isRoadTile(grid[y]?.[x])) {
    return { ...t, draft: { ...draft, error: 'not_road' } };
  }
  if (draft.tiles.length > 0) {
    const last = draft.tiles[draft.tiles.length - 1];
    if (samePoint(last, p)) return t;
    // Tapping the first stop again closes a loop
    if (samePoint(draft.tiles[0], p)) {
      if (draft.tiles.length < 3) return { ...t, draft: { ...draft, error: 'duplicate' } };
      const seg = findRoadPath(grid, size, last, p);
      if (!seg) return { ...t, draft: { ...draft, error: 'no_connection' } };
      draft.segments.push(seg);
      draft.loop = true;
      return { ...t, draft };
    }
    if (draft.loop || draft.tiles.some(q => samePoint(q, p))) {
      return { ...t, draft: { ...draft, error: 'duplicate' } };
    }
    const seg = findRoadPath(grid, size, last, p);
    if (!seg) return { ...t, draft: { ...draft, error: 'no_connection' } };
    draft.segments.push(seg);
  }
  draft.tiles.push(p);
  return { ...t, draft };
}

export function undoDraftStop(t: TransitState): TransitState {
  if (!t.draft) return t;
  const d = t.draft;
  if (d.loop) {
    return { ...t, draft: { ...d, loop: false, segments: d.segments.slice(0, -1), error: null } };
  }
  if (d.tiles.length <= 1) return { ...t, draft: null };
  return { ...t, draft: { ...d, tiles: d.tiles.slice(0, -1), segments: d.segments.slice(0, -1), error: null } };
}

export function cancelDraft(t: TransitState): TransitState {
  return t.draft ? { ...t, draft: null } : t;
}

/** Joins segments into one path and records the index of each stop */
function joinSegments(segments: GridPoint[][], firstTile: GridPoint): { path: GridPoint[]; stopPathIdx: number[] } {
  const path: GridPoint[] = [{ ...firstTile }];
  const stopPathIdx = [0];
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) path.push({ ...seg[i] });
    stopPathIdx.push(path.length - 1);
  }
  return { path, stopPathIdx };
}

/** Evenly spreads n buses over the line (round-trip phase) */
function placeBuses(line: BusLine, existing: Bus[], startId: number): { buses: Bus[]; nextId: number } {
  const others = existing.filter(b => b.lineId !== line.id);
  const mine = existing.filter(b => b.lineId === line.id);
  let nextId = startId;
  const L = Math.max(1, line.path.length - 1);
  const cycle = line.loop ? L : 2 * L;
  const result: Bus[] = [];
  for (let i = 0; i < line.buses; i++) {
    const phase = (i * cycle) / line.buses;
    const pos = line.loop ? phase : phase <= L ? phase : 2 * L - phase;
    const dir: 1 | -1 = line.loop || phase <= L ? 1 : -1;
    const keep = mine[i];
    if (keep) {
      result.push(keep);
    } else {
      result.push({ id: nextId++, lineId: line.id, pos, dir, load: {}, dwell: 0, lastStop: -1 });
    }
  }
  return { buses: [...others, ...result], nextId };
}

/** Creates the line from the draft. Returns null if the draft is not valid. Money is handled by the caller. */
export function finalizeDraft(t: TransitState): TransitState | null {
  const d = t.draft;
  if (!d || d.tiles.length < 2) return null;
  let nextId = t.nextId;
  const stops = [...t.stops];
  const stopIds: number[] = [];
  for (const p of d.tiles) {
    let s = stops.find(q => q.x === p.x && q.y === p.y);
    if (!s) {
      s = { id: nextId++, x: p.x, y: p.y };
      stops.push(s);
    }
    stopIds.push(s.id);
  }
  const { path, stopPathIdx } = joinSegments(d.segments, d.tiles[0]);
  const used = new Set(t.lines.map(l => l.color));
  const color = LINE_COLORS.find(c => !used.has(c)) ?? LINE_COLORS[t.lines.length % LINE_COLORS.length];
  let num = 1;
  while (t.lines.some(l => l.name === `${num}`)) num++;
  const line: BusLine = {
    id: nextId++,
    name: `${num}`,
    color,
    stopIds,
    loop: d.loop,
    path,
    stopPathIdx: d.loop ? stopPathIdx.slice(0, -1) : stopPathIdx,
    buses: 1,
    broken: false,
  };
  const placed = placeBuses(line, t.buses, nextId);
  return {
    ...t,
    stops,
    lines: [...t.lines, line],
    buses: placed.buses,
    nextId: placed.nextId,
    draft: null,
    networkVersion: t.networkVersion + 1,
  };
}

/** Change bus count by delta (+1 buy, -1 sell). Returns the state and the money change. */
export function changeBuses(t: TransitState, lineId: number, delta: number): { transit: TransitState; money: number } {
  const line = t.lines.find(l => l.id === lineId);
  if (!line) return { transit: t, money: 0 };
  const count = Math.max(0, Math.min(40, line.buses + delta));
  if (count === line.buses) return { transit: t, money: 0 };
  const newLine = { ...line, buses: count };
  // Selling removes the emptiest buses; their passengers return to waiting at the next stop is not modeled: they are lost
  let buses = t.buses;
  if (count < line.buses) {
    const mine = t.buses.filter(b => b.lineId === lineId);
    const load = (b: Bus) => Object.values(b.load).reduce((s, v) => s + v, 0);
    const keep = new Set([...mine].sort((a, b) => load(b) - load(a)).slice(0, count).map(b => b.id));
    buses = t.buses.filter(b => b.lineId !== lineId || keep.has(b.id));
  }
  const placed = placeBuses(newLine, buses, t.nextId);
  const diff = count - line.buses;
  return {
    transit: {
      ...t,
      lines: t.lines.map(l => (l.id === lineId ? newLine : l)),
      buses: placed.buses,
      nextId: placed.nextId,
      networkVersion: t.networkVersion + 1,
    },
    money: diff > 0 ? -diff * BUS_PRICE : Math.round(-diff * BUS_PRICE * BUS_SELL_REFUND),
  };
}

/** Deletes a line, its buses, and stops no other line uses. Refunds part of the buses. */
export function deleteLine(t: TransitState, lineId: number): { transit: TransitState; money: number } {
  const line = t.lines.find(l => l.id === lineId);
  if (!line) return { transit: t, money: 0 };
  const lines = t.lines.filter(l => l.id !== lineId);
  const usedStops = new Set(lines.flatMap(l => l.stopIds));
  const stops = t.stops.filter(s => usedStops.has(s.id));
  const waiting: TransitState['waiting'] = {};
  for (const s of stops) {
    const w = t.waiting[s.id];
    if (!w) continue;
    const kept: Record<number, number> = {};
    for (const [d, v] of Object.entries(w)) if (usedStops.has(Number(d))) kept[Number(d)] = v;
    waiting[s.id] = kept;
  }
  return {
    transit: {
      ...t,
      lines,
      stops,
      waiting,
      buses: t.buses.filter(b => b.lineId !== lineId),
      networkVersion: t.networkVersion + 1,
    },
    money: Math.round(line.buses * BUS_PRICE * BUS_SELL_REFUND),
  };
}

/**
 * Re-routes every line along the current roads (after building or bulldozing).
 * A line whose stops lost their road or connection is marked broken (its buses wait).
 */
export function rerouteLines(t: TransitState, grid: Tile[][], size: number): TransitState {
  let changed = false;
  const stopById = new Map(t.stops.map(s => [s.id, s]));
  const lines = t.lines.map(line => {
    const pts = line.stopIds.map(id => stopById.get(id)!).filter(Boolean);
    const seq = line.loop ? [...pts, pts[0]] : pts;
    const segments: GridPoint[][] = [];
    let ok = pts.length === line.stopIds.length && pts.length >= 2;
    for (let i = 0; ok && i < seq.length - 1; i++) {
      const seg = findRoadPath(grid, size, seq[i], seq[i + 1]);
      if (!seg) ok = false;
      else segments.push(seg);
    }
    if (!ok) {
      if (!line.broken) {
        changed = true;
        return { ...line, broken: true };
      }
      return line;
    }
    const { path, stopPathIdx } = joinSegments(segments, seq[0]);
    const same = !line.broken && path.length === line.path.length && path.every((p, i) => samePoint(p, line.path[i]));
    if (same) return line;
    changed = true;
    return { ...line, path, stopPathIdx: line.loop ? stopPathIdx.slice(0, -1) : stopPathIdx, broken: false };
  });
  if (!changed) return t;
  // Keep buses on their line, scaled to the new path length
  const oldLen = new Map(t.lines.map(l => [l.id, Math.max(1, l.path.length - 1)]));
  const buses = t.buses.map(b => {
    const nl = lines.find(l => l.id === b.lineId);
    if (!nl) return b;
    const L = Math.max(1, nl.path.length - 1);
    const pos = Math.min(L, (b.pos / (oldLen.get(b.lineId) ?? L)) * L);
    return { ...b, pos, lastStop: -1 };
  });
  return { ...t, lines, buses, networkVersion: t.networkVersion + 1 };
}

/**
 * Grid was expanded or shrunk by `shift` tiles on each side.
 * Moves everything by `shift`; lines with a stop outside the new grid are removed.
 */
export function shiftTransit(t: TransitState | undefined, shift: number, newSize: number): TransitState | undefined {
  if (!t) return t;
  const inside = (p: GridPoint) => p.x >= 0 && p.y >= 0 && p.x < newSize && p.y < newSize;
  const mv = (p: GridPoint) => ({ x: p.x + shift, y: p.y + shift });
  const stops = t.stops.map(s => ({ ...s, ...mv(s) }));
  const okStops = new Set(stops.filter(inside).map(s => s.id));
  const lines = t.lines
    .filter(l => l.stopIds.every(id => okStops.has(id)) && l.path.every(p => inside(mv(p))))
    .map(l => ({ ...l, path: l.path.map(mv) }));
  const lineIds = new Set(lines.map(l => l.id));
  const used = new Set(lines.flatMap(l => l.stopIds));
  return {
    ...t,
    stops: stops.filter(s => used.has(s.id)),
    lines,
    buses: t.buses.filter(b => lineIds.has(b.lineId)),
    waiting: Object.fromEntries(Object.entries(t.waiting).filter(([id]) => used.has(Number(id)))),
    draft: null,
    networkVersion: t.networkVersion + 1,
  };
}
