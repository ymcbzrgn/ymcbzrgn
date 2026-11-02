/**
 * Music Player: four chiptune tracks that are synthesised live in the browser (see ./engine and
 * ./tracks), with a spectrum display. Nothing is downloaded, nothing is a recording.
 * The pixel twin dances to whatever plays.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../os/store';
import { useLang } from '../../os/i18n/full';
import { destroyPlayer, getPlayer } from './engine';
import { TRACKS } from './tracks';
import './MusicPlayer.css';

interface MusicPlayerProps {
  windowId: string;
  nodeId?: string;
}

const COPY = {
  en: { playlist: 'Playlist', hint: 'Every sound here is synthesised live in your browser from maths. There are no audio files.', volume: 'Volume', play: 'Play', pause: 'Pause', prev: 'Previous track', next: 'Next track', seek: 'Position' },
  tr: { playlist: 'Çalma listesi', hint: 'Buradaki her ses tarayıcında matematikle canlı üretilir. Ses dosyası yok.', volume: 'Ses düzeyi', play: 'Çal', pause: 'Duraklat', prev: 'Önceki parça', next: 'Sonraki parça', seek: 'Konum' },
} as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const BARS = 16;

export default function MusicPlayer({ windowId }: MusicPlayerProps) {
  const lang = useLang();
  const c = COPY[lang];
  const player = getPlayer();
  const [index, setIndex] = useState(player.trackIndex());
  const [playing, setPlaying] = useState(player.isPlaying());
  const [started, setStarted] = useState(player.isPlaying() || player.position().seconds > 0);
  const [pos, setPos] = useState(player.position());
  const [volume, setVolume] = useState(70);
  const [failed, setFailed] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  const play = useCallback(
    (i: number) => {
      const ok = player.start(i);
      setFailed(!ok);
      if (!ok) return;
      setIndex(player.trackIndex());
      setPlaying(true);
      setStarted(true);
    },
    [player]
  );

  // when a track has run its course, the next one starts
  useEffect(() => {
    player.onEnd(() => play(indexRef.current + 1));
    return () => player.onEnd(null);
  }, [player, play]);

  // minimised: the window still exists, the music goes on. Closed: it is gone, so is the music.
  useEffect(
    () => () => {
      if (!useStore.getState().windows.some((w) => w.id === windowId)) destroyPlayer();
    },
    [windowId]
  );

  // progress + spectrum
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 50 || document.hidden) return;
      last = now;
      setPos(player.position());
      setPlaying(player.isPlaying());
      const el = canvas.current;
      const g = el?.getContext('2d');
      if (!el || !g) return;
      const w = el.width;
      const h = el.height;
      g.clearRect(0, 0, w, h);
      const an = player.analyser();
      const data = new Uint8Array(an ? an.frequencyBinCount : 0);
      if (an && player.isPlaying()) an.getByteFrequencyData(data);
      const gap = 4;
      const bw = Math.floor((w - gap * (BARS - 1)) / BARS);
      const block = 6;
      for (let i = 0; i < BARS; i += 1) {
        const v = data.length ? data[Math.min(data.length - 1, Math.floor(i * 0.9))] / 255 : 0;
        const rows = Math.max(1, Math.round((v * h) / block));
        for (let r = 0; r < rows; r += 1) {
          g.fillStyle = r > rows - 3 ? '#fbbf24' : r > 8 ? '#f472b6' : '#818cf8';
          g.fillRect(i * (bw + gap), h - (r + 1) * block + 1, bw, block - 1);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [player]);

  const toggle = () => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else if (started && player.resume()) {
      setPlaying(true);
    } else play(index);
  };

  const track = TRACKS[index];
  return (
    <div className="mp">
      <div className="mp__screen">
        <canvas ref={canvas} width={320} height={78} aria-hidden="true" />
        <span className={`mp__led${playing ? ' mp__led--on' : ''}`} aria-hidden="true" />
      </div>

      <div className="mp__info" aria-live="polite">
        <div className="mp__title">{track.title}</div>
        <div className="mp__artist">
          {track.artist} · {track.bpm} BPM
        </div>
        <div className="mp__note">{track.note[lang]}</div>
      </div>

      <div className="mp__progress">
        <span>{fmt(pos.seconds)}</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round((pos.seconds / pos.total) * 1000) || 0}
          aria-label={c.seek}
          onChange={(e) => {
            player.seek(Number(e.target.value) / 1000);
            setPos(player.position());
          }}
        />
        <span>{fmt(pos.total)}</span>
      </div>

      <div className="mp__controls">
        <button type="button" onClick={() => play(index - 1)} aria-label={c.prev} title={c.prev}>
          ⏮
        </button>
        <button type="button" className="mp__play" onClick={toggle} aria-label={playing ? c.pause : c.play} title={playing ? c.pause : c.play}>
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" onClick={() => play(index + 1)} aria-label={c.next} title={c.next}>
          ⏭
        </button>
        <label className="mp__volume">
          <span aria-hidden="true">🔊</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            aria-label={c.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              player.setVolume(v / 100);
            }}
          />
        </label>
      </div>

      {failed && <p className="mp__error">{lang === 'tr' ? 'Bu tarayıcı ses çalamıyor.' : 'This browser cannot play audio.'}</p>}

      <div className="mp__list" role="list" aria-label={c.playlist}>
        {TRACKS.map((t, i) => (
          <button key={t.id} type="button" role="listitem" className={`mp__row${i === index ? ' mp__row--on' : ''}`} onClick={() => play(i)}>
            <span className="mp__num">{i === index && playing ? '♪' : i + 1}</span>
            <span className="mp__name">{t.title}</span>
            <span className="mp__bpm">{t.bpm}</span>
          </button>
        ))}
      </div>

      <p className="mp__hint">{c.hint}</p>
    </div>
  );
}
