// New features of the desktop: command palette, achievements, sound, guided tour, terminal extras, music player, games.
const { chromium, devices } = require('playwright');
const { serve, ok, sleep, summary, boot, SHOTS } = require('./lib.cjs');
const path = require('path');

const winCount = (page) => page.locator('.window').count();
const hasWindow = (page, appId) => page.locator(`.window[data-app-id="${appId}"]`).count().then((n) => n > 0);

async function palette(page, query, { pick } = {}) {
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.palette__input');
  await page.locator('.palette__input').fill(query);
  await page.waitForTimeout(120);
  if (pick !== false) await page.keyboard.press('Enter');
}

async function term(page, cmd) {
  const input = page.locator('.terminal-app__input');
  await input.fill(cmd);
  await input.press('Enter');
  await page.waitForTimeout(160);
  return page.locator('.terminal-app__entry').last().innerText();
}

const toastTexts = (page) => page.$$eval('.ach-toast', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu-xp-storage') || '{}').state?.settings || {});
const ach = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('yb-ach') || '{"got":{}}').got);

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  /* ---------- tray, palette, achievements, sound ---------- */
  console.log('\n[tray + palette]');
  {
    const { context, page } = await boot(browser, base);
    await page.waitForSelector('.tray-x__btn');
    ok((await page.locator('.tray-x__btn').count()) === 3, 'tray has palette, trophy and sound buttons');
    ok((await page.locator('.tray-x__count').innerText()) === '0', 'trophy counter starts at 0');
    ok((await page.locator('.tray-x__btn[aria-pressed]').getAttribute('aria-pressed')) === 'false', 'sound starts off');

    await palette(page, 'termin', { pick: false });
    ok(await page.locator('.palette').isVisible(), 'Ctrl+K opens the palette');
    ok(await page.locator('.palette__input').evaluate((el) => el === document.activeElement), 'palette input is focused');
    const first = await page.locator('.palette__row--on .palette__label').innerText();
    ok(/Terminal/i.test(first), `"termin" finds Terminal first (${first})`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.window[data-app-id="terminal-app"]');
    ok(!(await page.locator('.palette').count()), 'palette closes after running a command');
    await page.waitForSelector('.ach-toast');
    ok((await toastTexts(page)).some((t) => /Power user/.test(t)), 'opening the palette awards "Power user"');
    ok((await page.locator('.tray-x__count').innerText()) === '1', 'trophy counter follows (1)');

    // hidden places stay hidden
    await palette(page, 'photos', { pick: false });
    ok(!(await page.locator('.palette__label', { hasText: /^Photos$/ }).count()), 'palette does not reveal the hidden Photos app');
    await page.keyboard.press('Escape');
    await palette(page, 'music', { pick: false });
    ok(!(await page.locator('.palette__label', { hasText: /^Music Player$/ }).count()), 'palette does not reveal the hidden Music Player');
    await page.keyboard.press('Escape');
    ok(!(await page.locator('.palette').count()), 'Esc closes the palette');

    // nothing matches
    await palette(page, 'zzzqqq', { pick: false });
    ok((await page.locator('.palette__empty').count()) === 1, 'no match shows the empty state');
    await page.keyboard.press('Escape');

    // taskbar button
    await page.locator('.tray-x__kbd').click();
    ok(await page.locator('.palette').isVisible(), 'the taskbar button opens the palette too');
    await page.keyboard.press('Escape');

    // achievements window
    await page.locator('.tray-x__trophy').click();
    await page.waitForSelector('.window[data-app-id="achievements-app"] .ach__row');
    const rows = await page.locator('.ach__row').count();
    ok(rows === 31, `achievements window lists every achievement (${rows})`);
    ok((await page.locator('.ach__row--on').count()) >= 1, 'the unlocked one is highlighted');
    ok((await page.locator('.ach__row', { hasText: 'Hidden achievement' }).count()) === 5, 'five achievements are still secret');
    await page.screenshot({ path: path.join(SHOTS, 'achievements.png') });

    // sound
    await page.locator('.tray-x__btn[aria-pressed]').click();
    await page.waitForTimeout(500);
    ok((await page.locator('.tray-x__btn[aria-pressed]').getAttribute('aria-pressed')) === 'true', 'the speaker switches sound on');
    ok((await stored(page)).soundOn === true, 'sound setting is saved');
    ok(((await ach(page)).sound ?? 0) > 0, '"Turn it up" is awarded');
    const ctxState = await page.evaluate(() => 'AudioContext' in window);
    ok(ctxState, 'Web Audio is available');
    await page.locator('.tray-x__btn[aria-pressed]').click();
    ok((await stored(page)).soundOn === false, 'and off again');

    // settings
    await palette(page, 'open settings');
    await page.waitForSelector('.settings-app');
    const box = page.locator('.settings-app__radio', { hasText: 'Sound' }).locator('input[type=checkbox]');
    await box.check();
    ok((await stored(page)).soundOn === true, 'Settings sound checkbox works');
    await page.locator('.settings-app__radio--slider input[type=range]').fill('35');
    await page.waitForTimeout(100);
    ok(Math.abs(((await stored(page)).soundVolume ?? 0) - 0.35) < 0.001, 'volume slider is saved');

    // language switch awards Polyglot (and works in Turkish)
    await palette(page, 'language');
    await page.waitForTimeout(500);
    ok(((await ach(page)).polyglot ?? 0) > 0, '"Polyglot" after switching language');
    await palette(page, 'ozgecmis', { pick: false });
    const trFirst = await page.locator('.palette__row--on .palette__label').innerText();
    ok(/CV/i.test(trFirst), `accent-free search "ozgecmis" finds the CV (${trFirst})`);
    await page.keyboard.press('Escape');

    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- terminal ---------- */
  console.log('\n[terminal]');
  {
    const { context, page } = await boot(browser, base);
    await palette(page, 'open terminal');
    await page.waitForSelector('.terminal-app__input');

    let out = await term(page, 'echo "hello   world"');
    ok(/hello {3}world/.test(out) && !/"/.test(out.split('\n').slice(1).join('')), 'quotes keep spaces and are not printed');
    out = await term(page, 'ls | wc -l');
    ok(/^\s*\d+\s*$/.test(out.split('\n').slice(1).join('\n').trim()), `ls | wc -l prints a number (${out.split('\n').slice(1).join('').trim()})`);
    out = await term(page, 'ls | grep -i term');
    ok(/Terminal/.test(out), 'ls | grep -i term finds Terminal');
    out = await term(page, 'ls | sort -r | head -2');
    ok(out.trim().split('\n').length === 3, 'a three-stage pipeline works');
    ok(((await ach(page)).pipe ?? 0) > 0, '"Plumber" is awarded');
    out = await term(page, 'ls | frobnicate');
    ok(/cannot be used after a pipe/.test(out), 'unknown filters are refused');
    out = await term(page, 'grep');
    ok(/give it a file/.test(out), 'grep without input explains itself');
    out = await term(page, 'tree');
    ok(/├──|└──/.test(out), 'tree draws the folder tree');
    out = await term(page, 'git log --oneline -n 3');
    ok(out.trim().split('\n').length === 4, `git log --oneline -n 3 prints three commits (${out.trim().split('\n').length - 1})`);
    out = await term(page, 'git log -n 1');
    ok(/commit [0-9a-f]{7}/.test(out) && /Author:/.test(out), 'git log shows author and hash');
    out = await term(page, 'neofetch');
    ok((await page.locator('.neofetch .sprite').count()) === 1, 'neofetch shows the twin');
    ok(/Role/.test(await page.locator('.neofetch').innerText()), 'neofetch lists the role');
    out = await term(page, 'neofetch | grep -i role');
    ok(/Role/.test(out), 'neofetch pipes as plain text');
    ok(((await ach(page)).neofetch ?? 0) > 0, '"Show me your specs" is awarded');
    out = await term(page, 'sudo ls');
    ok(/sudoers/.test(out), 'sudo is refused');
    ok(((await ach(page)).sudo ?? 0) > 0, 'hidden "Not in the sudoers file" is awarded');
    out = await term(page, 'sudo hire-me');
    ok(/Permission granted/.test(out) && /contact@yamacbezirgan\.com/.test(out), 'sudo hire-me is granted');
    out = await term(page, 'open Games');
    await page.waitForSelector('.window[data-app-id="file-explorer"]');
    ok(true, 'open <name> opens a folder');
    out = await term(page, 'man pet');
    ok(/pet say/.test(out), 'man page for pet');
    out = await term(page, 'help');
    ok(/neofetch/.test(out) && /guided tour/.test(out), 'help lists the new commands');

    // the twin obeys the terminal
    out = await term(page, 'pet say moo from terminal');
    await page.waitForFunction(() => /moo from terminal/.test(document.querySelector('.pet__bubble')?.textContent || ''), null, { timeout: 4000 }).then(
      () => ok(true, 'pet say makes the twin speak'),
      () => ok(false, 'pet say makes the twin speak')
    );
    out = await term(page, 'pet do flex');
    out = await term(page, 'pet do nonsense');
    ok(/no such move/.test(out), 'unknown moves are reported');
    out = await term(page, 'pet go nowhere');
    ok(/not on the desktop/.test(out), 'unknown places are reported');

    // the classic
    const icons = await page.locator('.desktop-icon').count();
    out = await term(page, 'rm -rf /');
    ok(/kernel panic/.test(out), 'rm -rf / answers with a panic');
    await page.waitForSelector('.melt', { timeout: 4000 });
    ok(true, 'the meltdown overlay appears');
    await page.waitForSelector('.melt__panic', { timeout: 5000 });
    await page.screenshot({ path: path.join(SHOTS, 'meltdown.png') });
    await page.waitForSelector('.melt', { state: 'detached', timeout: 14000 });
    ok(true, 'and goes away by itself');
    ok((await page.locator('.desktop-icon').count()) === icons, `nothing was deleted (${icons} icons)`);
    ok(((await ach(page)).oops ?? 0) > 0, 'hidden "Oops" is awarded');
    // a real rm still works on a real file
    await term(page, 'touch scratch.txt');
    out = await term(page, 'rm scratch.txt');
    ok(/Removed/.test(out), 'plain rm still removes files');

    // go: the twin runs to an icon and hops into it
    await page.locator('.window[data-app-id="file-explorer"] .window__titlebar button[aria-label="Close window"]').click();
    out = await term(page, 'pet go games');
    ok(/On its way to Games/.test(out), 'pet go answers');
    await page.waitForSelector('.window[data-app-id="file-explorer"]', { timeout: 15000 });
    await page.waitForSelector('.room__world .pet', { timeout: 15000 });
    ok(true, 'pet go games: the twin ran to the Games icon and entered its room');

    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- guided tour ---------- */
  console.log('\n[tour]');
  {
    const { context, page } = await boot(browser, base);
    const before = await winCount(page);
    // from the twin's menu
    const box = await page.locator('.pet__hit').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForSelector('.pet__menu');
    const items = await page.$$eval('.pet__menu [role=menuitem]', (els) => els.map((e) => e.textContent.trim()));
    ok(items[1] === 'Show me around', `menu offers the tour (${items.join(' | ')})`);
    await page.locator('.pet__menu [role=menuitem]', { hasText: 'Show me around' }).click();
    await page.waitForSelector('.tour-hud', { timeout: 6000 });
    ok(true, 'the tour panel appears');
    ok(/1 \/ 7/.test(await page.locator('.tour-hud__count').innerText()), 'step 1 of 7');
    await page.screenshot({ path: path.join(SHOTS, 'tour-1.png') });

    // go through every step quickly with Space
    const hudState = () =>
      page.evaluate(() => ({
        hud: !!document.querySelector('.tour-hud'),
        count: document.querySelector('.tour-hud__count')?.textContent?.trim() || '',
        ending: /Take the controls/.test(document.querySelector('.tour-hud__actions')?.textContent || ''),
      }));
    let steps = new Set();
    for (let i = 0; i < 90; i += 1) {
      const st = await hudState();
      if (!st.hud || st.ending) break;
      if (st.count) steps.add(st.count);
      await page.keyboard.press('Space');
      await page.waitForTimeout(650);
    }
    ok(steps.size >= 6, `Space walks through the steps (${[...steps].join(', ')})`);
    await page.waitForSelector('.tour-hud__btn--go', { timeout: 20000 });
    ok(/Take the controls/.test(await page.locator('.tour-hud__btn--go').innerText()), 'the tour ends by offering the controls');
    ok(((await ach(page)).tour ?? 0) > 0, '"Well guided" is awarded');
    await page.screenshot({ path: path.join(SHOTS, 'tour-end.png') });
    ok((await winCount(page)) === before, `every window the tour opened is closed again (${await winCount(page)} vs ${before})`);
    await page.locator('.tour-hud__btn:not(.tour-hud__btn--go)').click();
    await page.waitForSelector('.tour-hud', { state: 'detached' });
    ok(true, 'OK dismisses the panel');
    await page.waitForTimeout(1500);
    const pose = await page.evaluate(() => document.querySelector('.pet')?.className || '');
    ok(!/pet--room/.test(pose), 'the twin is back on the desktop');

    // the whole tour at its own pace: the windows it opens are the real ones, and it closes them again
    await palette(page, 'show me around');
    await page.waitForSelector('.tour-hud');
    const seen = {};
    const t0 = Date.now();
    let last = '';
    while (Date.now() - t0 < 140000) {
      const st = await page.evaluate(() => ({
        hud: !!document.querySelector('.tour-hud'),
        count: document.querySelector('.tour-hud__count')?.textContent?.trim() || '',
        ending: /Take the controls/.test(document.querySelector('.tour-hud__actions')?.textContent || ''),
        wins: [...document.querySelectorAll('.window')].map((w) => w.dataset.appId),
        room: !!document.querySelector('.room__world .pet'),
      }));
      if (!st.hud || st.ending) break;
      const key = st.count;
      if (key && key !== last) last = key;
      const bucket = (seen[st.count] ??= { wins: new Set(), room: false });
      st.wins.forEach((w) => bucket.wins.add(w));
      bucket.room ||= st.room;
      await page.waitForTimeout(400);
    }
    ok(Object.keys(seen).length === 7, `a full run shows all 7 steps (${Object.keys(seen).join(', ')})`);
    ok(seen['3 / 7']?.wins.has('pdf-viewer'), 'CV step opens the CV');
    ok(seen['4 / 7']?.wins.has('github-projects') && seen['4 / 7'].room, 'projects step opens the workshop and the twin goes inside');
    ok(seen['5 / 7']?.wins.has('file-explorer') && seen['5 / 7'].room, 'arcade step walks into the Games room');
    ok(seen['5 / 7']?.wins.has('snake-game'), 'and starts a round of Snake');
    ok(seen['6 / 7']?.wins.has('terminal-app'), 'terminal step opens the terminal');
    await page.waitForSelector('.tour-hud__btn--go', { timeout: 20000 });
    await page.waitForTimeout(400);
    ok((await winCount(page)) === before, `and every one of them is closed again (${await winCount(page)} vs ${before})`);
    await page.locator('.tour-hud__btn--go', { hasText: 'Take the controls' }).click();
    await page.waitForSelector('.pet-ctl', { timeout: 6000 });
    ok(true, '"Take the controls" hands the twin over');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.pet-ctl', { state: 'detached', timeout: 6000 });

    // Esc stops it, and the twin can be driven afterwards
    await palette(page, 'show me around');
    await page.waitForSelector('.tour-hud');
    await page.waitForTimeout(900);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.tour-hud', { state: 'detached', timeout: 8000 });
    ok(true, 'Esc stops the tour');
    ok((await winCount(page)) === before, 'and leaves no windows behind');
    // Esc stops it even when a text field (the terminal) has the focus, and Space does not steal typing there
    await palette(page, 'open terminal');
    await page.waitForSelector('.terminal-app__input');
    await page.locator('.terminal-app__input').focus();
    await page.evaluate(() => window.dispatchEvent(new Event('pet:tour')));
    await page.waitForSelector('.tour-hud', { timeout: 6000 });
    await page.locator('.terminal-app__input').focus();
    await page.keyboard.type('a b');
    ok((await page.locator('.terminal-app__input').inputValue()) === 'a b', 'typing a space in the terminal is not taken by the tour');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.tour-hud', { state: 'detached', timeout: 8000 });
    ok(true, 'Esc stops the tour while the terminal has the focus');
    await page.locator('.window[data-app-id="terminal-app"] button[aria-label="Close window"]').click();
    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- music player ---------- */
  console.log('\n[music player]');
  {
    const { context, page } = await boot(browser, base, {
      init: () => {
        window.__music = [];
        window.addEventListener('yb:music', (e) => window.__music.push(e.detail));
        const Orig = window.AudioContext;
        window.AudioContext = class extends Orig {
          constructor(...a) {
            super(...a);
            window.__ctx = this;
          }
        };
      },
    });
    // the player is a hidden place: open it the way a window message does
    await page.evaluate(() => window.postMessage({ type: 'OPEN_WINDOW', appId: 'music-player-app', title: 'Music Player' }, location.origin));
    await page.waitForSelector('.mp');
    ok((await page.locator('.mp__row').count()) === 4, 'four tracks');
    ok(!(await page.locator('text=placeholder').count()), 'no demo placeholder any more');
    await page.screenshot({ path: path.join(SHOTS, 'music-idle.png') });
    await page.locator('.mp__play').click();
    await page.waitForFunction(() => window.__music.some((m) => m.playing), null, { timeout: 4000 });
    ok(true, 'Play starts the music (state event)');
    await page.waitForTimeout(1200);
    const t1 = await page.evaluate(() => window.__ctx?.currentTime ?? 0);
    ok((await page.evaluate(() => window.__ctx?.state)) === 'running', 'the audio context is running');
    await page.waitForTimeout(800);
    const t2 = await page.evaluate(() => window.__ctx?.currentTime ?? 0);
    ok(t2 > t1 + 0.5, 'audio time advances');
    ok((await page.locator('.mp__led--on').count()) === 1, 'the LED lights up');
    const time1 = await page.locator('.mp__progress span').first().innerText();
    await page.waitForTimeout(1300);
    const time2 = await page.locator('.mp__progress span').first().innerText();
    ok(time1 !== time2, `the progress counter moves (${time1} -> ${time2})`);
    const title1 = await page.locator('.mp__title').innerText();
    await page.locator('.mp__controls button[aria-label="Next track"]').click();
    await page.waitForTimeout(300);
    ok((await page.locator('.mp__title').innerText()) !== title1, 'next track changes the title');

    // the twin dances along (it announces it with a toast-worthy achievement)
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('yb-ach') || '{"got":{}}').got.dance, null, { timeout: 25000 }).then(
      () => ok(true, 'the twin dances to the music ("Dance floor")'),
      () => ok(false, 'the twin dances to the music ("Dance floor")')
    );
    await page.screenshot({ path: path.join(SHOTS, 'music-dance.png') });

    // minimise: the music goes on
    const stops = await page.evaluate(() => window.__music.filter((m) => !m.playing).length);
    await page.locator('.window[data-app-id="music-player-app"] button[aria-label="Minimize window"]').click();
    await page.waitForTimeout(600);
    ok((await page.evaluate(() => window.__music.filter((m) => !m.playing).length)) === stops, 'minimising does not stop the music');
    await page.locator('.taskbar__item', { hasText: 'Music Player' }).click();
    await page.waitForSelector('.mp__led--on');
    ok(true, 'restoring the window shows it still playing');

    // three different tracks make a DJ
    for (const i of [0, 1, 2]) {
      await page.locator('.mp__row').nth(i).click();
      await page.waitForTimeout(300);
    }
    ok(((await ach(page)).dj ?? 0) > 0, '"DJ" after three tracks');

    // closing it stops the music
    await page.locator('.window[data-app-id="music-player-app"] button[aria-label="Close window"]').click();
    await page.waitForFunction(() => window.__music[window.__music.length - 1]?.playing === false, null, { timeout: 3000 });
    ok(true, 'closing the window stops the music');
    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- games report to achievements ---------- */
  console.log('\n[games]');
  {
    const { context, page } = await boot(browser, base);
    for (const name of ['snake', 'tetris', '2048', 'minesweeper']) {
      await palette(page, name);
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('yb-ach') || '{"got":{}}').got.arcade, null, { timeout: 5000 }).then(
      () => ok(true, 'playing all four games awards "Arcade regular"'),
      () => ok(false, 'playing all four games awards "Arcade regular"')
    );
    const gameWindows = await page.locator('.window').count();
    ok(gameWindows === 4, `four game windows (${gameWindows})`);
    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- rooms + persistence ---------- */
  console.log('\n[rooms + persistence]');
  {
    const { context, page } = await boot(browser, base);
    await page.locator('.desktop-icon[data-node-id="games"]').dblclick();
    await page.locator('.window').last().waitFor();
    await page.locator('.room-toggle, [data-room-toggle], .window button[title*="room" i]').first().click().catch(() => {});
    await page.waitForSelector('.room', { timeout: 6000 }).catch(() => {});
    if (await page.locator('.room').count()) {
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('yb-ach') || '{"got":{}}').got.room, null, { timeout: 4000 }).then(
        () => ok(true, 'entering a room awards "Home sweet home"'),
        () => ok(false, 'entering a room awards "Home sweet home"')
      );
    } else ok(false, 'the room toggle opens the room');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    ok(((await ach(page)).room ?? 0) > 0, 'achievements survive a reload');
    await page.locator('.tray-x__trophy').click();
    await page.waitForSelector('.ach__row--on');
    ok((await page.locator('.ach__row--on').count()) >= 1, 'and show up in the window after reload');
    // reset
    await page.locator('.ach__reset').click();
    await page.locator('.ach__reset').click();
    await page.waitForTimeout(300);
    ok((await page.locator('.ach__row--on').count()) === 0, 'Reset progress clears them (two clicks)');
    await context.close();
  }

  /* ---------- the photos room ---------- */
  console.log('\n[photos room]');
  {
    const { context, page } = await boot(browser, base);
    await page.evaluate(() => window.postMessage({ type: 'OPEN_WINDOW', appId: 'photo-gallery-app', title: 'Photos' }, location.origin));
    await page.waitForSelector('.photo-gallery-app .room-toggle');
    const total = await page.locator('.photo-gallery-app__thumbnail').count();
    await page.locator('.photo-gallery-app .room-toggle').click();
    await page.waitForSelector('.room[data-room-theme="pictures"]');
    await page.waitForSelector('.room__world .pet', { timeout: 8000 });
    ok(true, 'the toggle opens the gallery hall and the twin goes in');
    const props = await page.locator('.room__prop[data-prop-id]:not([data-prop-id="__exit"])').count();
    ok(props === total && total >= 3, `one easel per picture (${props}/${total})`);
    ok((await page.locator('.room__overlay').count()) === total, 'every easel shows its photo');
    ok(((await ach(page)).gallery ?? 0) > 0, '"Gallery night" is awarded');
    await page.locator('.room__prop[data-prop-id]:not([data-prop-id="__exit"])').nth(1).dispatchEvent('click');
    await page.waitForFunction(() => /^2 \//.test(document.querySelector('.photo-gallery-app__counter')?.textContent?.trim() || ''), null, { timeout: 12000 }).then(
      () => ok(true, 'using an easel shows that picture in the viewer'),
      () => ok(false, 'using an easel shows that picture in the viewer')
    );
    await page.screenshot({ path: path.join(SHOTS, 'photos-room.png') });
    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- special days, night light, night owl ---------- */
  console.log('\n[days + clock]');
  {
    let c = await boot(browser, base, { query: '?day=10-29' });
    await c.page.waitForFunction(() => /Republic Day/.test(document.querySelector('.pet__bubble')?.textContent || ''), null, { timeout: 14000 }).then(
      () => ok(true, 'on 29 October the twin wishes a happy Republic Day'),
      () => ok(false, 'on 29 October the twin wishes a happy Republic Day')
    );
    ok(((await ach(c.page)).holiday ?? 0) > 0, 'hidden "Red-letter day" is awarded');
    await c.context.close();

    c = await boot(browser, base, { query: '?day=11-10' });
    await c.page.waitForFunction(() => /Atat/.test(document.querySelector('.pet__bubble')?.textContent || ''), null, { timeout: 14000 }).then(
      () => ok(true, 'on 10 November it remembers, quietly'),
      () => ok(false, 'on 10 November it remembers, quietly')
    );
    await c.context.close();

    c = await boot(browser, base, { query: '?day=06-05' });
    await c.page.waitForTimeout(2000);
    ok(((await ach(c.page)).holiday ?? 0) === 0, 'an ordinary day awards nothing');
    await c.context.close();

    // 02:30 on the visitor's clock
    c = await boot(browser, base, { init: () => { Date.prototype.getHours = function () { return 2; }; } });
    await c.page.waitForFunction(() => JSON.parse(localStorage.getItem('yb-ach') || '{"got":{}}').got.owl, null, { timeout: 12000 }).then(
      () => ok(true, 'hidden "Night owl" after midnight'),
      () => ok(false, 'hidden "Night owl" after midnight')
    );
    await c.page.locator('.desktop-icon[data-node-id="games"]').dblclick();
    await c.page.locator('.window').last().waitFor();
    await c.page.locator('.room-toggle').click();
    await c.page.waitForSelector('.room');
    ok((await c.page.locator('.room').getAttribute('data-tod')) === 'night', 'the room is dimmed at night');
    await c.page.screenshot({ path: path.join(SHOTS, 'room-night.png') });
    await c.context.close();
  }

  /* ---------- sound effects reach the synth ---------- */
  console.log('\n[sound effects]');
  {
    const { context, page } = await boot(browser, base, {
      init: () => {
        window.__voices = 0;
        const wrap = (name) => {
          const orig = AudioContext.prototype[name];
          AudioContext.prototype[name] = function (...a) {
            window.__voices += 1;
            return orig.apply(this, a);
          };
        };
        wrap('createOscillator');
        wrap('createBufferSource');
      },
    });
    ok((await page.evaluate(() => window.__voices)) === 0, 'nothing is made while sound is off');
    await page.locator('.tray-x__btn[aria-pressed]').click();
    await page.waitForTimeout(600);
    const afterToggle = await page.evaluate(() => window.__voices);
    ok(afterToggle > 0, `switching sound on plays a chime (${afterToggle} voices)`);
    const box = await page.locator('.pet__hit').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.locator('.pet__menu-control').click();
    await page.waitForSelector('.pet-ctl');
    const v0 = await page.evaluate(() => window.__voices);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1300);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(900);
    const v1 = await page.evaluate(() => window.__voices);
    ok(v1 - v0 >= 4, `footsteps and a jump make sounds (${v1 - v0} voices)`);
    await page.locator('.tray-x__btn[aria-pressed]').click();
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur()); // (Space would press the speaker again)
    const v2 = await page.evaluate(() => window.__voices);
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    ok((await page.evaluate(() => window.__voices)) === v2, 'and it is quiet again once sound is off');
    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- projects: the build's snapshot saves the day when GitHub says no ---------- */
  console.log('\n[projects snapshot]');
  {
    const fs = require('fs');
    const { DIST } = require('./lib.cjs');
    const file = path.join(DIST, 'data', 'github-repos.json');
    const existed = fs.existsSync(file);
    const keep = existed ? fs.readFileSync(file) : null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const repo = (id, name, language) => ({ id, name, description: 'from the snapshot', html_url: 'https://github.com/ymcbzrgn/' + name, homepage: null, stargazers_count: 0, language, updated_at: '2026-01-01T00:00:00Z', topics: [], fork: false, owner: { login: 'ymcbzrgn' }, default_branch: 'main' });
    fs.writeFileSync(file, JSON.stringify({ generatedAt: Date.now() - 3 * 86400000, repos: [repo(1, 'snapshot-one', 'TypeScript'), repo(2, 'snapshot-two', 'Python')] }));
    try {
      const { context, page } = await boot(browser, base);
      await page.route('https://api.github.com/**', (r) => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"rate limit exceeded"}' }));
      await palette(page, 'projects');
      await page.waitForSelector('.repo-card', { timeout: 8000 });
      const names = await page.$$eval('.repo-card', (els) => els.map((e) => e.dataset.repo));
      ok(names.includes('snapshot-one') && names.includes('snapshot-two'), `a rate-limited visitor still sees the projects (${names.join(', ')})`);
      ok(/cached data/i.test(await page.locator('.github-projects__warning-banner').innerText().catch(() => '')), 'and is told it is saved data');
      await context.close();

      // without the file the old behaviour is unchanged (an error, nothing invented)
      fs.rmSync(file);
      const second = await boot(browser, base);
      await second.page.route('https://api.github.com/**', (r) => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"rate limit exceeded"}' }));
      await palette(second.page, 'projects');
      await second.page.waitForTimeout(1500);
      ok((await second.page.locator('.repo-card').count()) === 0, 'no snapshot, no cache: no repositories are invented');
      await second.context.close();
    } finally {
      if (keep) fs.writeFileSync(file, keep);
      else {
        fs.rmSync(file, { force: true });
        try {
          fs.rmdirSync(path.dirname(file));
        } catch {
          /* not empty: leave it */
        }
      }
    }
  }

  /* ---------- first visit: the welcome window offers the tour ---------- */
  console.log('\n[welcome -> tour]');
  {
    const { context, page } = await boot(browser, base, { settings: { onboarded: false }, noPet: true });
    await page.waitForSelector('.welcome', { timeout: 6000 });
    const cta = page.locator('.welcome__btn', { hasText: 'Show me around' });
    ok((await cta.count()) === 1, 'the welcome window has a "Show me around" button');
    await cta.click();
    await page.waitForSelector('.welcome', { state: 'detached' });
    ok(true, 'it closes the welcome window');
    // the twin may still be running in: the tour starts as soon as it has made its entrance
    await page.waitForSelector('.tour-hud', { timeout: 20000 });
    ok(true, 'and the tour starts');
    await page.waitForTimeout(1200);
    const x = await page.evaluate(() => document.querySelector('.pet')?.getBoundingClientRect().left ?? -999);
    ok(x > -20, `the twin is on screen for it (x=${Math.round(x)})`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.tour-hud', { state: 'detached', timeout: 8000 });
    ok(page.__errors.length === 0, 'no console errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await context.close();
  }

  /* ---------- phones get none of this ---------- */
  console.log('\n[phone]');
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    await ctx.addInitScript((e) => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, ...e } }, version: 0 })), {});
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    ok(!(await page.locator('.tray-x').count()) && !(await page.locator('.taskbar').count()), 'no taskbar extras on a phone');
    ok(!(await page.locator('.palette').count()), 'no palette on a phone');
    ok(errors.length === 0, 'no errors on a phone' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
