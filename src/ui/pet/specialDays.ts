/**
 * Days the twin has something to say about. It greets the visitor once on such a day (first time it
 * runs in) and, for the more cheerful ones, celebrates. Add `?day=MM-DD` to the address to see one.
 */
export interface SpecialDay {
  id: string;
  en: string;
  tr: string;
  anim: 'celebrate' | 'wave' | 'think' | 'idle' | 'dance';
  /** a day of remembrance: no party, no jokes */
  solemn?: boolean;
}

const FIXED: Record<string, SpecialDay> = {
  '01-01': { id: 'new-year', en: 'Happy New Year!', tr: 'Yeni yılın kutlu olsun!', anim: 'celebrate' },
  '03-14': { id: 'pi', en: 'Happy Pi Day! 3.14159…', tr: 'Pi Günü kutlu olsun! 3,14159…', anim: 'think' },
  '04-23': { id: 'children', en: 'Happy 23 April, Children’s Day in Turkey!', tr: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun!', anim: 'celebrate' },
  '05-19': { id: 'youth', en: 'Happy 19 May, Youth and Sports Day in Turkey!', tr: '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı kutlu olsun!', anim: 'celebrate' },
  '08-30': { id: 'victory', en: 'Happy Victory Day (30 August, Turkey)!', tr: '30 Ağustos Zafer Bayramı kutlu olsun!', anim: 'celebrate' },
  '10-29': { id: 'republic', en: 'Happy Republic Day (29 October, Turkey)!', tr: '29 Ekim Cumhuriyet Bayramı kutlu olsun!', anim: 'celebrate' },
  '10-31': { id: 'halloween', en: 'Happy Halloween! Boo!', tr: 'Cadılar Bayramı kutlu olsun! Bu!', anim: 'wave' },
  '11-10': { id: 'remembrance', en: '10 November. Remembering Atatürk with respect.', tr: '10 Kasım. Saygıyla anıyoruz.', anim: 'idle', solemn: true },
  '12-31': { id: 'last-day', en: 'Last day of the year. Merge your branches!', tr: 'Yılın son günü. Branch’lerini merge et!', anim: 'wave' },
};

const PROGRAMMERS: SpecialDay = {
  id: 'programmers',
  en: 'Happy Programmers’ Day! The 256th day of the year.',
  tr: 'Programcılar Günü kutlu olsun! Yılın 256. günü.',
  anim: 'dance',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Day number in the year (1-366) for a month/day. */
function dayOfYear(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);
}

/** The special day for a date (or the `?day=MM-DD` override), if there is one. */
export function specialDayFor(now = new Date(), override?: string | null): SpecialDay | null {
  const key = override && /^\d{2}-\d{2}$/.test(override) ? override : `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (FIXED[key]) return FIXED[key];
  const [m, d] = key.split('-').map(Number);
  return dayOfYear(now.getFullYear(), m, d) === 256 ? PROGRAMMERS : null;
}

/** "morning" | "day" | "dusk" | "night" for the visitor's local clock. */
export function timeOfDay(now = new Date()): 'dawn' | 'day' | 'dusk' | 'night' {
  const h = now.getHours();
  if (h < 5 || h >= 22) return 'night';
  if (h < 8) return 'dawn';
  if (h >= 18) return 'dusk';
  return 'day';
}
