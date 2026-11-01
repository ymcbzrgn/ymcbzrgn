/** Lower-case, accents removed, Turkish dotless i folded: "Özgeçmiş" -> "ozgecmis". For forgiving searches. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
