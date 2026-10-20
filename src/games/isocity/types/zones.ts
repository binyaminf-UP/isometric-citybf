/**
 * IsoCity Zone Types
 */

export type ZoneType = 'none' | 'residential' | 'commercial' | 'industrial';

/**
 * Residential zoning density (ייעוד מגורים). A binding ceiling chosen by the player.
 * Growth inside the designation stays automatic, but buildings never densify beyond it.
 * Logic lives in src/transit/zoning.ts.
 */
export type ResidentialDensity =
  | 'single'        // בית יחיד
  | 'townhouse'     // בתים טוריים
  | 'mixed'         // מגורים מעל מסחר
  | 'multistory'    // רב-קומות
  | 'station_tower'; // מגדל ליד תחנה
