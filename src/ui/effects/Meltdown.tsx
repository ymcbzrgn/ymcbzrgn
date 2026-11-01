/**
 * The terminal's `rm -rf /` prank: the desktop shakes, a kernel panic scrolls by, the machine
 * "reboots" and everything is exactly where it was. Nothing is ever touched. Click or Esc skips it.
 */
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../os/i18n/full';
import { sfx } from '../../os/sound/sfx';
import './Meltdown.css';

const PANIC = [
  'yamac-os: Kernel panic - not syncing: rm -rf / detected',
  'CPU: 0 PID: 1337 Comm: rm Not tainted 6.6.6-portfolio #1',
  'Hardware name: Browser (Chromium, Firefox or Safari)',
  'Call Trace:',
  ' <TASK>',
  '  dump_stack_lvl+0x42/0x60',
  '  panic+0x2f3/0x320',
  '  vfs_unlink_everything+0xdead/0xbeef',
  '  do_rmdir_slash+0x1/0x1',
  ' </TASK>',
  '---[ end Kernel panic - not syncing: it is a joke ]---',
];

const REASSURE = {
  en: 'Just kidding. Every file is exactly where you left it.',
  tr: 'Şaka şaka. Bütün dosyalar bıraktığın yerde.',
};

type Phase = 'shake' | 'panic' | 'boot' | 'out';

export default function Meltdown({ onDone }: { onDone(): void }) {
  const lang = useLang();
  const reduced = useRef(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [phase, setPhase] = useState<Phase>(reduced.current ? 'panic' : 'shake');
  const [lines, setLines] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const desk = document.querySelector('.desktop-container');
    const speed = reduced.current ? 0.4 : 1;

    if (!reduced.current) desk?.classList.add('desktop--melt');
    sfx('crash');
    at(reduced.current ? 0 : 700 * speed, () => {
      desk?.classList.remove('desktop--melt');
      setPhase('panic');
      PANIC.forEach((_, i) => at(i * 170 * speed, () => setLines(i + 1)));
    });
    const panicEnd = (reduced.current ? 0 : 700) + (PANIC.length * 170 + 1500) * speed;
    at(panicEnd, () => {
      setPhase('boot');
      sfx('boot');
    });
    at(panicEnd + 1700 * speed, () => setPhase('out'));
    at(panicEnd + 2100 * speed, () => doneRef.current());

    const skip = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        doneRef.current();
      }
    };
    window.addEventListener('keydown', skip, true);
    return () => {
      timers.forEach(window.clearTimeout);
      desk?.classList.remove('desktop--melt');
      window.removeEventListener('keydown', skip, true);
    };
  }, []);

  if (phase === 'shake') return <div className="melt melt--clear" aria-hidden="true" />;

  return (
    <div className={`melt${phase === 'panic' ? ' melt--panic' : ''}${phase === 'out' ? ' melt--out' : ''}`} role="alert" onClick={() => doneRef.current()}>
      {phase === 'panic' && (
        <pre className="melt__panic">
          {PANIC.slice(0, lines).join('\n')}
          {lines >= PANIC.length && <strong>{'\n\n' + REASSURE[lang]}</strong>}
          <span className="melt__cursor">█</span>
        </pre>
      )}
      {(phase === 'boot' || phase === 'out') && (
        <div className="melt__boot">
          <div className="melt__logo">ymcbzrgn</div>
          <div className="melt__bar">
            <span />
          </div>
          <div className="melt__msg">{lang === 'tr' ? 'Yeniden başlatılıyor…' : 'Rebooting…'}</div>
        </div>
      )}
    </div>
  );
}
