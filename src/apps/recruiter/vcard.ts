/**
 * "Save contact": a vCard (.vcf) that phones and address books open as a new contact.
 * No phone number on purpose: add a `TEL` line below if you want one in it.
 */
import { PROFILE } from '../../os/content/profile';
import type { Lang } from '../../os/i18n/core';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

/** RFC 6350 asks for lines of at most 75 octets: fold longer ones. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 74) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildVCard(lang: Lang): string {
  const role = lang === 'tr' ? 'Yazılım Mühendisi' : 'Software Engineer';
  const note = lang === 'tr' ? 'Yapay zeka platformları, backend ve full-stack.' : 'AI platforms, backend and full-stack.';
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Bezirgan;Yamaç;;;',
    'FN:Yamaç Bezirgan',
    `ORG:${esc(PROFILE.company)}`,
    `TITLE:${esc(role)}`,
    `EMAIL;TYPE=INTERNET,WORK:${PROFILE.email}`,
    `URL:${PROFILE.site}/`,
    `X-SOCIALPROFILE;TYPE=linkedin:${PROFILE.linkedin}`,
    `X-SOCIALPROFILE;TYPE=github:${PROFILE.github}`,
    `NOTE:${esc(note)}`,
    'END:VCARD',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadVCard(lang: Lang): void {
  const blob = new Blob([buildVCard(lang)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Yamac-Bezirgan.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
