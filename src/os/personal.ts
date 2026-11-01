/**
 * A personal link: yamacbezirgan.com/?for=Acme greets "Acme" by name (the welcome window, the twin and
 * the recruiter card). The value only ever shows up as plain text, and it is cleaned first: letters,
 * digits, spaces and . & ' - _ , at most 40 characters. "acme-corp" reads as "Acme Corp".
 */
export function cleanGuest(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.replace(/[^\p{L}\p{N} .&'’_-]/gu, ' ').replace(/\s+/g, ' ').trim();
  // a slug ("acme-corp", "acme_corp"): dashes and underscores were spaces
  if (!value.includes(' ') && value === value.toLocaleLowerCase() && /[_-]/.test(value)) {
    value = value.replace(/[_-]+/g, ' ').trim();
  }
  value = value.slice(0, 40).trim();
  if (!/[\p{L}\p{N}]/u.test(value)) return null;
  // all lower case reads better with capitals
  if (value === value.toLocaleLowerCase()) {
    value = value.replace(/(^|\s)(\p{L})/gu, (_m, space: string, letter: string) => space + letter.toLocaleUpperCase());
  }
  return value;
}

/** Who the link was made for, or null. Read once, when the page loads. */
export const guest: string | null =
  typeof window === 'undefined' ? null : cleanGuest(new URLSearchParams(window.location.search).get('for'));

/** "Hi {name}!" with the name put in, or the plain text when nobody is named. */
export function forGuest(withName: string, plain: string): string {
  return guest ? withName.replace('{name}', guest) : plain;
}
