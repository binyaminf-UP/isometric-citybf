/**
 * מבני הנתונים של מערכת התחב"צ (נשמרים בתוך GameState.transit).
 */

export interface GridPoint {
  x: number;
  y: number;
}

export interface TransitStop {
  id: number;
  x: number;
  y: number;
}

export interface BusLine {
  id: number;
  name: string;
  color: string;
  /** Stops in order. For a loop the first stop is not repeated at the end. */
  stopIds: number[];
  loop: boolean;
  /** Road tiles from the first stop to the last (for a loop: back to the first, so path[0] equals the last tile) */
  path: GridPoint[];
  /** Index in `path` of each stop in `stopIds` */
  stopPathIdx: number[];
  /** Number of buses assigned (= frequency) */
  buses: number;
  /** True when a stop is no longer on a road or two stops lost their road connection */
  broken: boolean;
}

export interface Bus {
  id: number;
  lineId: number;
  /** Position along the line path (float, in tiles) */
  pos: number;
  /** +1 forward along the path, -1 backward (back-and-forth lines) */
  dir: 1 | -1;
  /** Passengers on board, keyed "alightStopId>finalDestStopId" */
  load: Record<string, number>;
  /** Ticks left standing at a stop */
  dwell: number;
  /** Last stop served (to avoid serving it twice) */
  lastStop: number;
}

export interface LineDraft {
  /** Tapped road tiles in order */
  tiles: GridPoint[];
  /** Road path segments between consecutive tiles (segments[i] connects tiles[i] -> tiles[i+1]) */
  segments: GridPoint[][];
  loop: boolean;
  /** Last error code for the UI */
  error?: 'not_road' | 'no_connection' | 'duplicate' | null;
}

export interface TransitDayStats {
  boardings: number;
  delivered: number;
  /** Passengers who gave up waiting and went by car */
  lost: number;
  fares: number;
  upkeep: number;
  /** Trips generated per mode during the day */
  transitTrips: number;
  carTrips: number;
  walkTrips: number;
}

export interface TransitState {
  version: 1;
  stops: TransitStop[];
  lines: BusLine[];
  buses: Bus[];
  /** Waiting passengers: stopId -> finalDestStopId -> count (fractional) */
  waiting: Record<number, Record<number, number>>;
  nextId: number;
  draft: LineDraft | null;
  /** Bumped whenever lines/stops/buses change, so derived data is recomputed */
  networkVersion: number;
  today: TransitDayStats;
  yesterday: TransitDayStats | null;
  /** Boardings per line today / yesterday */
  lineBoardings: Record<number, number>;
  lineBoardingsYesterday: Record<number, number>;
  lastHour: number;
  /** Fractional money not yet added to the city budget */
  moneyCarry?: number;
}

export function emptyDayStats(): TransitDayStats {
  return { boardings: 0, delivered: 0, lost: 0, fares: 0, upkeep: 0, transitTrips: 0, carTrips: 0, walkTrips: 0 };
}

export function createTransitState(): TransitState {
  return {
    version: 1,
    stops: [],
    lines: [],
    buses: [],
    waiting: {},
    nextId: 1,
    draft: null,
    networkVersion: 0,
    today: emptyDayStats(),
    yesterday: null,
    lineBoardings: {},
    lineBoardingsYesterday: {},
    lastHour: 0,
  };
}
