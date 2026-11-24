// usage: node docs/screenshots.js <playwright dir> <absolute path to index.html>
// Makes the README pictures from the demo data, with a fixed date, plus example projects and a weekly rhythm.
const [, , pwDir, file] = process.argv;
const { chromium } = require(pwDir); const path = require('path');
const out = path.join(__dirname, 'images');

(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  p.on('pageerror', e => { console.log('pageerror', e.message); process.exitCode = 1; });
  await p.clock.install({ time: new Date('2026-11-25T09:00:00') });
  await p.goto('file:///' + file);
  await p.evaluate(() => {
    localStorage.clear(); S = demo();
    const g = t => S.goals.find(x => x.title.startsWith(t)).id, t = w => S.tasks.find(x => x.what.startsWith(w));
    const proj = (name, status, areaSlot, goalId, money, next) => { const x = { id: id(), name, status, area: areaSlot, goalId, money, next, decision: '', link: '' }; S.projects.push(x); return x.id; };
    S.projects = [];
    const launch = proj('Product launch', 'active', 1, g('Launch'), 'Launch → first 20 customers', 'Finish the launch plan');
    const cert = proj('Project management certificate', 'active', 1, g('Project management'), 'Better-paid projects next year', 'Write chapter 1 of the essay');
    proj('Family trip', 'planned', 3, g('Healthy'), '', 'Choose the dates');
    proj('Club newsletter', 'maintained', 5, null, '', '');
    t('Prepare the product launch').projectId = launch; t('Translate brochure').projectId = launch; t('Certificate essay').projectId = cert;
    S.rules = [];
    const rule = (title, days, start, end, areaSlot, kind) => S.rules.push({ id: id(), title, days, start, end, area: areaSlot, kind, paused: false, from: '2026-11-01', to: '' });
    rule('Morning run', [1, 3, 5], 8, 9, 2, 'booked');
    rule('Deep work', [1, 2, 3, 4, 5], 13, 16, 1, 'area');
    rule('French practice', [2, 4], 18, 19, 2, 'area');
    U.view = 'today'; U.date = TODAY; render();
  });
  const shot = async (name, full = false) => { await p.waitForTimeout(150); await p.screenshot({ path: path.join(out, name), fullPage: full }); console.log('saved', name); };
  await shot('today.png');
  await p.click('[data-a=go][data-v=projects]'); await shot('projects.png');
  await p.click('[data-a=go][data-v=areas]'); await p.click('[data-a=pickTask] >> nth=0'); await shot('key-areas.png');
  await p.click('[data-a=go][data-v=plan]'); await p.click('[data-a=step][data-n="4"]');
  await p.selectOption('[data-c=pickTime] >> nth=1', '13'); await shot('plan-tomorrow.png');
  await p.click('[data-a=go][data-v=today]'); await p.setViewportSize({ width: 390, height: 844 }); await shot('phone.png');
  // calendar import (v16): two calendars as Google exports them, shown in Plan tomorrow and in Settings
  await p.setViewportSize({ width: 1280, height: 860 });
  await p.evaluate(() => {
    const d = addDays(TODAY, 1).replace(/-/g, ''), ev = (uid, title, a, z, more = []) => ['BEGIN:VEVENT', 'UID:' + uid, 'SUMMARY:' + title, `DTSTART:${d}T${a}00`, `DTEND:${d}T${z}00`, ...more, 'END:VEVENT'];
    const cal = (name, ...evs) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'X-WR-CALNAME:' + name, ...evs.flat(), 'END:VCALENDAR'].join('\r\n');
    icsAdd({ name: 'work.ics', text: cal('Work', ev('s', 'Team stand-up', '0830', '0845', ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR']), ev('b', 'Board meeting', '1000', '1130'),
      ['BEGIN:VEVENT', 'UID:f', 'SUMMARY:Trade fair', 'DTSTART;VALUE=DATE:' + d, 'END:VEVENT']) });
    icsAdd({ name: 'family.ics', text: cal('Family', ev('c', 'School concert', '1630', '1730')) });
    U.view = 'plan'; render();
  });
  await p.click('[data-a=step][data-n="2"]'); await shot('calendar.png');
  await p.click('[data-a=menu]'); await p.waitForTimeout(150);
  await p.locator('.card:has(h3:has-text("Calendar"))').screenshot({ path: path.join(out, 'calendar-settings.png') }); console.log('saved calendar-settings.png');
  await b.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
