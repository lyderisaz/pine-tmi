// usage: node sync_test_v16.js <playwright dir> <absolute path to pusis_proto_v16.html>
// Tests the shared-database sync against a fake API in memory: two devices, conflicts, deletes, offline, an ended sign-in,
// a refused change, a restored database, midnight, and the public demo that must never call the API.
const [, , pwDir, file] = process.argv;
const { chromium } = require(pwDir); const fs = require('fs');
const src = fs.readFileSync(file, 'utf8');
const shared = src.replace('<head>', '<head><meta name="pusis-api" content="/api">');
const problems = []; const check = (ok, what) => { if (!ok) problems.push(what); };

// The fake server keeps the same rules as the real one: a revision per object, conflicts instead of overwrites,
// a change feed after a cursor, and deletes that only mark the object.
const db = { rows: {}, log: [], seq: 0, down: false, signin: false, reject: null, posts: [] };
const item = (k, r) => { const [kind, ...id] = k.split(':'); return r.deleted ? { kind, id: id.join(':'), rev: r.rev, deleted: true } : { kind, id: id.join(':'), rev: r.rev, data: r.data }; };
function write(k, data, deleted = false) { const r = db.rows[k]; db.rows[k] = { rev: (r ? r.rev : 0) + 1, data: deleted ? r.data : data, deleted }; db.log.push({ seq: ++db.seq, k }); }
function sync({ cursor, changes }) {
  const applied = [], conflicts = [], rejected = [];
  for (const c of changes) {
    const k = `${c.kind}:${c.id}`, r = db.rows[k];
    if (db.reject && k === db.reject) { rejected.push({ kind: c.kind, id: c.id, reason: 'active_limit' }); continue; }
    if (r ? c.rev !== r.rev : c.rev !== 0) { conflicts.push({ kind: c.kind, id: c.id, server: r ? item(k, r) : null }); continue; }
    if (c.deleted && (!r || r.deleted)) { applied.push({ kind: c.kind, id: c.id, rev: r ? r.rev : 0 }); continue; }
    write(k, c.data, !!c.deleted); applied.push({ kind: c.kind, id: c.id, rev: db.rows[k].rev });
  }
  const own = new Set(applied.map(a => `${a.kind}:${a.id}`));
  const keys = [...new Set(db.log.filter(l => l.seq > cursor).map(l => l.k))].filter(k => !own.has(k));
  return { applied, conflicts, rejected, changes: keys.map(k => item(k, db.rows[k])), cursor: db.seq };
}
const state = () => ({ items: Object.entries(db.rows).filter(([, r]) => !r.deleted).map(([k, r]) => item(k, r)), cursor: db.seq });
const live = k => db.rows[k] && !db.rows[k].deleted ? db.rows[k].data : null;
const rows = kind => Object.entries(db.rows).filter(([k, r]) => k.startsWith(kind + ':') && !r.deleted).map(([, r]) => r.data);

async function api(route) {
  const req = route.request(), u = new URL(req.url());
  if (db.down) return route.abort('internetdisconnected');
  if (db.signin) return route.fulfill({ status: 302, headers: { Location: 'https://login.test/' } });
  const json = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  if (req.method() === 'GET' && u.pathname === '/api/state') return json(state());
  if (req.method() === 'POST' && u.pathname === '/api/sync') { const b = JSON.parse(req.postData()); db.posts.push(b); return json(sync(b)); }
  return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
}

(async () => {
  const b = await chromium.launch();
  const device = async (html = shared) => {
    const ctx = await b.newContext(); const calls = [];
    await ctx.route('https://pusis.test/', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await ctx.route('https://pusis.test/api/**', r => { calls.push(r.request().url()); return api(r); });
    const p = await ctx.newPage(); p.calls = calls; p.dialogs = [];
    p.on('pageerror', e => problems.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) problems.push('console: ' + m.text()); });
    p.on('dialog', d => { p.dialogs.push(d.message()); d.accept(); });
    return p;
  };
  const saved = p => p.waitForSelector('#apill:text-matches("🔄 \\\\d\\\\d:\\\\d\\\\d")', { timeout: 8000 });
  const sync = p => p.evaluate(() => aSync());

  // 0. the first device fills the empty server with what it has
  const A = await device(); await A.goto('https://pusis.test/'); await saved(A);
  check(rows('area').length === 5, '0: first device uploaded the 5 key areas');
  check(await A.locator('#cloud').isHidden() && await A.locator('#fpill').isHidden(), '0: no Drive or file pill in shared mode');

  // 1. a change is sent; navigation alone sends nothing
  await A.click('[data-a=go][data-v=dont]'); await A.fill('form[data-f=addMinor] input', 'Water the plants'); await A.click('form[data-f=addMinor] button');
  await A.waitForTimeout(400); await saved(A);
  check(rows('minor').some(m => m.text === 'Water the plants'), '1: new item sent to the server');
  const ids = await A.evaluate(() => S.minors.map(m => m.id));
  check(ids.every(i => i > 1e15 && Number.isSafeInteger(i)), '1: new ids are time based safe integers');
  const before = db.posts.filter(x => x.changes.length).length;
  await A.click('[data-a=go][data-v=goals]'); await A.waitForTimeout(2500);
  check(db.posts.filter(x => x.changes.length).length === before, '1b: no changes sent for navigation');

  // 2. a second device gets everything, and its changes reach the first
  const B = await device(); await B.goto('https://pusis.test/'); await saved(B);
  check((await B.evaluate(() => S.minors.map(m => m.text))).includes('Water the plants'), '2: second device loaded the shared data');
  check((await B.evaluate(() => S.areas.length)) === 5, '2: second device did not add its own key areas');
  await B.evaluate(() => { S.notes.push({ id: id(), text: 'From the phone', at: stamp() }); save(); }); await B.waitForTimeout(2000); await saved(B);
  await sync(A); check((await A.evaluate(() => S.notes.map(n => n.text))).includes('From the phone'), '2: first device received the other device\'s note');

  // 3. both devices change the same item: nothing is overwritten, the user chooses
  const k = `minor:${ids[0]}`;
  write(k, { ...live(k), text: 'Changed on the phone' });
  await A.evaluate(() => { S.minors[0].text = 'Changed on the computer'; save(); });
  await A.waitForSelector('#apill:has-text("conflict")', { timeout: 8000 });
  check(live(k).text === 'Changed on the phone', '3: server copy not overwritten');
  check((await A.evaluate(() => S.minors[0].text)) === 'Changed on the phone', '3: the other device\'s version shown first');
  await A.click('#apill'); await saved(A);
  check(A.dialogs.some(d => /also changed on another device/.test(d)), '3: user was asked which version to keep');
  check(live(k).text === 'Changed on the computer', '3: the chosen version was saved');

  // 4. a delete reaches the server and the other device
  await A.evaluate(() => { S.minors = []; save(); }); await A.waitForTimeout(2000); await saved(A);
  check(db.rows[k].deleted, '4: delete marked on the server');
  await sync(B); check((await B.evaluate(() => S.minors.length)) === 0, '4: other device removed it too');

  // 5. offline: the change waits and goes out when the connection is back
  db.down = true; await A.evaluate(() => { S.notes.push({ id: id(), text: 'Written offline', at: stamp() }); save(); });
  await A.waitForSelector('#apill:has-text("offline")', { timeout: 8000 });
  db.down = false; await A.evaluate(() => dispatchEvent(new Event('online'))); await saved(A);
  check(rows('note').some(n => n.text === 'Written offline'), '5: offline change sent when back online');

  // 6. an ended sign-in is shown, not treated as data
  db.signin = true; await sync(A);
  check(/sign in/.test(await A.locator('#apill').textContent()), '6: ended sign-in shown on the pill');
  db.signin = false; await sync(A); await saved(A);

  // 7. a change the server refuses goes back to the last synced version
  const rid = await A.evaluate(() => { const x = { id: id(), text: 'Refused', done: false }; S.minors.push(x); return x.id; });
  db.reject = `minor:${rid}`; await A.evaluate(() => save()); await A.waitForSelector('.toast:has-text("Not saved")', { timeout: 8000 });
  check(!(await A.evaluate(() => S.minors.some(m => m.text === 'Refused'))), '7: refused change removed here');
  db.reject = null;

  // 8. the database was restored to an earlier state: the device reloads everything
  for (const key of Object.keys(db.rows)) if (key.startsWith('note:')) delete db.rows[key];
  db.log = []; db.seq = 1; await sync(A); await saved(A);
  check((await A.evaluate(() => S.notes.length)) === 0 && (await A.evaluate(() => AS.cursor)) === 1, '8: restored database loaded again');

  // 9. the public demo (no API tag) never calls the API and keeps its pills
  const P = await device(src); await P.goto('https://pusis.test/'); await P.waitForTimeout(1500);
  await P.evaluate(() => { S.notes.push({ id: id(), text: 'local only', at: 'x' }); save(); }); await P.waitForTimeout(2000);
  check(P.calls.length === 0, '9: public demo made no API calls');
  check(await P.locator('#apill').isHidden() && await P.locator('#cloud').isVisible(), '9: public demo shows Drive, not the shared pill');

  // 10. a page left open past midnight moves to the new day
  const M = await device(src); await M.clock.install({ time: new Date('2026-11-24T23:59:30') });
  await M.goto('https://pusis.test/'); const d0 = await M.evaluate(() => TODAY);
  await M.clock.fastForward('01:30'); const d1 = await M.evaluate(() => [TODAY, U.date]);
  check(d0 === '2026-11-24' && d1[0] === '2026-11-25' && d1[1] === '2026-11-25', '10: Today moved to the new date after midnight');

  await b.close();
  console.log('API posts:', db.posts.length, '| rows:', Object.keys(db.rows).length);
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all sync checks passed');
})().catch(e => { console.log('TEST CRASH', e.message, '\n' + problems.join('\n')); process.exit(1); });
