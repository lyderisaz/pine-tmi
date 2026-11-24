// usage: node proto_test_v16.js <playwright dir> <html file> <shots dir> — clicks through the Pušis prototype, prints problems
const [, , pwDir, file, out] = process.argv;
const { chromium } = require(pwDir); const path = require('path'); const zlib = require('zlib');
const problems = [];
function zip(files) { // [{ name, text }] → a zip with deflated entries, like Google Calendar's export
  const parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name), raw = Buffer.from(f.text), data = zlib.deflateRawSync(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, name, data); central.push(ch, name); off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}
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
  await shot('settings_page');
  await nav('today'); await p.click('[data-a=dateMove][data-n="0"]').catch(() => {});
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
  // Help (v8): ? opens at the current page's section; method tab
  await nav('plan'); await p.click('[data-a=help]'); await expect('#h-plan', 'help has a Plan tomorrow section');
  const top = await p.evaluate(() => document.getElementById('h-plan').getBoundingClientRect().top); if (top < 0 || top > 200) problems.push('help did not open at the Plan tomorrow section: ' + top);
  await p.click('[data-a=helpTab][data-t=method]'); await expect('#h-tree >> text=pine tree', 'method tab: the pine tree');
  await expect('#h-elephant', 'method tab: elephant technique'); await shot('help');
  // Covey matrix lens (v10)
  await p.click('[data-a=menu]'); if (!await p.isChecked('[data-c=setting][data-k=covey]')) problems.push('Covey lens should be on by default');
  await expect('[data-c=setting][data-k=urgentDays]', '"urgent days" setting appears with the lens');
  await nav('matrix');
  await expect('#q1 >> text=Prepare the product launch plan', 'Q1: ! + due within 3 days');
  await expect('#q2 >> text=Certificate essay', 'Q2: ! + far deadline');
  await expect('#q2 >> text=Translate brochure', 'Q2: serves a signed goal, not urgent');
  await expect('#q3 >> text=Club board', 'Q3: due today, not important');
  await expect('#q4 >> text=Write case study', 'Q4: no !, no goal, no deadline');
  await expect('text=Q2 share', 'Q2 share shown for this week'); await shot('matrix');
  await nav('areas'); await p.click('[data-a=pickArea][data-slot="1"]'); await expect('table.sheet .q.q1', 'Q tags on the task sheet');
  await nav('plan'); await p.click('[data-a=step][data-n="4"]'); await expect('text=Q2 tasks picked', 'Q2 note in Plan tomorrow');
  // Time ledger lens (v9)
  await p.click('[data-a=menu]'); if (!await p.isChecked('[data-c=setting][data-k=ledger]')) problems.push('ledger lens should be on by default');
  await expect('[data-a=go][data-v=ledger]', 'Balance tab appears when the lens is on');
  await nav('areas'); await p.click('[data-a=pickArea][data-slot="1"]');
  for (const [code, h] of [['1.1', '3'], ['1.3', '1'], ['1.5', '1']]) {
    await p.click(`table.sheet tr:has(td.code:text-is("${code}")) input[data-c=taskDone]`);
    await p.waitForSelector('dialog[open] input[name=actual]'); await p.fill('dialog input[name=actual]', h); await p.click('dialog button.pri');
  }
  await nav('today'); await p.click('[data-a=dateMove][data-n="0"]').catch(() => {});
  await expect('text=Lost time', 'lost-time card on Today');
  await p.fill('form[data-f=addLost] input[name=min]', '20'); await p.selectOption('form[data-f=addLost] select[name=why]', 'waiting'); await p.click('form[data-f=addLost] button');
  await expect('.card:has-text("Lost time") >> text=waiting', 'lost time recorded');
  await nav('ledger'); await expect('text=×1.43', 'estimating factor 5 h / 3.5 h = ×1.43');
  await expect('.card:has-text("Lost time") >> text=waiting', 'lost time in the balance'); await shot('balance');
  await expect('text=Covey quadrants', 'Covey card in Balance when both lenses are on');
  await p.click('[data-a=balKind][data-k=month]'); await p.click('[data-a=balKind][data-k=year]'); await p.click('[data-a=balMove][data-n="-1"]');
  // v11: load demo keeps settings
  await p.click('[data-a=menu]');
  await p.click('[data-a=loadDemo]'); if (await p.isChecked('[data-c=setting][data-k=flapsi]') || await p.inputValue('[data-c=setting][data-k=dayStart]') !== '7') problems.push('settings were reset by load demo');
  // v13: projects — at most 3 active, tasks belong to a project
  await nav('projects'); await expect('text=No active project', 'empty projects view');
  for (const n of ['Seminar', 'Audits', 'Pusis 2']) { await p.click('[data-a=projectEdit]:not([data-id])'); await p.fill('dialog input[name=name]', n); await p.fill('dialog input[name=next]', 'next for ' + n); await p.click('dialog button.pri'); }
  await expect('text=▶ active · 3 / 3', 'three active projects');
  await p.click('[data-a=projectEdit]:not([data-id])'); await p.fill('dialog input[name=name]', 'Fourth');
  if (await p.inputValue('dialog select[name=status]') !== 'planned') problems.push('a 4th project should start as planned');
  await p.selectOption('dialog select[name=status]', 'active'); await p.click('dialog button.pri');
  await p.waitForSelector('.toast:has-text("At most 3 active")'); if (!await p.$('dialog[open]')) problems.push('refused project dialog should stay open');
  await p.selectOption('dialog select[name=status]', 'paused'); await p.click('dialog button.pri');
  await expect('text=⏸ paused · 1', 'fourth project saved as paused');
  await nav('areas'); await p.click('button.pri[data-a=taskEdit]'); await p.fill('dialog input[name=what]', 'Prepare the seminar programme');
  await p.selectOption('dialog select[name=project]', { label: 'Seminar' }); await p.click('dialog button.pri');
  await expect('text=📁 Seminar', 'project tag on the task sheet');
  await nav('projects'); await expect('.card:has-text("Seminar") >> text=Prepare the seminar programme', 'task listed on its project card');
  await shot('projects');
  // v13: weekly rhythm — a repeating block, skipped one day, changed another, edited without rewriting the past
  await p.click('[data-a=menu]'); await p.click('button.pri[data-a=ruleEdit]');
  await p.fill('dialog input[name=title]', 'Strength training');
  for (const d of [0, 1, 2, 3, 4, 5, 6]) await p.setChecked(`dialog input[name=d${d}]`, true);
  await p.selectOption('dialog select[name=from]', '19:00'); await p.selectOption('dialog select[name=to]', '20:00'); await p.click('dialog button.pri');
  await expect('text=every day', 'rhythm listed in Settings');
  await nav('today'); await p.click('[data-a=dateMove][data-n="0"]').catch(() => {});
  await expect('.slot:has-text("🔁 Strength training")', 'rhythm block on Today');
  await p.click('.slot:has-text("🔁 Strength training")'); await p.click('dialog button:has-text("skip this day")');
  if (await p.$('.slot:has-text("Strength training")')) problems.push('skipped rhythm block still shown');
  await p.click('[data-a=dateMove][data-n="1"]'); await p.click('.slot:has-text("🔁 Strength training")');
  await p.selectOption('dialog select[name=from]', '18:00'); await p.selectOption('dialog select[name=to]', '19:00'); await p.click('dialog button.pri');
  await expect('.slot:has-text("Strength training") >> text=18:00–19:00', 'one-day change shown');
  await p.click('[data-a=dateMove][data-n="1"]'); await expect('.slot:has-text("Strength training") >> text=19:00–20:00', 'the day after keeps the rhythm');
  await p.evaluate(() => { S.rules[0].from = '2026-01-01'; save(); });
  await p.click('[data-a=menu]'); await p.click('[data-a=ruleEdit][data-id]'); await p.fill('dialog input[name=title]', 'Strength and stretching'); await p.click('dialog button.pri');
  const rules = await p.evaluate(() => S.rules.map(r => [r.title, r.from === TODAY, r.to === addDays(TODAY, -1)]));
  if (!(rules.length === 2 && rules[0][0] === 'Strength training' && rules[0][2] && rules[1][0] === 'Strength and stretching' && rules[1][1])) problems.push('editing a rhythm must keep the past: ' + JSON.stringify(rules));
  await shot('rhythm');
  // v15: time for a key area's tasks stays free for them
  await nav('today'); await p.click('[data-a=dateMove][data-n="0"]').catch(() => {});
  const freeBefore = await p.textContent('.card h3:has-text("available")');
  await p.click('[data-a=menu]'); await p.click('button.pri[data-a=ruleEdit]');
  await p.fill('dialog input[name=title]', 'Sales time');
  for (const d of [0, 1, 2, 3, 4, 5, 6]) await p.setChecked(`dialog input[name=d${d}]`, true);
  await p.selectOption('dialog select[name=from]', '15:00'); await p.selectOption('dialog select[name=to]', '17:00');
  await p.selectOption('dialog select[name=kind]', 'area'); await p.click('dialog button.pri');
  await p.waitForSelector('.toast:has-text("needs its key area")'); await p.selectOption('dialog select[name=area]', '1'); await p.click('dialog button.pri');
  await expect('text=time for tasks', 'area time listed in Settings');
  await nav('today'); await p.click('[data-a=dateMove][data-n="0"]').catch(() => {});
  await expect('.slot.areatime:has-text("Sales time")', 'area time shown on Today');
  if (await p.textContent('.card h3:has-text("available")') !== freeBefore) problems.push('area time must not reduce the free time');
  await nav('plan'); await p.click('[data-a=step][data-n="4"]');
  const opt = await p.textContent('[data-c=pickTime] >> nth=0 >> option[value="15"]');
  if (!/15:00 · 1 /.test(opt)) problems.push('start time list should name the area time: ' + opt);
  await p.selectOption('[data-c=pickTime] >> nth=0', '15'); await p.waitForTimeout(300);
  if (await p.$('.toast:has-text("overlaps")')) problems.push('a task inside area time must not warn about overlap');
  await expect('.card:has-text("Tomorrow so far") .slot.planned', 'task placed inside area time');
  await expect('.card:has-text("Tomorrow so far") .slot.areatime', 'area time still shown around the task');
  const picked = await p.evaluate(() => { const s = document.querySelector('[data-c=pickTime]'); return s.options[s.selectedIndex].text; });
  if (/busy/.test(picked)) problems.push('the task own block must not make its hour busy: ' + picked);
  await shot('areatime');
  // v16: calendar import — a .ics file, Google's .zip, import again replaces, hidden titles, remove
  const Z = await p.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [t1, t2] = await p.evaluate(() => [addDays(TODAY, 1), addDays(TODAY, 2)]), ymd = s => s.replace(/-/g, '');
  const ev = (uid, title, s, a, z) => ['BEGIN:VEVENT', 'UID:' + uid, 'SUMMARY:' + title, `DTSTART;TZID=${Z}:${ymd(s)}T${a}00`, `DTEND;TZID=${Z}:${ymd(s)}T${z}00`, 'END:VEVENT'];
  const vcal = (name, ...evs) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...(name ? ['X-WR-CALNAME:' + name] : []), ...evs.flat(), 'END:VCALENDAR'].join('\r\n');
  const choose = async (sel, name, buffer) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(sel)]); await fc.setFiles({ name, mimeType: 'text/calendar', buffer }); };
  const work = vcal('Work', ev('w1', 'Board meeting', t1, '0815', '0930'), ['BEGIN:VEVENT', 'UID:w2', 'SUMMARY:Conference', 'DTSTART;VALUE=DATE:' + ymd(t1), 'DTEND;VALUE=DATE:' + ymd(t2), 'END:VEVENT']);
  await nav('plan'); await p.click('[data-a=step][data-n="2"]');
  await choose('[data-a=icsImport]', 'work.ics', Buffer.from(work));
  await p.waitForSelector('.toast:has-text("Work: 2 events, 1 overlap other blocks")');
  await expect('.slot.booked:has-text("📅 Board meeting (08:15–09:30)")', 'imported meeting in Plan tomorrow');
  await expect('.hours >> text=Conference', 'all-day event above the hours');
  await shot('calendar');
  const family = vcal('', ev('f1', 'School run', t1, '1530', '1600'));
  await p.click('[data-a=menu]');
  await choose('[data-a=icsImport]', 'calendar-export.zip', zip([{ name: 'me@example.test.ics', text: vcal('Work', ev('w1', 'Board meeting', t1, '1000', '1100')) }, { name: 'Family.ics', text: family }]));
  await p.waitForSelector('.toast:has-text("Family: 1 event")');
  await expect('.row:has-text("Work") >> text=1 event until', 'Work replaced by the new import, not added');
  await expect('.row:has-text("Family") >> text=1 event until', 'second calendar from the zip, named after its file');
  await shot('calendar_settings');
  await nav('plan'); await p.click('[data-a=step][data-n="2"]');
  if (await p.$('text=Board meeting (08:15–09:30)')) problems.push('old meeting time kept after import again');
  await expect('.slot.booked:has-text("📅 Board meeting")', 'meeting at its new time');
  await p.click('[data-a=menu]'); await p.click('[data-c=setting][data-k=icsHide]');
  await choose('[data-a=icsImport]', 'Family.ics', Buffer.from(family));
  // the file is read asynchronously: wait for the import itself, not for an earlier toast
  await p.waitForFunction(() => S.blocks.some(b => b.src === 'ics' && b.cal === 'Family' && b.title !== 'School run'), null, { timeout: 5000 }).catch(() => {});
  const fam = await p.evaluate(() => S.blocks.filter(b => b.src === 'ics' && b.cal === 'Family').map(b => b.title).join());
  if (fam !== 'Busy') problems.push('hidden titles should import as Busy: ' + fam);
  await p.click('[data-a=icsRemove][data-cal=Work]');
  const left = await p.evaluate(() => S.blocks.filter(b => b.src === 'ics').map(b => b.cal).join());
  if (left !== 'Family') problems.push('remove should clear only Work: ' + left);
  await choose('[data-a=icsImport]', 'notes.ics', Buffer.from('hello'));
  await p.waitForSelector('.toast:has-text("notes: no events")');
  // phone width
  await p.setViewportSize({ width: 390, height: 800 });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) problems.push('horizontal overflow at 390 px: ' + over);
  await shot('phone');
  await b.close();
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all checks passed');
})().catch(e => { console.log('TEST CRASH', e.message, '\n', problems.join('\n')); process.exit(1); });
