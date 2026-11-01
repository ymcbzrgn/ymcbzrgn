/**
 * What the four games tell the rest of the desktop: achievements, a sound, and a window event the
 * pixel twin listens to (it cheers, facepalms ...). The games only call these four functions.
 */
import { addToSet, unlock } from '../../os/achievements';
import { sfx } from '../../os/sound/sfx';

export type GameName = 'snake' | 'tetris' | '2048' | 'minesweeper';
export const GAME_EVENT = 'yb:game';

export interface GameEventDetail {
  game: GameName;
  kind: 'start' | 'score' | 'over' | 'win';
  value: number;
}

function emit(game: GameName, kind: GameEventDetail['kind'], value = 0) {
  window.dispatchEvent(new CustomEvent<GameEventDetail>(GAME_EVENT, { detail: { game, kind, value } }));
}

/** The game window opened. */
export function reportStart(game: GameName) {
  if (addToSet('games', game) >= 4) unlock('arcade');
  emit(game, 'start');
}

/**
 * Progress: the score (Snake), lines cleared so far (Tetris) or the biggest tile (2048).
 */
export function reportScore(game: GameName, value: number) {
  if (game === 'snake' && value >= 100) unlock('snake');
  if (game === 'tetris' && value >= 10) unlock('tetris');
  if (game === '2048' && value >= 512) unlock('g2048');
  emit(game, 'score', value);
}

export function reportOver(game: GameName, value = 0) {
  sfx('nope');
  emit(game, 'over', value);
}

export function reportWin(game: GameName, value = 0) {
  if (game === 'minesweeper') unlock('mines');
  sfx('celebrate');
  emit(game, 'win', value);
}
