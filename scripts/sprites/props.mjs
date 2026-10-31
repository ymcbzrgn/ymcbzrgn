/**
 * Props and effect sprites (ASCII, symbols from palette.mjs).
 * Props get coloured outlines in the outline pass; effects (fx material) never do.
 */
import { part } from './lib.mjs';

/* ---------------- held objects ---------------- */
// Mug seen from the side, handle on the right, a little coffee showing at the top
export const MUG = part('MUG', ['nnn..', 'OOOo.', 'OOOoo', 'OOOo.', 'ooo..']);
// Turkish tea: tulip glass with amber tea on a tiny saucer
export const CAY = part('CAY', ['eNNe', '.NN.', 'eNNe', 'eNNe', 'llll']);
// Simit (sesame ring), seen flat
export const SIMIT = part('SIMIT', ['.NNN.', 'NR.RN', 'N...N', 'NR.RN', '.NNN.']);
// Open book seen from the reader's back side (we see the cover and the page edges)
export const BOOK = part('BOOK', [
  'ddddddddddd',
  'dbbbbdbbbbd',
  'dbbbbdbbbbd',
  'dbbebdbbbbd',
  'dbbbbdbbbbd',
  'dbbbbdbbbbd',
  'eeeeedeeeee',
]);
export const BOOK_TURN = part('BOOK_TURN', [
  'dddddddeee.',
  'dbbbbdbeeel',
  'dbbbbdbeeel',
  'dbbebdbeeel',
  'dbbbbdbbeel',
  'dbbbbdbbbbd',
  'eeeeedeeeee',
]);
// Closed book lying flat (balanced on the head)
export const BOOK_FLAT = part('BOOK_FLAT', ['dbbbbbbbbd', 'eeeeeeeeel', 'ddddddddd.']);
// Back of a laptop lid with stickers, and the keyboard deck in front
export const LAPTOP = part('LAPTOP', [
  'aAAAAAAAAAAa',
  'aAAAAAAAAAAa',
  'aA5AAAAA6AAa',
  'aAAAA1AAAAAa',
  'aAAAAAAA7AAa',
  'aAAAAAAAAAAa',
  'aaaaaaaaaaaa',
]);
// Wristwatch (strap + face)
export const WATCH = part('WATCH', ['Z', 'e', 'Z']);
// Phone (back side, camera dot) and the same phone lighting up the face side
export const PHONE = part('PHONE', ['ZZZ', 'Z2Z', 'ZZZ', 'ZZZ']);
export const PHONE_LIT = part('PHONE_LIT', ['ZZZ', 'Z2Z', 'Z2Z', 'ZZZ']);
// Rubber duck, facing left (towards the coder holding it on the right)
export const DUCK = part('DUCK', ['.KK...', 'XpKK..', '.KKK.K', '.KKKKK', '..xxx.']);
export const DUCK_TALK = part('DUCK_TALK', ['.KK...', 'XpKK..', 'X.KK.K', '.KKKKK', '..xxx.']);
// Pizza slice, tip pointing down (whole / bitten)
export const PIZZA = part('PIZZA', ['NNNNN', 'RyRRR', 'RRRyR', '.RyR.', '.RR..', '..R..']);
export const PIZZA_BIT = part('PIZZA_BIT', ['NNNNN', 'RyRRR', 'RRRyR', '.RyR.', '.....', '.....']);
// Juggling balls
export const BALL_R = part('BALL_R', ['55', '55']);
export const BALL_B = part('BALL_B', ['66', '66']);
export const BALL_Y = part('BALL_Y', ['77', '77']);
// A tiny drum and sticks (raised / striking)
export const DRUM = part('DRUM', ['.eeeeeeeeeeeee.', 'leeeeeeeeeeeeel', '555555555555555', '5ee5ee5ee5ee5e5', '555555555555555']);
export const STICK_HI = part('STICK_HI', ['3...', '.3..', '..4.', '...4']);
export const STICK_LO = part('STICK_LO', ['....', '4...', '.43.', '...3']);
// Conductor's baton
export const BATON = part('BATON', ['...e', '..e.', '.e..', '4...']);
// Comb and hand mirror
export const COMB = part('COMB', ['4444', '3.3.']);
export const MIRROR = part('MIRROR', ['.aa.', 'a::a', 'a::a', '.aa.', '.4..', '.4..']);
// Headphones: band over the head + ear cups (placed relative to the front head)
export const HEADPHONES = part('HEADPHONES', [
  '......ZZZZZZZZZZ......',
  '....ZZ..........ZZ....',
  '...Z..............Z...',
  '..Z................Z..',
  '..Z................Z..',
  '.Z..................Z.',
  '.Z..................Z.',
  '.Z..................Z.',
  '.Z..................Z.',
  '.Z..................Z.',
  '.Z..................Z.',
  '.Z..................Z.',
  '55..................55',
  '55..................55',
  '55..................55',
]);
// A small green bug (the kind you find in code), legs up and down
export const BUG = part('BUG', ['.99.', '9999', '&..&']);
export const BUG_B = part('BUG_B', ['.99.', '9999', '.&&.']);
// Fishing: rod (diagonal), bobber, a little fish
export const BOBBER = part('BOBBER', ['5', 'e']);
export const FISH = part('FISH', ['.66.6', '6p666', '.66.6']);
// Yo-yo
export const YOYO = part('YOYO', ['55', '55']);

/* ---------------- effects (never outlined) ---------------- */
export const FX = {
  sparkle: part('SPARK', ['.*.', '***', '.*.']),
  spark1: part('SPARK1', ['*']),
  star: part('STAR', ['.+.', '+++', '.+.']),
  heart: part('HEART', ['#.#', '###', '.#.']),
  heartBig: part('HEARTB', ['##.##', '#####', '.###.', '..#..']),
  note: part('NOTE', ['.!!', '.!.', '!!.', '!!.']),
  note2: part('NOTE2', ['!!!', '!.!', '!.!', '!.!']),
  q: part('QMARK', ['!!!', '..!', '.!!', '...', '.!.']),
  ex: part('EXMARK', ['!', '!', '!', '.', '!']),
  speed: part('SPEED', ['~~~~..', '......', '..~~~~', '......', '~~~...']),
  dust: part('DUST', ['.~.', '~~~']),
  dust2: part('DUST2', ['~..~', '.~~.']),
  puff: part('PUFF', ['.~~.', '~~~~', '.~~.']),
  steam: part('STEAM', ['~.', '.~', '~.']),
  steam2: part('STEAM2', ['.~', '~.', '.~']),
  bubble: part('BUBBLE', ['.::.', ':!::', '::::', '.::.']),
  bubbleS: part('BUBBLES', [':!', '::']),
  bubbleL: part('BUBBLEL', ['.:::.', ':!:::', ':::::', ':::::', '.:::.']),
  gum: part('GUM', ['.^^^.', '^!^^^', '^^^^^', '^^^^^', '.^^^.']),
  gumS: part('GUMS', ['^^', '^^']),
  pop: part('POP', ['^.^.^', '.....', '^...^', '.....', '^.^.^']),
  spray: part('SPRAY', ['%.%..', '..%.%', '%.%..']),
  confetti: part('CONF', ['+...^...%', '...%...+.', '.^...+...', '....!...^']),
  confetti2: part('CONF2', ['.%...+...', '^...^...%', '...!...+.', '.+...%...']),
  hic: part('HIC', [':!', '::']),
  dizzy: part('DIZZY', ['+...+', '.....', '..+..']),
  dizzy2: part('DIZZY2', ['..+..', '.....', '+...+']),
  flash: part('FLASH', ['.!.!.', '!!!!!', '.!!!.', '!!!!!', '.!.!.']),
  ommm: part('OM', ['+.....+', '.......', '...+...']),
  impact: part('IMPACT', ['!...!', '.!.!.', '.....', '.!.!.', '!...!']),
};
