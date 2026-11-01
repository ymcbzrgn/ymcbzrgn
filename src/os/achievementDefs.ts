/**
 * Titles and descriptions of the achievements (lazy: only the Achievements window, the unlock toast
 * and the command palette import this). The ids and the storage live in ./achievements.
 */
import type { AchievementId } from './achievements';

export type AchievementGroup = 'twin' | 'rooms' | 'games' | 'terminal' | 'desktop' | 'sound';

export interface AchievementDef {
  id: AchievementId;
  group: AchievementGroup;
  icon: string;
  /** Shown as "???" until it is unlocked. */
  hidden?: boolean;
  en: readonly [title: string, description: string];
  tr: readonly [title: string, description: string];
}

export const GROUPS: readonly AchievementGroup[] = ['twin', 'rooms', 'games', 'terminal', 'desktop', 'sound'];

export const DEFS: readonly AchievementDef[] = [
  // the pixel twin
  { id: 'drive', group: 'twin', icon: '🎮', en: ['Hello, driver', 'Take the controls of the pixel twin.'], tr: ['Merhaba, pilot', 'Piksel ikizin kontrolünü eline al.'] },
  { id: 'door', group: 'twin', icon: '🚪', en: ['Knock knock', 'Walk into a desktop icon with E.'], tr: ['Tak tak', 'E ile bir masaüstü ikonunun içine gir.'] },
  { id: 'move10', group: 'twin', icon: '✨', en: ['Show-off', 'Discover 10 moves.'], tr: ['Gösteriş', '10 hareket keşfet.'] },
  { id: 'move25', group: 'twin', icon: '🕺', en: ['Choreographer', 'Discover 25 moves.'], tr: ['Koreograf', '25 hareket keşfet.'] },
  { id: 'moveAll', group: 'twin', icon: '🏅', en: ['Move master', 'Discover every single move.'], tr: ['Hareket ustası', 'Bütün hareketleri keşfet.'] },
  { id: 'dizzy', group: 'twin', icon: '😵', en: ['Spin cycle', 'Jump until the twin gets dizzy.'], tr: ['Santrifüj', 'İkizin başı dönene kadar zıpla.'] },
  { id: 'konami', group: 'twin', icon: '🕹️', hidden: true, en: ['Old school', 'Enter the Konami code while driving the twin.'], tr: ['Eski usül', 'İkizi sürerken Konami kodunu gir.'] },
  // rooms
  { id: 'room', group: 'rooms', icon: '🏠', en: ['Home sweet home', 'Step into the room inside a folder window.'], tr: ['Evim evim güzel evim', 'Bir klasör penceresindeki odaya gir.'] },
  { id: 'rooms5', group: 'rooms', icon: '🗺️', en: ['Interior tour', 'Visit 5 different rooms.'], tr: ['İç mimari gezisi', '5 farklı odayı gez.'] },
  { id: 'carry', group: 'rooms', icon: '📦', en: ['Removal service', 'Carry a file into another folder.'], tr: ['Nakliyat', 'Bir dosyayı başka bir klasöre taşı.'] },
  { id: 'secret', group: 'rooms', icon: '🔑', en: ['Curious cat', 'Find a secret place.'], tr: ['Meraklı kedi', 'Gizli bir yer bul.'] },
  { id: 'secretsAll', group: 'rooms', icon: '🕵️', en: ['No stone unturned', 'Find every secret place.'], tr: ['Taş altı kalmadı', 'Bütün gizli yerleri bul.'] },
  { id: 'gallery', group: 'rooms', icon: '🖼️', en: ['Gallery night', 'Walk through the Photos room.'], tr: ['Galeri gecesi', 'Fotoğraflar odasında dolaş.'] },
  // games
  { id: 'snake', group: 'games', icon: '🐍', en: ['Snack time', 'Score 100 in Snake.'], tr: ['Atıştırma vakti', "Snake'te 100 puan yap."] },
  { id: 'tetris', group: 'games', icon: '🧱', en: ['Line cleaner', 'Clear 10 lines in Tetris.'], tr: ['Satır temizleyici', "Tetris'te 10 satır temizle."] },
  { id: 'g2048', group: 'games', icon: '🔢', en: ['Powers of two', 'Make a 512 tile in 2048.'], tr: ['İkinin kuvvetleri', "2048'de 512'lik kare yap."] },
  { id: 'mines', group: 'games', icon: '💣', en: ['Sweeper', 'Win a game of Minesweeper.'], tr: ['Mayın tarlası', "Mayın Tarlası'nı kazan."] },
  { id: 'arcade', group: 'games', icon: '👾', en: ['Arcade regular', 'Play all four games.'], tr: ['Salon müdavimi', 'Dört oyunu da oyna.'] },
  // terminal
  { id: 'neofetch', group: 'terminal', icon: '💻', en: ['Show me your specs', 'Run neofetch.'], tr: ['Özellikleri göster', 'neofetch çalıştır.'] },
  { id: 'pipe', group: 'terminal', icon: '🔧', en: ['Plumber', 'Chain two commands with a pipe.'], tr: ['Tesisatçı', 'İki komutu boru (|) ile bağla.'] },
  { id: 'oops', group: 'terminal', icon: '💥', hidden: true, en: ['Oops', 'Run rm -rf / (nothing is harmed, promise).'], tr: ['Eyvah', 'rm -rf / çalıştır (hiçbir şey zarar görmez, söz).'] },
  { id: 'sudo', group: 'terminal', icon: '🔒', hidden: true, en: ['Not in the sudoers file', 'Ask the terminal for more power.'], tr: ['Sudoers dosyasında yoksun', 'Terminalden daha fazla yetki iste.'] },
  // desktop
  { id: 'tour', group: 'desktop', icon: '🧭', en: ['Well guided', 'Finish the guided tour.'], tr: ['Rehberli', 'Rehberli turu bitir.'] },
  { id: 'palette', group: 'desktop', icon: '⌨️', en: ['Power user', 'Open the command palette (Ctrl K).'], tr: ['İleri düzey kullanıcı', 'Komut paletini aç (Ctrl K).'] },
  { id: 'polyglot', group: 'desktop', icon: '🌍', en: ['Polyglot', 'Switch the language.'], tr: ['Çok dilli', 'Dili değiştir.'] },
  { id: 'owl', group: 'desktop', icon: '🦉', hidden: true, en: ['Night owl', 'Visit between midnight and 5 am.'], tr: ['Gece kuşu', 'Gece yarısı ile sabah 5 arasında ziyaret et.'] },
  { id: 'holiday', group: 'desktop', icon: '🎉', hidden: true, en: ['Red-letter day', 'Visit on a special day.'], tr: ['Bayram günü', 'Özel bir günde ziyaret et.'] },
  { id: 'all', group: 'desktop', icon: '👑', en: ['Completionist', 'Unlock every other achievement.'], tr: ['Hepsini topla', 'Bütün diğer başarımları aç.'] },
  // sound
  { id: 'sound', group: 'sound', icon: '🔊', en: ['Turn it up', 'Switch the sound on.'], tr: ['Sesi aç', 'Sesi aç.'] },
  { id: 'dj', group: 'sound', icon: '🎧', en: ['DJ', 'Play 3 different tracks in the Music Player.'], tr: ['DJ', 'Müzik çalarda 3 farklı parça çal.'] },
  { id: 'dance', group: 'sound', icon: '💃', en: ['Dance floor', 'Play some music and see what the twin does.'], tr: ['Dans pisti', 'Biraz müzik çal ve ikizin ne yaptığına bak.'] },
];

const byId = new Map(DEFS.map((d) => [d.id, d]));

export function defOf(id: AchievementId): AchievementDef | undefined {
  return byId.get(id);
}
