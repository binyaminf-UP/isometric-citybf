/**
 * ייעוד מגורים (zoneDensity): תקרת צפיפות מחייבת שהשחקן קובע.
 * לוגיקה טהורה, בלי React.
 */
import type { BuildingType, Tile } from '@/games/isocity/types';
import type { ResidentialDensity } from '@/games/isocity/types/zones';
import { DEFAULT_ZONE_DENSITY, LEGACY_EMPTY_ZONE_DENSITY } from './balance';

export const DENSITY_ORDER: ResidentialDensity[] = ['single', 'townhouse', 'mixed', 'multistory', 'station_tower'];

export interface DensityInfo {
  /** English source string (translated via src/i18n/he.ts) */
  label: string;
  /** Selectable in the zoning tool. Types without buildings yet arrive in "סוגי מגורים חדשים". */
  available: boolean;
  /** Overlay color */
  color: string;
}

export const DENSITY_INFO: Record<ResidentialDensity, DensityInfo> = {
  single:        { label: 'Single-family',     available: true,  color: 'rgba(134, 239, 172, 0.55)' },
  townhouse:     { label: 'Townhouses',        available: false, color: 'rgba(250, 204, 21, 0.55)' },
  mixed:         { label: 'Homes over shops',  available: false, color: 'rgba(251, 146, 60, 0.55)' },
  multistory:    { label: 'Multi-story',       available: true,  color: 'rgba(59, 130, 246, 0.55)' },
  station_tower: { label: 'Tower by station',  available: false, color: 'rgba(168, 85, 247, 0.55)' },
};

/**
 * Buildings each designation allows, from smallest to largest.
 * Growth picks along this ladder by level; it never goes past the last entry.
 * The first entry is what spawns on empty land.
 * townhouse / mixed / station_tower are provisional until their building types exist.
 */
export const RESIDENTIAL_LADDER: Record<ResidentialDensity, BuildingType[]> = {
  single:        ['house_small', 'house_medium', 'mansion'],
  townhouse:     ['house_small', 'house_medium'],
  mixed:         ['house_small', 'house_medium'],
  multistory:    ['house_small', 'house_medium', 'apartment_low', 'apartment_high'],
  station_tower: ['house_small', 'house_medium', 'apartment_low', 'apartment_high'],
};

/** Overall size order of residential buildings (used to tell "bigger than allowed") */
const RESIDENTIAL_RANK: Partial<Record<BuildingType, number>> = {
  house_small: 0,
  house_medium: 1,
  mansion: 2,
  apartment_low: 3,
  apartment_high: 4,
};

export function isResidentialBuilding(type: BuildingType): boolean {
  return RESIDENTIAL_RANK[type] !== undefined;
}

export function residentialRank(type: BuildingType): number {
  return RESIDENTIAL_RANK[type] ?? -1;
}

/** Designation of a residential tile (falls back safely for tiles that were never migrated) */
export function getZoneDensity(tile: Tile): ResidentialDensity {
  return tile.zoneDensity ?? inferDensityFromBuilding(tile.building.type);
}

export function getResidentialLadder(density: ResidentialDensity): BuildingType[] {
  return RESIDENTIAL_LADDER[density] ?? RESIDENTIAL_LADDER.multistory;
}

export function isAllowedInDensity(density: ResidentialDensity, type: BuildingType): boolean {
  return getResidentialLadder(density).includes(type);
}

/** Building is larger than the designation allows ("existing rights" after down-zoning) */
export function exceedsDensity(density: ResidentialDensity, type: BuildingType): boolean {
  if (!isResidentialBuilding(type) || isAllowedInDensity(density, type)) return false;
  const ladder = getResidentialLadder(density);
  const maxRank = Math.max(...ladder.map(residentialRank));
  return residentialRank(type) > maxRank;
}

export function inferDensityFromBuilding(type: BuildingType): ResidentialDensity {
  if (type === 'house_small' || type === 'house_medium' || type === 'mansion') return 'single';
  if (type === 'apartment_low' || type === 'apartment_high') return 'multistory';
  return LEGACY_EMPTY_ZONE_DENSITY;
}

export function sanitizeDensity(value: unknown): ResidentialDensity {
  return typeof value === 'string' && (DENSITY_ORDER as string[]).includes(value) && DENSITY_INFO[value as ResidentialDensity].available
    ? (value as ResidentialDensity)
    : DEFAULT_ZONE_DENSITY;
}

/**
 * Save migration: residential tiles without a designation get one from the building on them,
 * so nothing changes on load. Placeholder ('empty') tiles take their 2x2 building's designation.
 * Mutates the grid. Returns the number of tiles updated.
 */
export function migrateZoneDensity(grid: Tile[][]): number {
  let changed = 0;
  const pending: Tile[] = [];
  for (const row of grid) {
    for (const tile of row) {
      if (!tile || tile.zone !== 'residential' || tile.zoneDensity !== undefined) continue;
      if (tile.building?.type === 'empty') {
        pending.push(tile);
        continue;
      }
      tile.zoneDensity = inferDensityFromBuilding(tile.building?.type);
      changed++;
    }
  }
  // Residential multi-tile buildings are at most 2x2: the origin is up/left of the placeholder
  for (const tile of pending) {
    let density: ResidentialDensity | undefined;
    for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1]]) {
      const origin = grid[tile.y + dy]?.[tile.x + dx];
      if (origin && origin.zone === 'residential' && isResidentialBuilding(origin.building.type) && residentialRank(origin.building.type) >= 2) {
        density = origin.zoneDensity ?? inferDensityFromBuilding(origin.building.type);
        break;
      }
    }
    tile.zoneDensity = density ?? LEGACY_EMPTY_ZONE_DENSITY;
    changed++;
  }
  return changed;
}
