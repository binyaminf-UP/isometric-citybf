/**
 * גרף הכבישים: משבצות כביש וגשר, תנועה בארבעה כיוונים.
 */
import type { Tile } from '@/games/isocity/types';
import type { GridPoint } from './types';

export function isRoadTile(tile: Tile | undefined): boolean {
  if (!tile) return false;
  const t = tile.building.type;
  return t === 'road' || t === 'bridge';
}

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

/**
 * Shortest road path from a to b (both must be road tiles), inclusive of both ends.
 * Returns null when not connected.
 */
export function findRoadPath(grid: Tile[][], size: number, a: GridPoint, b: GridPoint): GridPoint[] | null {
  if (!isRoadTile(grid[a.y]?.[a.x]) || !isRoadTile(grid[b.y]?.[b.x])) return null;
  if (a.x === b.x && a.y === b.y) return [{ x: a.x, y: a.y }];
  const n = size * size;
  const parent = new Int32Array(n).fill(-1);
  const start = a.y * size + a.x;
  const goal = b.y * size + b.x;
  parent[start] = start;
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  while (head < tail) {
    const cur = queue[head++];
    if (cur === goal) break;
    const cx = cur % size;
    const cy = (cur - cx) / size;
    for (let k = 0; k < 4; k++) {
      const nx = cx + DX[k];
      const ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const ni = ny * size + nx;
      if (parent[ni] !== -1) continue;
      if (!isRoadTile(grid[ny][nx])) continue;
      parent[ni] = cur;
      queue[tail++] = ni;
    }
  }
  if (parent[goal] === -1) return null;
  const path: GridPoint[] = [];
  let cur = goal;
  while (cur !== start) {
    path.push({ x: cur % size, y: Math.floor(cur / size) });
    cur = parent[cur];
  }
  path.push({ x: a.x, y: a.y });
  path.reverse();
  return path;
}

/**
 * BFS tree over the road graph from `source` (tile index).
 * `order` lists reached nodes in BFS order (parents before children); `parent[source] === source`.
 */
export function roadBfsTree(isRoad: Uint8Array, size: number, source: number, parent: Int32Array, order: Int32Array): number {
  parent.fill(-1);
  parent[source] = source;
  let head = 0;
  let tail = 0;
  order[tail++] = source;
  while (head < tail) {
    const cur = order[head++];
    const cx = cur % size;
    const cy = (cur - cx) / size;
    for (let k = 0; k < 4; k++) {
      const nx = cx + DX[k];
      const ny = cy + DY[k];
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const ni = ny * size + nx;
      if (parent[ni] !== -1 || !isRoad[ni]) continue;
      parent[ni] = cur;
      order[tail++] = ni;
    }
  }
  return tail;
}
