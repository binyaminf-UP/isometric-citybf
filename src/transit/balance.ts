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

// ===== ליבת תחב"צ (שלב 2) =====
// יחידות זמן: tick (כ-19 טיקים לשעה במחזור היום הנוכחי, 450 טיקים ליום).

/** מחיר אוטובוס (קנייה) */
export const BUS_PRICE = 1500;
/** החזר במכירת אוטובוס (חלק מהמחיר) */
export const BUS_SELL_REFUND = 0.5;
/** תחזוקה לאוטובוס ליום משחק כלכלי (30 טיקים) */
export const BUS_UPKEEP_PER_DAY = 12;
/** עלות תחנה חדשה */
export const STOP_COST = 100;
/** מחיר נסיעה (הכנסה לכל עלייה לאוטובוס) */
export const FARE = 1;
/** קיבולת אוטובוס */
export const BUS_CAPACITY = 50;
/** מהירות אוטובוס בכביש פנוי (משבצות לטיק) */
export const BUS_SPEED = 1.5;
/** מהירות רכב פרטי בכביש פנוי (משבצות לטיק) */
export const CAR_SPEED = 2;
/** זמן עמידה בסיסי בתחנה, ותוספת לכל נוסע שעולה או יורד (טיקים) */
export const DWELL_BASE = 1;
export const DWELL_PER_PASSENGER = 0.04;
/** רדיוס הליכה לתחנה (משבצות, מרחק מנהטן) */
export const WALK_RADIUS = 4;
/** זמן הליכה למשבצת (טיקים) */
export const WALK_TICKS_PER_TILE = 1;
/** קנס זמן על החלפת קו (טיקים) */
export const TRANSFER_PENALTY = 8;
/** זמן חיפוש חניה והליכה מהרכב (טיקים) */
export const CAR_PARKING_PENALTY = 12;
/** משקל זמן ההמתנה בתחנה בהשוואה לזמן נסיעה (השעון דחוס, ולכן המתנה "נספרת" בחצי) */
export const WAIT_WEIGHT = 0.5;
/**
 * בחירת אמצעי: לפי היחס בין זמן התחב"צ לזמן הרכב.
 * חלק התחב"צ = 1 / (1 + e^(BETA × (יחס - 1) + CAR_BIAS)).
 * ביחס 1 (זמן שווה) כ-38%, ביחס 1.5 כ-8%, ביחס 0.7 כ-67%.
 */
export const MODE_CHOICE_BETA = 4;
/** העדפה קבועה לרכב (נוחות) */
export const CAR_BIAS = 0.5;
/** שיעור הנוסעים הממתינים שמוותרים לרכב בכל טיק */
export const GIVE_UP_RATE = 0.012;
/** קיבולת משבצת כביש (רכבים לטיק) לפני שנוצר עומס */
export const ROAD_CAPACITY = 25;
/** נוסחת העומס (BPR): זמן = חופשי × (1 + ALPHA × (נפח/קיבולת)^POWER) */
export const CONGESTION_ALPHA = 0.6;
export const CONGESTION_POWER = 3;
/** האטה מקסימלית בגלל עומס */
export const MAX_CONGESTION_FACTOR = 4;
/** נסיעה קצרה מזה (משבצות) נעשית ברגל */
export const WALK_TRIP_MAX_DISTANCE = 5;
/** גודל בלוק לחישוב ביקושים (משבצות) */
export const DEMAND_BLOCK_SIZE = 5;
/** טווח המשיכה במודל הכבידה (משבצות) */
export const GRAVITY_DISTANCE = 18;
/** נסיעות ליום לתושב לפי מטרה */
export const TRIP_RATES = { work: 0.45, school: 0.18, shop: 0.3 } as const;
/** מקומות לימוד (אטרקציה) */
export const SCHOOL_SEATS = { school: 300, university: 1200 } as const;
/** כל כמה טיקים מחשבים מחדש ביקושים ועומסים */
export const DEMAND_UPDATE_TICKS = 8;
/** כל כמה טיקים בודקים מסלולי קווים מול שינויים בכבישים */
export const ROUTE_REFRESH_TICKS = 30;
/** טיקים ביום (מחזור השעון הנוכחי) */
export const TICKS_PER_DAY = 450;
export const LINE_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#ea580c', '#db2777', '#65a30d', '#4f46e5'];
