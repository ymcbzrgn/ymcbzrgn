/**
 * What the pixel twin does when nobody is asking it for anything: one entry per behaviour.
 * build-sprites.mjs validates this table and writes src/assets/sprites/mascot.behaviors.ts,
 * which the (generic) engine in src/ui/pet/Pet.tsx reads. Adding a behaviour = adding an
 * animation in frames.mjs + an entry here; no engine code needs to change.
 *
 * Fields
 *   id        unique name
 *   anim      animation row to play (must exist in frames.mjs ANIMS)
 *   arrive    optional animation to switch to after a travelling behaviour has arrived
 *   weight    [calm, bored, sleepy] relative probability. The engine picks the tier from how long
 *             the visitor has been inactive (calm < 20 s <= bored < 60 s <= sleepy). 0 = never.
 *   duration  [min, max] ms the behaviour lasts (for travelling behaviours: dwell time after arriving)
 *   move      none | walk | run | dash | toCursor | fromCursor | toEdge   (horizontal travel)
 *   fx        none | hop | bounce | spin | backflip | upsideDown | shake | float | wobble   (body effect)
 *   face      travel (default when moving) | random | keep (default otherwise)
 *   until     "activity": hold the pose until the visitor moves the mouse / presses a key, then stretch
 *   lines     { chance, when?: "always" | "bored", en: [...], tr: [...] }   speech bubble on start
 *
 * The engine itself relies on these animations existing: idle, run (entrance), wave (greeting, menu),
 * sleep + stretch (falling asleep / waking up), drag (being picked up), jump (landing after a drop),
 * walk (coming back from a screen edge); the welcome window also plays look. The control-mode and
 * room animations (walkDown, walkUp, pickup, putdown, carryIdle, carryWalk, knock, arcade) are driven
 * by the app directly and need no behaviour here.
 *
 * Tiers: while the visitor is busy (calm) the twin mostly potters about, with the odd surprise
 * (push-ups out of nowhere, a sneeze, a trip). Left alone (bored) it gets wild. After a minute
 * (sleepy) it winds down and dozes off. Notes on movement: toEdge walks backwards (the engine faces
 * the twin into the screen), so it is a moonwalk that ends peeking in from the edge.
 */
const say = (chance, en, tr, when) => ({ chance, ...(when ? { when } : {}), en, tr });

export const BEHAVIORS = [
  /* ---------------- pottering about ---------------- */
  { id: 'idle', anim: 'idle', weight: [8, 3, 6], duration: [2500, 5000],
    lines: say(0.4, ['Anyone there?', 'Still here. Still pixelated.', "I'm Yamaç's pixel twin. He's a bit taller."],
      ['Kimse yok mu?', 'Hâlâ buradayım. Hâlâ pikselim.', 'Yamaç\'ın piksel ikiziyim. O biraz daha uzun.'], 'bored') },
  { id: 'look', anim: 'look', weight: [5, 3, 4], duration: [1800, 2600],
    lines: say(0.2, ['Did something just move?'], ['Bir şey mi kıpırdadı?']) },
  { id: 'walk', anim: 'walk', weight: [10, 6, 0], duration: [0, 0], move: 'walk' },
  { id: 'run', anim: 'run', weight: [3, 4, 0], duration: [0, 0], move: 'run',
    lines: say(0.3, ["Can't stop, I'm late for standup!"], ['Duramam, daily toplantısına geç kaldım!']) },
  { id: 'curious', anim: 'walk', arrive: 'stare', weight: [3, 3, 0], duration: [2000, 3500], move: 'toCursor',
    lines: say(0.35, ['Nice cursor. Is it new?', 'Ooh, what are you clicking?'], ['Güzel imleç. Yeni mi?', 'Ooo, neye tıklıyorsun?']) },
  { id: 'stare', anim: 'stare', weight: [2, 2, 0], duration: [2000, 3500], face: 'random',
    lines: say(0.3, ['I see you.'], ['Seni görüyorum.']) },
  { id: 'sit', anim: 'sit', weight: [4, 4, 8], duration: [4000, 8000], face: 'random',
    lines: say(0.3, ['Just sitting here. Like a well-cached value.'], ['Öylece oturuyorum. İyi önbelleklenmiş bir değer gibi.']) },
  { id: 'coffee', anim: 'coffee', weight: [4, 3, 2], duration: [4000, 6500],
    lines: say(0.4, ['I could use a coffee.', 'Coffee in, code out.'], ['Bir kahveye ihtiyacım var.', 'Kahve girer, kod çıkar.']) },
  { id: 'cay', anim: 'cay', weight: [4, 3, 2], duration: [4000, 6500],
    lines: say(0.45, ['Tea break! Çay and simit.', 'Simit + çay = the best debugger.'], ['Çay molası! Yanında da simit.', 'Simit + çay = en iyi debugger.']) },
  { id: 'read', anim: 'read', weight: [3, 3, 6], duration: [5000, 9000],
    lines: say(0.4, ['Reading docs. Again.', 'Chapter 7: Why did it work yesterday?'], ['Yine dokümantasyon okuyorum.', '7. Bölüm: Dün neden çalışıyordu?']) },
  { id: 'type', anim: 'type', weight: [3, 3, 0], duration: [5000, 8000],
    lines: say(0.45, ['git commit -m "one more fix"', 'Just a quick refactor… famous last words.', 'Writing TypeScript. The types are writing back.'],
      ['git commit -m "bir düzeltme daha"', 'Ufak bir refactor… meşhur son sözler.', 'TypeScript yazıyorum. Tipler de bana yazıyor.']) },
  { id: 'phone', anim: 'phone', weight: [3, 3, 1], duration: [3500, 6000],
    lines: say(0.35, ['Checking if prod is still up…', 'Reading memes. For research.'], ['Prod hâlâ ayakta mı, bakıyorum…', 'Mim okuyorum. Araştırma amaçlı.']) },
  { id: 'watch', anim: 'watch', weight: [3, 2, 0], duration: [2500, 4000],
    lines: say(0.45, ['Is it Friday yet?', 'Deploy o\'clock already?'], ['Cuma oldu mu?', 'Deploy saati geldi mi?']) },
  { id: 'think', anim: 'think', weight: [3, 3, 0], duration: [3000, 5000],
    lines: say(0.4, ['Hmm… tabs or spaces?', 'Big head, big thoughts.'], ['Hmm… tab mı, boşluk mu?', 'Büyük kafa, büyük fikirler.']) },
  { id: 'whistle', anim: 'whistle', weight: [3, 3, 0], duration: [3000, 5000],
    lines: say(0.3, ['Nothing to see here. Just a normal pixel.'], ['Burada görülecek bir şey yok. Sıradan bir piksel.']) },
  { id: 'duck', anim: 'duck', weight: [3, 3, 0], duration: [3500, 5500],
    lines: say(0.5, ['The duck says the bug is on line 42.', 'Rubber duck debugging. Works every time.'], ['Ördek, bug\'ın 42. satırda olduğunu söylüyor.', 'Lastik ördekle debug. Her seferinde işe yarıyor.']) },
  { id: 'pizza', anim: 'pizza', weight: [3, 3, 0], duration: [3000, 4500],
    lines: say(0.45, ['Pizza-driven development.'], ['Pizza odaklı geliştirme.']) },
  { id: 'hairfix', anim: 'hairfix', weight: [3, 3, 0], duration: [2500, 4000],
    lines: say(0.5, ['The hair has to be perfect. It is in the spec.', 'Hair v2.0: now 100% cooler.'], ['Saç kusursuz olmalı. Gereksinimlerde yazıyor.', 'Saç v2.0: artık %100 daha havalı.']) },
  { id: 'tiptoe', anim: 'tiptoe', weight: [3, 3, 0], duration: [0, 0], move: 'walk',
    lines: say(0.35, ['Shh… the bugs are sleeping.'], ['Şşş… bug\'lar uyuyor.']) },
  { id: 'skip', anim: 'skip', weight: [3, 4, 0], duration: [0, 0], move: 'walk',
    lines: say(0.3, ['La la la, a good day to ship.'], ['Lalala, yayına almak için güzel bir gün.']) },
  { id: 'headphones', anim: 'headphones', weight: [3, 4, 0], duration: [4000, 7000],
    lines: say(0.35, ['Lo-fi beats to debug to.'], ['Debug yaparken lo-fi.']) },
  { id: 'heart', anim: 'heart', weight: [2, 2, 0], duration: [2500, 3500],
    lines: say(0.5, ['Thanks for stopping by!'], ['Uğradığın için teşekkürler!']) },
  { id: 'stretch', anim: 'stretch', weight: [2, 3, 6], duration: [2800, 2800] },
  { id: 'look-there', anim: 'point', weight: [2, 2, 0], duration: [2200, 3200], face: 'random',
    lines: say(0.45, ['Look, over there!', 'A wild feature request appeared!'], ['Bak, şurada!', 'Vahşi bir özellik isteği belirdi!']) },
  { id: 'inspect', anim: 'inspect', weight: [2, 2, 0], duration: [3000, 4500], face: 'random',
    lines: say(0.5, ['Hmm, suspicious pixel…', 'Is that a 1px misalignment?'], ['Hmm, şüpheli bir piksel…', 'Bu 1 piksellik bir kayma mı?']) },
  { id: 'inspect-cursor', anim: 'walk', arrive: 'inspect', weight: [1, 2, 0], duration: [2500, 3500], move: 'toCursor',
    lines: say(0.45, ['Let me take a closer look at that cursor.'], ['Şu imlece yakından bir bakayım.']) },
  { id: 'squat', anim: 'crouch', weight: [1, 2, 1], duration: [2500, 4000], face: 'random',
    lines: say(0.4, ['Catching my breath…', 'Squat break. Never skip leg day.'], ['Biraz soluklanıyorum…', 'Çömelme molası. Bacak günü atlanmaz.']) },

  /* ---------------- sudden surprises (rare while you are busy, common when you are not) ---------------- */
  { id: 'pushup', anim: 'pushup', weight: [3, 6, 0], duration: [3500, 6000], face: 'random',
    lines: say(0.5, ['Out of nowhere: push-ups!', 'Pushing to main.'], ['Birden bire: şınav!', 'Şınav çekiyorum. Main\'e de push.']) },
  { id: 'sneeze', anim: 'sneeze', weight: [3, 3, 1], duration: [2700, 2700],
    lines: say(0.4, ['Achoo! Sorry, allergic to legacy code.'], ['Hapşu! Pardon, legacy koda alerjim var.']) },
  { id: 'hiccup', anim: 'hiccup', weight: [2, 3, 0], duration: [2500, 4000],
    lines: say(0.4, ['Hic! Too much JSON.'], ['Hık! Fazla JSON yedim.']) },
  { id: 'hiccup-hop', anim: 'hiccup', weight: [2, 2, 0], duration: [1000, 1000], fx: 'hop' },
  { id: 'trip', anim: 'trip', weight: [3, 4, 0], duration: [2400, 2400], face: 'random',
    lines: say(0.5, ['I meant to do that.', 'Tripped over a null pointer.'], ['Bilerek yaptım.', 'Bir null pointer\'a takıldım.']) },
  { id: 'facepalm', anim: 'facepalm', weight: [2, 3, 0], duration: [2500, 4000],
    lines: say(0.45, ['Forgot the semicolon. Again.', 'It was a typo. It is always a typo.'], ['Yine noktalı virgülü unuttum.', 'Yazım hatasıymış. Hep yazım hatasıdır.']) },
  { id: 'shrug', anim: 'shrug', weight: [2, 3, 0], duration: [2500, 3500],
    lines: say(0.55, ['Works on my machine.'], ['Benim makinemde çalışıyor.']) },
  { id: 'jump', anim: 'jump', weight: [2, 3, 0], duration: [900, 900], fx: 'hop',
    lines: say(0.4, ['Wheee!'], ['Yaşasın!']) },
  { id: 'bug', anim: 'bug', weight: [2, 3, 0], duration: [2000, 3000],
    lines: say(0.5, ['Found a bug. Fixed it.'], ['Bir bug buldum. Düzelttim.']) },

  /* ---------------- getting wild (bored) ---------------- */
  { id: 'jacks', anim: 'jacks', weight: [2, 5, 0], duration: [3000, 5000],
    lines: say(0.35, ['Daily exercise: done. Daily standup: next.'], ['Günlük egzersiz tamam. Sırada günlük toplantı.']) },
  { id: 'juggle', anim: 'juggle', weight: [2, 4, 0], duration: [3500, 6000],
    lines: say(0.4, ['Juggling side projects.'], ['Yan projeleri aynı anda çeviriyorum.']) },
  { id: 'balance', anim: 'balance', weight: [2, 4, 0], duration: [3500, 5500], fx: 'wobble',
    lines: say(0.4, ['Work-life balance. Plus a book.'], ['İş-yaşam dengesi. Bir de kitap dengesi.']) },
  { id: 'guitar', anim: 'guitar', weight: [2, 4, 0], duration: [3000, 5000],
    lines: say(0.35, ['Air guitar solo!'], ['Hava gitarı solosu!']) },
  { id: 'drums', anim: 'drums', weight: [2, 4, 0], duration: [3000, 4500],
    lines: say(0.35, ['Ba-dum-tss!'], ['Ba-dum-tıss!']) },
  { id: 'conduct', anim: 'conduct', weight: [2, 3, 0], duration: [3500, 5500],
    lines: say(0.35, ['And now: the microservice symphony.'], ['Şimdi de mikroservis senfonisi.']) },
  { id: 'disco', anim: 'disco', weight: [2, 4, 0], duration: [3000, 5000],
    lines: say(0.3, ['Staying alive, staying deployed!'], ['Disko zamanı! Deploy da ayakta.']) },
  { id: 'headbang', anim: 'headbang', weight: [2, 3, 0], duration: [2500, 4000],
    lines: say(0.3, ['Metal! I mean, bare metal.'], ['Metal! Yani bare metal sunucu.']) },
  { id: 'dance', anim: 'dance', weight: [2, 4, 0], duration: [3000, 5000],
    lines: say(0.4, ['Me when the build passes on the first try.'], ['Build ilk denemede geçince ben:']) },
  { id: 'caffeine', anim: 'caffeine', weight: [2, 3, 0], duration: [2500, 4000], fx: 'shake',
    lines: say(0.5, ['Fourth coffee. I can hear colours.'], ['Dördüncü kahve. Renkleri duyabiliyorum.']) },
  { id: 'celebrate', anim: 'celebrate', weight: [2, 3, 0], duration: [2500, 4000], fx: 'bounce',
    lines: say(0.5, ['All tests passed!', 'Green CI! Party time!'], ['Bütün testler geçti!', 'CI yeşil! Parti zamanı!']) },
  { id: 'flex', anim: 'flex', weight: [2, 3, 0], duration: [2500, 4000],
    lines: say(0.4, ['Strong typing.'], ['Güçlü tipleme.']) },
  { id: 'angry', anim: 'angry', weight: [2, 3, 0], duration: [2500, 3500], fx: 'shake',
    lines: say(0.5, ["Why won't you compile?!"], ['Neden derlenmiyorsun?!']) },
  { id: 'dizzy', anim: 'dizzy', weight: [2, 3, 0], duration: [2500, 4000], fx: 'wobble',
    lines: say(0.4, ['Too many tabs open…'], ['Çok fazla sekme açık…']) },
  { id: 'bubblegum', anim: 'bubblegum', weight: [2, 3, 1], duration: [4000, 4000],
    lines: say(0.4, ['Bubble sort? No, bubble gum.'], ['Bubble sort mu? Hayır, balonlu sakız.']) },
  { id: 'yoyo', anim: 'yoyo', weight: [2, 3, 0], duration: [3000, 5000],
    lines: say(0.35, ['Up, down, up… like my test coverage.'], ['Aşağı, yukarı… tıpkı test kapsamım gibi.']) },
  { id: 'hula', anim: 'hula', weight: [2, 3, 0], duration: [3000, 5000],
    lines: say(0.4, ['Infinite loop!'], ['Sonsuz döngü!']) },
  { id: 'selfie', anim: 'selfie', weight: [2, 3, 0], duration: [2500, 4000],
    lines: say(0.45, ['Pixel-perfect selfie.'], ['Piksel piksel kusursuz bir selfie.']) },
  { id: 'meditate', anim: 'meditate', weight: [2, 3, 5], duration: [5000, 9000], fx: 'float',
    lines: say(0.4, ['Inner peace… no merge conflicts.'], ['İç huzur… merge conflict yok.']) },
  { id: 'backflip', anim: 'tuck', weight: [2, 4, 0], duration: [1800, 1800], fx: 'backflip',
    lines: say(0.45, ["Backflip! Don't try this in production."], ['Ters takla! Bunu production\'da denemeyin.']) },
  { id: 'headstand', anim: 'headstand', weight: [2, 4, 0], duration: [3000, 5000],
    lines: say(0.45, ['Debugging from a new angle.'], ['Bug\'a farklı bir açıdan bakıyorum.']) },
  { id: 'headspin', anim: 'headspin', weight: [2, 4, 0], duration: [2400, 3200], fx: 'spin',
    lines: say(0.4, ['A head-spinning feature.'], ['Baş döndürücü bir özellik.']) },
  { id: 'pirouette', anim: 'ballet', weight: [2, 4, 0], duration: [2400, 3200], fx: 'spin',
    lines: say(0.4, ['Spinning up a new server!'], ['Yeni bir sunucu ayağa kaldırıyorum!']) },
  { id: 'cartwheel', anim: 'cartwheel', weight: [2, 4, 0], duration: [0, 0], move: 'run',
    lines: say(0.35, ['Cartwheeling to the next task!'], ['Bir sonraki göreve takla atarak!']) },
  { id: 'zoomies', anim: 'zoomies', weight: [2, 4, 0], duration: [0, 0], move: 'dash',
    lines: say(0.4, ['ZOOMIES!', 'Running in O(1)!'], ['Turbo mod!', 'O(1) hızında koşuyorum!']) },
  { id: 'robot', anim: 'robot', weight: [2, 3, 0], duration: [0, 0], move: 'walk',
    lines: say(0.45, ['Beep boop. I am a totally normal human.'], ['Bip bop. Ben tamamen normal bir insanım.']) },
  { id: 'crawl', anim: 'crawl', weight: [2, 3, 0], duration: [0, 0], move: 'walk',
    lines: say(0.4, ['Crawling… like my old laptop.'], ['Emekliyorum… eski laptopum gibi.']) },
  // no speech here: the bubble would ride along to the screen edge and be cut off there
  { id: 'moonwalk', anim: 'moonwalk', arrive: 'peek', weight: [3, 4, 0], duration: [2500, 4000], move: 'toEdge' },
  { id: 'sneak', anim: 'sneak', arrive: 'stare', weight: [2, 4, 0], duration: [1800, 3000], move: 'toCursor',
    lines: say(0.4, ['Sneaking up on your cursor…'], ['İmlecine sinsice yaklaşıyorum…']) },
  { id: 'flee', anim: 'flee', arrive: 'look', weight: [2, 3, 0], duration: [1500, 2500], move: 'fromCursor',
    lines: say(0.5, ['Not the cursor! Anything but the cursor!'], ['İmleç geliyor! Herkes kaçsın!']) },
  { id: 'greet-cursor', anim: 'run', arrive: 'wave', weight: [2, 2, 0], duration: [2000, 3000], move: 'toCursor',
    lines: say(0.4, ['Hi, cursor! Long time no see.'], ['Selam imleç! Görüşmeyeli nasılsın?']) },
  { id: 'karate', anim: 'karate', weight: [2, 3, 0], duration: [2500, 4000], face: 'random',
    lines: say(0.4, ['Hi-yah! Code review incoming!'], ['Hiyaa! Code review geliyor!']) },
  { id: 'box', anim: 'box', weight: [2, 3, 0], duration: [2500, 4000], face: 'random',
    lines: say(0.4, ['Boxing with a race condition.'], ['Bir race condition ile boks yapıyorum.']) },
  { id: 'fish', anim: 'fish', weight: [1, 3, 3], duration: [6000, 10000], face: 'random',
    lines: say(0.45, ['Fishing for bugs.', 'Caught one! It is a feature now.'], ['Bug avına çıktım.', 'Yakaladım! Artık bir özellik.']) },
  { id: 'lie', anim: 'lie', weight: [1, 3, 6], duration: [5000, 9000], face: 'random',
    lines: say(0.4, ['Brain RAM full. Lying down for garbage collection.'], ['Beyin RAM\'i doldu. Çöp toplama için uzanıyorum.']) },
  { id: 'gravity', anim: 'drag', weight: [1, 2, 0], duration: [2500, 3500], fx: 'upsideDown',
    lines: say(0.55, ['Gravity.exe has stopped working.'], ['Yerçekimi.exe yanıt vermiyor.']) },
  { id: 'upside-think', anim: 'think', weight: [1, 2, 0], duration: [2500, 3500], fx: 'upsideDown',
    lines: say(0.5, ['Thinking outside the box. And upside down.'], ['Kutunun dışında düşünüyorum. Bir de baş aşağı.']) },
  { id: 'pixel-pride', anim: 'flex', weight: [1, 1, 0], duration: [2500, 3500],
    lines: say(0.6, ['He builds AI platforms at Arketic AI. I build… pixels.', 'Python, TypeScript, React, Node.js. I speak them all, in pixels.'],
      ['O, Arketic AI\'da yapay zeka platformları geliştiriyor. Ben de… piksel.', 'Python, TypeScript, React, Node.js. Hepsini piksel piksel konuşurum.']) },

  /* ---------------- winding down (sleepy) ---------------- */
  { id: 'sleep', anim: 'sleep', weight: [0, 0, 90], duration: [0, 0], until: 'activity' },
  { id: 'float-nap', anim: 'sleep', weight: [0, 0, 20], duration: [0, 0], fx: 'float', until: 'activity' },
];
