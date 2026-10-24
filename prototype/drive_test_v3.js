// usage: node drive_test_v3.js <playwright dir> <absolute path to pusis_proto_v3.html>
// Tests the optional Google Drive sync against a fake Google (sign-in stub + in-memory Drive). No real Google account is used.
const [, , pwDir, file] = process.argv;
const { chromium } = require(pwDir); const fs = require('fs');
const html = fs.readFileSync(file, 'utf8');
const problems = []; const check = (ok, what) => { if (!ok) problems.push(what); };
const drive = { files: {}, n: 0, calls: [] };
const stamp = () => new Date(Date.now() + drive.n++).toISOString();
const GSI = `window.google = { accounts: { oauth2: {
  initTokenClient: c => ({ requestAccessToken: () => setTimeout(() => c.callback({ access_token: 'fake', expires_in: 3600 }), 10) }),
  revoke: (t, cb) => cb && cb() } } };`;

async function fakeDrive(route) {
  const req = route.request(), u = new URL(req.url()), m = req.method(); drive.calls.push(`${m} ${u.pathname}`);
  const json = (o, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
  const id = u.pathname.split('/files/')[1];
  if (m === 'GET' && !id) return json({ files: Object.entries(drive.files).filter(([, f]) => !f.trashed).map(([i, f]) => ({ id: i, modifiedTime: f.modifiedTime })) });
  if (m === 'GET' && u.searchParams.get('alt') === 'media') return drive.files[id] ? route.fulfill({ status: 200, contentType: 'application/json', body: drive.files[id].content }) : json({}, 404);
  if (m === 'GET') return drive.files[id] ? json({ id, modifiedTime: drive.files[id].modifiedTime, trashed: false }) : json({}, 404);
  if (m === 'POST') { const body = req.postDataBuffer().toString('utf8'); const parts = body.split(/\r?\n\r?\n/); const content = parts[parts.length - 1].split(/\r?\n--/)[0];
    const nid = 'f' + drive.n; drive.files[nid] = { content, modifiedTime: stamp() }; return json({ id: nid, modifiedTime: drive.files[nid].modifiedTime }); }
  if (m === 'PATCH') { drive.files[id].content = req.postData(); drive.files[id].modifiedTime = stamp(); return json({ id, modifiedTime: drive.files[id].modifiedTime }); }
  return json({}, 400);
}

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  await ctx.route('https://pusis.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await ctx.route('https://accounts.google.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GSI }));
  await ctx.route('https://www.googleapis.com/**', fakeDrive);
  const p = await ctx.newPage(); const dialogs = [];
  p.on('pageerror', e => problems.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  const remote = () => { const f = Object.values(drive.files)[0]; return f && JSON.parse(f.content); };
  const local = () => p.evaluate(() => JSON.parse(localStorage.getItem('pusis.proto.v1')));
  await p.goto('https://pusis.test/app.html');
  check(await p.locator('#cloud').isHidden(), 'cloud pill hidden before connecting');

  // 1. connect: script loads, second click signs in, first sync creates the Drive file
  await p.click('[data-a=menu]'); await p.click('text=Load demo data');
  await p.click('[data-a=menu]'); await p.fill('dialog input[name=clientId]', 'fake.apps.googleusercontent.com'); await p.click('dialog >> text=Connect Google Drive');
  await p.waitForSelector('#cloud:has-text("connect")'); await p.click('#cloud');
  await p.waitForSelector('#cloud:has-text("saved")', { timeout: 5000 });
  check(remote() && remote().tasks.some(t => t.what === 'Prepare the product launch plan'), '1: first sync created pusis-data.json with the demo data');

  // 2. a change is uploaded automatically a few seconds later
  await p.click('[data-a=go][data-v=dont]'); await p.fill('form[data-f=addMinor] input', 'Water the plants'); await p.click('form[data-f=addMinor] button');
  await p.waitForSelector('#cloud:has-text("saving")'); await p.waitForSelector('#cloud:has-text("saved")', { timeout: 8000 });
  check(remote().minors.some(m => m.text === 'Water the plants'), '2: change auto-uploaded');
  // navigation alone is not a change and must not upload
  const before = drive.calls.length; await p.click('[data-a=go][data-v=goals]'); await p.waitForTimeout(5000);
  check(drive.calls.length === before, '2b: no upload without a real change');

  // 3. another device changes Drive; our next change must not overwrite it → conflict → choose (OK = load newer Drive copy)
  const f = Object.values(drive.files)[0], other = JSON.parse(f.content);
  other.minors.push({ id: 9999, text: 'Added on phone', done: false }); other.savedAt = new Date(Date.now() + 60000).toISOString();
  f.content = JSON.stringify(other); f.modifiedTime = stamp();
  await p.click('[data-a=go][data-v=dont]'); await p.fill('form[data-f=addMinor] input', 'Added on laptop'); await p.click('form[data-f=addMinor] button');
  await p.waitForSelector('#cloud:has-text("conflict")', { timeout: 8000 });
  check(remote().minors.some(m => m.text === 'Added on phone') && !remote().minors.some(m => m.text === 'Added on laptop'), '3: Drive copy not overwritten on conflict');
  await p.click('#cloud'); await p.waitForSelector('#cloud:has-text("saved")', { timeout: 5000 });
  check(dialogs.some(d => /Drive copy is newer/.test(d)), '3: user was asked which copy to keep');
  check((await local()).minors.some(m => m.text === 'Added on phone'), '3: newer Drive copy loaded into the browser');

  // 4. reload: no token in memory → pill asks to connect, data still local, app works
  await p.reload(); await p.waitForSelector('#cloud:has-text("connect")');
  check((await local()).minors.some(m => m.text === 'Added on phone'), '4: data kept after reload');
  // 5. disconnect hides the pill and keeps the Drive file
  await p.click('#cloud'); await p.waitForSelector('#cloud:has-text("saved")', { timeout: 5000 });
  await p.click('[data-a=menu]'); await p.click('dialog >> text=Disconnect Google');
  check(await p.locator('#cloud').isHidden(), '5: pill hidden after disconnect'); check(Object.keys(drive.files).length === 1, '5: Drive file kept');
  await b.close();
  console.log('Drive calls:', drive.calls.length, '| dialogs:', dialogs.length);
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all Drive sync checks passed');
})().catch(e => { console.log('TEST CRASH', e.message, '\n' + problems.join('\n')); process.exit(1); });
