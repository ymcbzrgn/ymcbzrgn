/**
 * The part of the day, for the phone's wallpaper and greeting. The wallpaper is a gradient per part
 * (see MobileOS.css), so the lock screen and the home screen share one sky.
 */
import type { StringKey } from '../../os/i18n/full';

export type DayPart = 'morning' | 'day' | 'evening' | 'night';

export function dayPart(date: Date = new Date()): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h < 17 && h >= 11) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export const GREETING_KEY: Record<DayPart, StringKey> = {
  morning: 'greetMorning',
  day: 'greetAfternoon',
  evening: 'greetEvening',
  night: 'greetEvening', // ("good night" is a farewell)
};
