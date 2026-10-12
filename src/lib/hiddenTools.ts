import type { Tool } from '@/types/game';

// כלים שמוסתרים מהתפריטים (הסרגל הצדדי, הסרגל התחתון בטלפון והחיפוש).
// המבנים עצמם נשארים בקוד, כך ששמירות קיימות שמכילות אותם ממשיכות לעבוד.
export const HIDDEN_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
  'zone_water', 'zone_land',
  'pond_park', 'park_gate', 'greenhouse_garden', 'mini_golf_course', 'go_kart_track',
  'amphitheater', 'cabin_house', 'mountain_trailhead',
  'baseball_field_small', 'football_field', 'baseball_stadium', 'skate_park', 'bleachers_field',
]);

export function visibleTools(tools: Tool[]): Tool[] {
  return tools.filter((t) => !HIDDEN_TOOLS.has(t));
}
