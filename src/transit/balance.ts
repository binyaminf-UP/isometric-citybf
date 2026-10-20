/**
 * ערכי איזון של מערכת התחב"צ והתכנון. כל מספר חדש נכנס לכאן.
 */
import type { ResidentialDensity } from '@/games/isocity/types/zones';

/** עלות שינוי ייעוד מגורים למשבצת שכבר מסומנת כמגורים (סמלית) */
export const REZONE_COST_PER_TILE = 10;

/** ייעוד ברירת המחדל של כלי המגורים */
export const DEFAULT_ZONE_DENSITY: ResidentialDensity = 'single';

/**
 * ייעוד שמקבלות משבצות מגורים ריקות בשמירה ישנה (לפני שהיה ייעוד).
 * רב-קומות = ההתנהגות הישנה (בלי תקרה), כדי שהעיר לא תשתנה בטעינה.
 */
export const LEGACY_EMPTY_ZONE_DENSITY: ResidentialDensity = 'multistory';
