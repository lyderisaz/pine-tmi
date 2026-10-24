// usage: node proto_test_v7.js <playwright dir> <html file> <shots dir> — clicks through the Pušis prototype, prints problems
const [, , pwDir, file, out] = process.argv;
const { chromium } = require(pwDir); const path = require('path');
const problems = [];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'assert' || /Assertion failed/.test(m.text())) problems.push('console: ' + m.text()); else if (/selftest/.test(m.text())) console.log(m.text()); });
  p.on('pageerror', e => problems.push('pageerror: ' + e.message));
  p.on('dialog', d => d.accept());
  const shot = n => p.screenshot({ path: path.join(out, `proto_${n}.png`), fullPage: true });
  const nav = async v => { await p.click(`[data-a=go][data-v=${v}]`); };
  const expect = async (sel, what) => { if (!await p.$(sel)) problems.push('missing: ' + what); };
  await p.goto('file:///' + file + '#test');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  // empty start: seeded key areas
  await nav('areas'); await expect('text=Prof. assoc / NGO', 'seeded key areas');
  // demo data via menu
  await p.click('[data-a=menu]'); await p.click('[data-a=loadDemo]');
  await nav('today'); await expect('text=Prepare the product launch plan', 'planned task on Today');
  await expect('text=late', 'overdue task shown (K2)');
  await shot('today');
  // book a free hour
  await p.click('.slot:not(.booked):not(.planned) >> nth=0'); await p.fill('dialog input[name=title]', 'Dentist'); await p.click('dialog button.pri');
  await expect('text=Dentist', 'booked block added');
  // goals: edit and sign the draft
  await nav('goals'); await shot('goals');
  await p.click('text=Run a half marathon >> xpath=ancestor::div[contains(@class,"row")] >> button'); await p.click('dialog >> text=✍ sign (commit)');
  const marks = await p.evaluate(() => JSON.parse(localStorage.getItem('pusis.proto.v1')).goals.filter(g => g.mark === 'draft').length);
  if (marks !== 0) problems.push('sign did not commit the draft goal');
  // key areas triple view: select task, add activity, add task
  await nav('areas'); await p.click('text=Prepare the product launch plan'); await expect('text=Cost estimate', 'activity sheet');
  await p.click('[data-a=actEdit][data-task]'); await p.fill('dialog input[name=what]', 'Check venue'); await p.click('dialog button.pri');
  await expect('text=Check venue', 'new activity'); await shot('areas');
  await p.click('[data-a=taskEdit]:not([data-id])'); await p.fill('dialog input[name=what]', 'Write case study'); await p.click('dialog button.pri');
  await expect('text=Write case study', 'new task');
  // ideas
  await p.click('[data-a=pickArea][data-slot="0"]'); await p.click('[data-a=ideaToTask]'); await p.click('dialog button.pri');
  const ideas = await p.evaluate(() => JSON.parse(localStorage.getItem('pusis.proto.v1')).ideas.map(i => i.status).join());
  if (ideas !== 'transferred') problems.push('idea not transferred: ' + ideas);
  // capture a note with the keyboard shortcut, then sort it
  await p.keyboard.press('n'); await p.fill('dialog input[name=text]', 'Call the bank'); await p.click('dialog button.pri');
  await nav('notes'); await expect('text=Call the bank', 'captured note'); await p.click('.row:has-text("Call the bank") [data-to=minor]');
  await nav('dont'); await expect('text=Call the bank', 'note → don\'t forget');
  // plan tomorrow: all 7 steps
  await nav('plan'); await shot('plan1');
  await p.click('[data-a=close][data-to=tomorrow] >> nth=0');
  for (let s = 2; s <= 7; s++) {
    await p.click(`[data-a=step][data-n="${s}"]`);
    if (s === 4) { await p.click('[data-c=pick] >> nth=0'); await p.selectOption('[data-c=pickTime] >> nth=1', '14'); await shot('plan4'); }
    if (s === 5) { if (await p.$('[data-c=pickAct]')) await p.click('[data-c=pickAct] >> nth=0'); }
  }
  await p.click('[data-a=finish]'); await expect('text=14:00', 'planned block on tomorrow');
  await shot('tomorrow');
  // settings (v5): day window, review day, Flapsi off
  await p.click('[data-a=menu]');
  await p.selectOption('[data-c=setting][data-k=dayStart]', '7'); await p.selectOption('[data-c=setting][data-k=dayEnd]', '22');
  await p.selectOption('[data-c=setting][data-k=reviewDay]', String(new Date().getDay())); await p.click('[data-c=setting][data-k=flapsi]');
  await shot('settings_page'); await nav('today'); await p.click('[data-a=dateMove][data-n="0"]').catch(() => {});
  await expect('.hours >> text=07:00', 'day starts 07:00 after setting'); await expect('.hours >> text=21:00', 'day runs to 22:00 after setting');
  await expect('text=weekly review day', 'review-day badge on the chosen weekday');
  if (await p.locator('#flapsi').isVisible()) problems.push('Flapsi pill still visible after switching it off');
  await shot('settings');
  // INFO (v7): notes form (multi-line) → reference → search; people → offered as "who"
  await nav('notes'); await p.fill('form[data-f=addNote] textarea', 'Meeting notes\nline two\nline three'); await p.press('form[data-f=addNote] textarea', 'Control+Enter');
  await expect('.row:has-text("line three")', 'multi-line note added with Ctrl+Enter');
  await p.click('.row:has-text("line three") [data-to=ref]'); await p.click('dialog button.pri');
  await nav('ref'); await expect('.row:has-text("Meeting notes")', 'note moved to Reference with its first line as title');
  await p.fill('[data-q=ref]', 'wi-fi'); if (await p.locator('.row:has-text("Meeting notes")').isVisible()) problems.push('reference search did not filter');
  await expect('.row:has-text("Office Wi-Fi")', 'reference search finds Wi-Fi');
  await nav('people'); await p.click('[data-a=personEdit]:not([data-id])'); await p.fill('dialog input[name=name]', 'Jonas'); await p.fill('dialog input[name=phone]', '+370 611 11111'); await p.click('dialog button.pri');
  await expect('a[href="tel:+37061111111"]', 'person with a tel: link');
  await nav('areas'); await p.click('[data-a=pickArea][data-slot="1"]'); await p.click('[data-a=taskEdit]:not([data-id])');
  if (!await p.locator('datalist#people option[value="Jonas"]').count()) problems.push('person not offered as "who"');
  await p.keyboard.press('Escape'); await shot('info');
  // phone width
  await p.setViewportSize({ width: 390, height: 800 });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) problems.push('horizontal overflow at 390 px: ' + over);
  await shot('phone');
  await b.close();
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all checks passed');
})().catch(e => { console.log('TEST CRASH', e.message, '\n', problems.join('\n')); process.exit(1); });
