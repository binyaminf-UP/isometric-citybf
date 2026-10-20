/**
 * סימולציית התחב"צ לכל tick:
 *  1. ביקושים (כל כמה טיקים): נסיעות מבתים לעבודה, בית ספר ומסחר לפי שעה, מודל כבידה בין בלוקים,
 *     בחירה בין תחב"צ לרכב לפי זמן נסיעה, והעמסת הרכבים על משבצות הכביש (עומס).
 *  2. רשת: זמני נסיעה של קווים (כולל עומס), תדירות, והמסלול הטוב ביותר בין כל שתי תחנות (כולל החלפות).
 *  3. אוטובוסים: תנועה לאורך הקו (מואטת בעומס), עלייה וירידה של נוסעים, ויתור של ממתינים.
 * לוגיקה טהורה, בלי React. נתונים נגזרים נשמרים במטמון של המודול ולא בשמירה.
 */
import type { Tile } from '@/games/isocity/types';
import { BUILDING_STATS } from '@/games/isocity/types/buildings';
import type { Bus, BusLine, TransitState } from './types';
import { emptyDayStats } from './types';
import { roadBfsTree, isRoadTile } from './roads';
import { rerouteLines } from './lines';
import * as B from './balance';

// ---------------------------------------------------------------------------
// Hourly profiles (share of the daily trips of each purpose that start in each hour)
// ---------------------------------------------------------------------------

function makeProfile(peaks: Record<number, number>): number[] {
  const p = Array.from({ length: 24 }, (_, h) => (h >= 6 && h <= 22 ? 0.01 : 0.002) + (peaks[h] ?? 0));
  const sum = p.reduce((a, b) => a + b, 0);
  return p.map(v => v / sum);
}

export const PROFILES = {
  work: { out: makeProfile({ 6: 0.08, 7: 0.3, 8: 0.32, 9: 0.12, 10: 0.03 }), ret: makeProfile({ 15: 0.05, 16: 0.14, 17: 0.32, 18: 0.27, 19: 0.1, 20: 0.03 }) },
  school: { out: makeProfile({ 7: 0.45, 8: 0.38, 9: 0.05 }), ret: makeProfile({ 13: 0.25, 14: 0.35, 15: 0.25, 16: 0.1 }) },
  shop: { out: makeProfile({ 10: 0.08, 11: 0.1, 12: 0.08, 13: 0.06, 16: 0.08, 17: 0.1, 18: 0.1, 19: 0.06 }), ret: makeProfile({ 11: 0.06, 12: 0.1, 13: 0.08, 14: 0.06, 17: 0.08, 18: 0.1, 19: 0.1, 20: 0.08 }) },
};
type Purpose = keyof typeof PROFILES;
const PURPOSES: Purpose[] = ['work', 'school', 'shop'];
const TICKS_PER_HOUR = B.TICKS_PER_DAY / 24;

// ---------------------------------------------------------------------------
// Derived data cache
// ---------------------------------------------------------------------------

export interface Hop {
  line: number;
  alight: number;
  dir: 1 | -1;
}

export interface LineInfo {
  /** Time (ticks) for one bus to complete the full cycle */
  cycle: number;
  /** Ticks between buses (Infinity with no buses) */
  headway: number;
  /** Time from the start of the path to each stop, forward */
  stopTimes: number[];
  usable: boolean;
}

interface Derived {
  key: string;
  size: number;
  tick: number;
  networkVersion: number;
  lastDemandTick: number;
  lastRouteTick: number;
  traffic: Float32Array;
  congestion: Float32Array;
  flows: { o: number; d: number; rate: number }[];
  rates: { transit: number; car: number; walk: number };
  lineInfo: Map<number, LineInfo>;
  nextHop: Map<number, Map<number, Hop>>;
  transitCost: Map<number, Map<number, number>>;
}

let cache: Derived | null = null;

function getCache(cityId: string, size: number): Derived {
  const key = `${cityId}|${size}`;
  if (!cache || cache.key !== key) {
    cache = {
      key,
      size,
      tick: 0,
      networkVersion: -1,
      lastDemandTick: -1e9,
      lastRouteTick: 0,
      traffic: new Float32Array(size * size),
      congestion: new Float32Array(size * size).fill(1),
      flows: [],
      rates: { transit: 0, car: 0, walk: 0 },
      lineInfo: new Map(),
      nextHop: new Map(),
      transitCost: new Map(),
    };
  }
  return cache;
}

/** Read-only access for the UI */
export function getTransitDerived(cityId: string, size: number) {
  const c = cache && cache.key === `${cityId}|${size}` ? cache : null;
  return c ? { lineInfo: c.lineInfo, rates: c.rates, congestion: c.congestion, traffic: c.traffic } : null;
}

// ---------------------------------------------------------------------------
// Network: line timings and best hops between stops
// ---------------------------------------------------------------------------

function lineUsable(line: BusLine) {
  return !line.broken && line.buses > 0 && line.path.length >= 2 && line.stopIds.length >= 2;
}

function computeNetwork(t: TransitState, c: Derived) {
  const size = c.size;
  c.lineInfo = new Map();
  for (const line of t.lines) {
    const L = line.path.length - 1;
    const cum = new Float64Array(L + 1);
    for (let i = 1; i <= L; i++) {
      const p = line.path[i];
      cum[i] = cum[i - 1] + (c.congestion[p.y * size + p.x] || 1) / B.BUS_SPEED;
    }
    const dwell = B.DWELL_BASE + 1;
    const stopTimes = line.stopPathIdx.map((idx, k) => cum[Math.max(0, Math.min(L, idx))] + k * dwell);
    const oneWay = cum[L] + line.stopIds.length * dwell;
    const cycle = line.loop ? oneWay : 2 * oneWay;
    c.lineInfo.set(line.id, {
      cycle,
      headway: line.buses > 0 ? cycle / line.buses : Infinity,
      stopTimes,
      usable: lineUsable(line),
    });
  }

  // Dijkstra over stops from every stop
  const stopIds = t.stops.map(s => s.id);
  const linesAt = new Map<number, BusLine[]>();
  for (const line of t.lines) {
    if (!c.lineInfo.get(line.id)?.usable) continue;
    for (const s of line.stopIds) {
      if (!linesAt.has(s)) linesAt.set(s, []);
      linesAt.get(s)!.push(line);
    }
  }
  c.nextHop = new Map();
  c.transitCost = new Map();
  for (const o of stopIds) {
    const dist = new Map<number, number>([[o, 0]]);
    const hop = new Map<number, Hop>();
    const done = new Set<number>();
    for (;;) {
      let cur = -1;
      let best = Infinity;
      for (const [s, d] of dist) if (!done.has(s) && d < best) { best = d; cur = s; }
      if (cur < 0) break;
      done.add(cur);
      for (const line of linesAt.get(cur) ?? []) {
        const info = c.lineInfo.get(line.id)!;
        const i = line.stopIds.indexOf(cur);
        const total = info.cycle;
        const boardCost = Math.min(info.headway / 2, 200) * B.WAIT_WEIGHT + (cur === o ? 0 : B.TRANSFER_PENALTY);
        for (let j = 0; j < line.stopIds.length; j++) {
          if (j === i) continue;
          const s2 = line.stopIds[j];
          let ride: number;
          let dir: 1 | -1;
          if (line.loop) {
            ride = (info.stopTimes[j] - info.stopTimes[i] + total) % total;
            dir = 1;
          } else {
            ride = Math.abs(info.stopTimes[j] - info.stopTimes[i]);
            dir = j > i ? 1 : -1;
          }
          const nd = best + boardCost + ride;
          if (nd < (dist.get(s2) ?? Infinity)) {
            dist.set(s2, nd);
            hop.set(s2, cur === o ? { line: line.id, alight: s2, dir } : hop.get(cur)!);
          }
        }
      }
    }
    dist.delete(o);
    c.nextHop.set(o, hop);
    c.transitCost.set(o, dist);
  }
}

// ---------------------------------------------------------------------------
// Demand, mode choice and car traffic
// ---------------------------------------------------------------------------

interface Block {
  cx: number;
  cy: number;
  road: number; // tile index of a representative road tile, -1 if none
  res: number;
  resStops: Map<number, number>;
  attr: Record<Purpose, number>;
  attrStops: Record<Purpose, Map<number, number>>;
}

function addTo(m: Map<number, number>, k: number, v: number) {
  m.set(k, (m.get(k) ?? 0) + v);
}

function computeDemand(t: TransitState, grid: Tile[][], c: Derived, hour: number) {
  const size = c.size;
  const N = size * size;
  const isRoad = new Uint8Array(N);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (isRoadTile(grid[y][x])) isRoad[y * size + x] = 1;

  // Active stops (served by a usable line)
  const active = new Set<number>();
  for (const line of t.lines) if (c.lineInfo.get(line.id)?.usable) line.stopIds.forEach(s => active.add(s));
  const stops = t.stops.filter(s => active.has(s.id));

  const BS = B.DEMAND_BLOCK_SIZE;
  const nb = Math.ceil(size / BS);
  const blocks: Block[] = [];
  for (let by = 0; by < nb; by++) {
    for (let bx = 0; bx < nb; bx++) {
      blocks.push({
        cx: Math.min(size - 1, bx * BS + Math.floor(BS / 2)),
        cy: Math.min(size - 1, by * BS + Math.floor(BS / 2)),
        road: -1,
        res: 0,
        resStops: new Map(),
        attr: { work: 0, school: 0, shop: 0 },
        attrStops: { work: new Map(), school: new Map(), shop: new Map() },
      });
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = grid[y][x];
      const b = tile.building;
      const type = b.type;
      if (type === 'grass' || type === 'empty' || type === 'water' || type === 'road' || type === 'tree') continue;
      const res = b.population || 0;
      let work = b.jobs || 0;
      if (work === 0 && tile.zone === 'none' && !b.abandoned) work = BUILDING_STATS[type]?.maxJobs ?? 0;
      const shop = tile.zone === 'commercial' ? (b.jobs || 0) : 0;
      const school = type === 'school' ? B.SCHOOL_SEATS.school : type === 'university' ? B.SCHOOL_SEATS.university : 0;
      if (res === 0 && work === 0 && shop === 0 && school === 0) continue;

      let near = -1;
      let nearD = B.WALK_RADIUS + 1;
      for (const s of stops) {
        const d = Math.abs(s.x - x) + Math.abs(s.y - y);
        if (d < nearD) { nearD = d; near = s.id; }
      }
      const blk = blocks[Math.floor(y / BS) * nb + Math.floor(x / BS)];
      blk.res += res;
      blk.attr.work += work;
      blk.attr.shop += shop;
      blk.attr.school += school;
      if (near >= 0) {
        if (res) addTo(blk.resStops, near, res);
        if (work) addTo(blk.attrStops.work, near, work);
        if (shop) addTo(blk.attrStops.shop, near, shop);
        if (school) addTo(blk.attrStops.school, near, school);
      }
    }
  }

  // Representative road tile per block: nearest road to its center
  for (const blk of blocks) {
    if (blk.res === 0 && blk.attr.work === 0 && blk.attr.school === 0 && blk.attr.shop === 0) continue;
    let best = -1;
    let bestD = Infinity;
    const R = BS;
    for (let y = Math.max(0, blk.cy - R); y <= Math.min(size - 1, blk.cy + R); y++) {
      for (let x = Math.max(0, blk.cx - R); x <= Math.min(size - 1, blk.cx + R); x++) {
        if (!isRoad[y * size + x]) continue;
        const d = Math.abs(x - blk.cx) + Math.abs(y - blk.cy);
        if (d < bestD) { bestD = d; best = y * size + x; }
      }
    }
    blk.road = best;
  }

  const traffic = new Float32Array(N);
  const acc = new Float32Array(N);
  const parent = new Int32Array(N);
  const order = new Int32Array(N);
  const carTime = new Float32Array(N);
  const flows = new Map<string, number>();
  let rTransit = 0;
  let rCar = 0;
  let rWalk = 0;
  const walkAccess = 2 * 2 * B.WALK_TICKS_PER_TILE; // average walk of 2 tiles at each end
  const h = ((hour % 24) + 24) % 24;

  const destBlocks = blocks.map((b, i) => i).filter(i => {
    const b = blocks[i];
    return b.attr.work > 0 || b.attr.shop > 0 || b.attr.school > 0;
  });

  for (const blkO of blocks) {
    if (blkO.res <= 0) continue;
    let reached = 0;
    if (blkO.road >= 0) {
      reached = roadBfsTree(isRoad, size, blkO.road, parent, order);
      carTime[blkO.road] = 0;
      for (let k = 1; k < reached; k++) {
        const n = order[k];
        carTime[n] = carTime[parent[n]] + (c.congestion[n] || 1) / B.CAR_SPEED;
      }
      for (let k = 0; k < reached; k++) acc[order[k]] = 0;
    }
    const resCov = [...blkO.resStops.entries()];

    for (const p of PURPOSES) {
      const P = blkO.res * B.TRIP_RATES[p];
      let denom = 0;
      for (const di of destBlocks) {
        const d = blocks[di];
        if (d.attr[p] <= 0) continue;
        denom += d.attr[p] * Math.exp(-(Math.abs(d.cx - blkO.cx) + Math.abs(d.cy - blkO.cy)) / B.GRAVITY_DISTANCE);
      }
      if (denom <= 0) continue;
      const perTick = (P / denom) * (PROFILES[p].out[h] + PROFILES[p].ret[h]) / TICKS_PER_HOUR;
      const outShare = PROFILES[p].out[h] / Math.max(1e-9, PROFILES[p].out[h] + PROFILES[p].ret[h]);

      for (const di of destBlocks) {
        const blkD = blocks[di];
        if (blkD.attr[p] <= 0) continue;
        const dist = Math.abs(blkD.cx - blkO.cx) + Math.abs(blkD.cy - blkO.cy);
        const trips = perTick * blkD.attr[p] * Math.exp(-dist / B.GRAVITY_DISTANCE);
        if (trips <= 1e-6) continue;
        if (dist <= B.WALK_TRIP_MAX_DISTANCE) { rWalk += trips; continue; }

        const carOk = blkO.road >= 0 && blkD.road >= 0 && parent[blkD.road] !== -1;
        const tCar = carOk ? carTime[blkD.road] + B.CAR_PARKING_PENALTY : Infinity;

        // Transit share over covered stop pairs
        let transitTrips = 0;
        const attrCov = blkD.attrStops[p];
        if (resCov.length && attrCov.size) {
          for (const [so, popO] of resCov) {
            const fo = popO / blkO.res;
            const costs = c.transitCost.get(so);
            if (!costs) continue;
            for (const [sd, aD] of attrCov) {
              if (sd === so) continue;
              const tt = costs.get(sd);
              if (tt === undefined) continue;
              const tTransit = tt + walkAccess;
              const pt = carOk ? 1 / (1 + Math.exp(B.MODE_CHOICE_BETA * (tTransit / tCar - 1) + B.CAR_BIAS)) : 1;
              const share = fo * (aD / blkD.attr[p]) * pt;
              if (share <= 0) continue;
              const n = trips * share;
              transitTrips += n;
              const kOut = `${so}>${sd}`;
              const kRet = `${sd}>${so}`;
              flows.set(kOut, (flows.get(kOut) ?? 0) + n * outShare);
              flows.set(kRet, (flows.get(kRet) ?? 0) + n * (1 - outShare));
            }
          }
        }
        rTransit += transitTrips;
        const carTrips = trips - transitTrips;
        if (carOk) {
          rCar += carTrips;
          acc[blkD.road] += carTrips;
        } else {
          rWalk += carTrips;
        }
      }
    }
    // Push accumulated car volume up the BFS tree (each tile carries all trips passing through it)
    if (blkO.road >= 0) {
      for (let k = reached - 1; k > 0; k--) {
        const n = order[k];
        if (acc[n] === 0) continue;
        traffic[n] += acc[n];
        acc[parent[n]] += acc[n];
      }
      traffic[blkO.road] += acc[blkO.road];
    }
  }

  // Congestion (BPR), smoothed so it does not jump
  for (let i = 0; i < N; i++) {
    const ratio = traffic[i] / B.ROAD_CAPACITY;
    const target = Math.min(B.MAX_CONGESTION_FACTOR, 1 + B.CONGESTION_ALPHA * Math.pow(ratio, B.CONGESTION_POWER));
    c.congestion[i] = isRoad[i] ? c.congestion[i] + (target - c.congestion[i]) * 0.5 : 1;
  }
  c.traffic = traffic;
  c.flows = [...flows.entries()].map(([k, rate]) => {
    const [o, d] = k.split('>').map(Number);
    return { o, d, rate };
  });
  c.rates = { transit: rTransit, car: rCar, walk: rWalk };
}

// ---------------------------------------------------------------------------
// Buses
// ---------------------------------------------------------------------------

interface TickCounters {
  boardings: number;
  delivered: number;
  fares: number;
  lineBoardings: Record<number, number>;
}

function loadOf(bus: Bus) {
  let s = 0;
  for (const k in bus.load) s += bus.load[k];
  return s;
}

function serveStop(bus: Bus, line: BusLine, stopId: number, dirAfter: 1 | -1, waiting: TransitState['waiting'], c: Derived, cnt: TickCounters) {
  let moved = 0;
  // Alight
  for (const key of Object.keys(bus.load)) {
    const sep = key.indexOf('>');
    const alight = Number(key.slice(0, sep));
    if (alight !== stopId) continue;
    const dest = Number(key.slice(sep + 1));
    const n = bus.load[key];
    delete bus.load[key];
    moved += n;
    if (dest === stopId) cnt.delivered += n;
    else {
      const w = (waiting[stopId] = waiting[stopId] ?? {});
      w[dest] = (w[dest] ?? 0) + n;
    }
  }
  // Board
  const w = waiting[stopId];
  const hops = c.nextHop.get(stopId);
  if (w && hops) {
    let cap = B.BUS_CAPACITY - loadOf(bus);
    for (const dKey of Object.keys(w)) {
      if (cap <= 0.01) break;
      const dest = Number(dKey);
      const hop = hops.get(dest);
      if (!hop || hop.line !== line.id || (!line.loop && hop.dir !== dirAfter)) continue;
      const n = Math.min(w[dest], cap);
      if (n <= 0) continue;
      w[dest] -= n;
      if (w[dest] < 0.01) delete w[dest];
      cap -= n;
      moved += n;
      const key = `${hop.alight}>${dest}`;
      bus.load[key] = (bus.load[key] ?? 0) + n;
      cnt.boardings += n;
      cnt.fares += n * B.FARE;
      cnt.lineBoardings[line.id] = (cnt.lineBoardings[line.id] ?? 0) + n;
    }
  }
  bus.lastStop = stopId;
  bus.dwell = Math.round(B.DWELL_BASE + moved * B.DWELL_PER_PASSENGER);
}

function moveBus(bus: Bus, line: BusLine, waiting: TransitState['waiting'], c: Derived, cnt: TickCounters) {
  if (bus.dwell > 0) { bus.dwell--; return; }
  const L = line.path.length - 1;
  if (L <= 0) return;
  const eps = 1e-6;
  const tileAt = line.path[Math.max(0, Math.min(L, Math.round(bus.pos) % (L + 1)))];
  let budget = B.BUS_SPEED / (c.congestion[tileAt.y * c.size + tileAt.x] || 1);

  for (let guard = 0; guard < 4 && budget > eps; guard++) {
    // Nearest stop ahead
    let bestK = -1;
    let bestD = Infinity;
    for (let k = 0; k < line.stopPathIdx.length; k++) {
      const idx = line.stopPathIdx[k];
      let d: number;
      if (line.loop) {
        d = (idx - bus.pos + L) % L;
        if (d <= eps) d = L;
      } else {
        d = (idx - bus.pos) * bus.dir;
        if (d <= eps) continue;
      }
      if (d < bestD) { bestD = d; bestK = k; }
    }
    if (bestK < 0) {
      // End of a back-and-forth line: turn around
      bus.dir = bus.dir === 1 ? -1 : 1;
      continue;
    }
    if (bestD > budget) {
      bus.pos = line.loop ? (bus.pos + budget) % L : bus.pos + bus.dir * budget;
      return;
    }
    budget -= bestD;
    bus.pos = line.stopPathIdx[bestK];
    let dirAfter = bus.dir;
    if (!line.loop) {
      if (bus.dir === 1 && bus.pos >= L - eps) dirAfter = -1;
      if (bus.dir === -1 && bus.pos <= eps) dirAfter = 1;
    }
    serveStop(bus, line, line.stopIds[bestK], dirAfter, waiting, c, cnt);
    bus.dir = dirAfter;
    return; // dwell at the stop
  }
}

// ---------------------------------------------------------------------------
// Main step
// ---------------------------------------------------------------------------

export function stepTransit(
  transit: TransitState,
  grid: Tile[][],
  size: number,
  hour: number,
  cityId: string
): { transit: TransitState; money: number } {
  const c = getCache(cityId, size);
  c.tick++;
  let t = transit;

  if (t.lines.length === 0) {
    if (t.lastHour !== hour) t = { ...t, lastHour: hour };
    return { transit: t, money: 0 };
  }

  // Re-route after road changes
  if (c.tick - c.lastRouteTick >= B.ROUTE_REFRESH_TICKS) {
    c.lastRouteTick = c.tick;
    t = rerouteLines(t, grid, size);
  }

  const networkChanged = c.networkVersion !== t.networkVersion;
  if (networkChanged || c.tick - c.lastDemandTick >= B.DEMAND_UPDATE_TICKS) {
    computeNetwork(t, c);
    computeDemand(t, grid, c, hour);
    computeNetwork(t, c); // timings with the fresh congestion
    c.networkVersion = t.networkVersion;
    c.lastDemandTick = c.tick;
  }

  // Copy mutable parts
  const waiting: TransitState['waiting'] = {};
  for (const k of Object.keys(t.waiting)) waiting[Number(k)] = { ...t.waiting[Number(k)] };
  const buses = t.buses.map(b => ({ ...b, load: { ...b.load } }));
  const lineById = new Map(t.lines.map(l => [l.id, l]));

  // New passengers
  for (const f of c.flows) {
    const w = (waiting[f.o] = waiting[f.o] ?? {});
    w[f.d] = (w[f.d] ?? 0) + f.rate;
  }

  // Buses
  const cnt: TickCounters = { boardings: 0, delivered: 0, fares: 0, lineBoardings: {} };
  for (const bus of buses) {
    const line = lineById.get(bus.lineId);
    if (!line || !lineUsable(line)) continue;
    moveBus(bus, line, waiting, c, cnt);
  }

  // Waiting passengers give up and go by car
  let lost = 0;
  for (const k of Object.keys(waiting)) {
    const w = waiting[Number(k)];
    for (const d of Object.keys(w)) {
      const v = w[Number(d)];
      const g = v * B.GIVE_UP_RATE;
      lost += g;
      const nv = v - g;
      if (nv < 0.02) { lost += nv; delete w[Number(d)]; } else w[Number(d)] = nv;
    }
    if (Object.keys(w).length === 0) delete waiting[Number(k)];
  }

  const busCount = t.lines.reduce((s, l) => s + l.buses, 0);
  const upkeep = (busCount * B.BUS_UPKEEP_PER_DAY) / 30;

  // Day stats (roll over at midnight)
  let today = t.today ?? emptyDayStats();
  let yesterday = t.yesterday;
  let lineBoardings = t.lineBoardings ?? {};
  let lineBoardingsYesterday = t.lineBoardingsYesterday ?? {};
  if (hour < t.lastHour) {
    yesterday = today;
    today = emptyDayStats();
    lineBoardingsYesterday = lineBoardings;
    lineBoardings = {};
  }
  today = {
    boardings: today.boardings + cnt.boardings,
    delivered: today.delivered + cnt.delivered,
    lost: today.lost + lost,
    fares: today.fares + cnt.fares,
    upkeep: today.upkeep + upkeep,
    transitTrips: today.transitTrips + c.rates.transit,
    carTrips: today.carTrips + c.rates.car,
    walkTrips: today.walkTrips + c.rates.walk,
  };
  lineBoardings = { ...lineBoardings };
  for (const [id, n] of Object.entries(cnt.lineBoardings)) lineBoardings[Number(id)] = (lineBoardings[Number(id)] ?? 0) + n;

  return {
    transit: { ...t, waiting, buses, today, yesterday, lineBoardings, lineBoardingsYesterday, lastHour: hour },
    money: cnt.fares - upkeep,
  };
}

/** Total waiting passengers at a stop */
export function waitingAt(t: TransitState, stopId: number): number {
  const w = t.waiting[stopId];
  if (!w) return 0;
  let s = 0;
  for (const k in w) s += w[k];
  return s;
}

export function busLoad(bus: Bus): number {
  return loadOf(bus);
}
