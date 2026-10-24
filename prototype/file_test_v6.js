// usage: node file_test_v6.js <playwright dir> <absolute path to pusis_proto_v6.html>
// Tests file sync (option A) with a fake file picker and an in-memory file. No real file is touched.
const [, , pwDir, file] = process.argv;
const { chromium } = require(pwDir); const fs = require('fs');
const html = fs.readFileSync(file, 'utf8');
const problems = []; const check = (ok, what) => { if (!ok) problems.push(what); };
const FAKE = `(() => {
  window.__file = { text: '', lastModified: 1 }; window.__perm = 'granted'; let n = 1;
  const handle = { name: 'pusis-data.json', kind: 'file',
    getFile: async () => ({ text: async () => window.__file.text, lastModified: window.__file.lastModified }),
    createWritable: async () => { let buf = ''; return { write: async t => { buf = t; }, close: async () => { window.__file.text = buf; window.__file.lastModified = 1000 + n++; } }; },
    queryPermission: async () => window.__perm, requestPermission: async () => (window.__perm = 'granted') };
  window.showSaveFilePicker = async () => handle; window.showOpenFilePicker = async () => [handle];
})();`;

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext();
  await ctx.route('https://pusis.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  const p = await ctx.newPage(); await p.addInitScript(FAKE); const dialogs = [];
  p.on('pageerror', e => problems.push('pageerror: ' + e.message));
  p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  const fileData = () => p.evaluate(() => window.__file.text ? JSON.parse(window.__file.text) : null);
  await p.goto('https://pusis.test/app.html');
  check(await p.locator('#fpill').isHidden(), '0: file pill hidden before choosing a file');

  // 1. save to a new file
  await p.click('[data-a=menu]'); await p.click('text=Load demo data');
  await p.click('[data-a=menu]'); await p.click('dialog >> text=Save to a new file');
  await p.waitForSelector('#fpill:has-text("saved")', { timeout: 5000 });
  check((await fileData())?.tasks.some(t => t.what === 'Prepare the product launch plan'), '1: data written to the new file');

  // 2. a change is written shortly after; navigation alone writes nothing
  await p.click('[data-a=go][data-v=dont]'); await p.fill('form[data-f=addMinor] input', 'Water the plants'); await p.click('form[data-f=addMinor] button');
  await p.waitForSelector('#fpill:has-text("saved")', { timeout: 5000 }); await p.waitForTimeout(2000);
  check((await fileData()).minors.some(m => m.text === 'Water the plants'), '2: change written to the file');
  const mod1 = await p.evaluate(() => window.__file.lastModified); await p.click('[data-a=go][data-v=goals]'); await p.waitForTimeout(2500);
  check(await p.evaluate(() => window.__file.lastModified) === mod1, '2b: no write without a real change');

  // 3. another computer changed the file (via Drive) → no overwrite → conflict → choose (OK = load the newer file)
  await p.evaluate(() => { const d = JSON.parse(window.__file.text); d.minors.push({ id: 9999, text: 'Added on laptop 2', done: false }); d.savedAt = new Date(Date.now() + 60000).toISOString(); window.__file.text = JSON.stringify(d); window.__file.lastModified = 999999; });
  await p.click('[data-a=go][data-v=dont]'); await p.fill('form[data-f=addMinor] input', 'Added here'); await p.click('form[data-f=addMinor] button');
  await p.waitForSelector('#fpill:has-text("conflict")', { timeout: 5000 });
  check(!(await fileData()).minors.some(m => m.text === 'Added here'), '3: file not overwritten on conflict');
  await p.click('#fpill'); await p.waitForSelector('#fpill:has-text("saved")', { timeout: 5000 });
  check(dialogs.some(d => /The file is newer/.test(d)), '3: asked which copy to keep');
  check(await p.evaluate(() => JSON.parse(localStorage.getItem('pusis.proto.v1')).minors.some(m => m.text === 'Added on laptop 2')), '3: newer file loaded');

  // 4. permission lapsed → "📁 allow" → one click grants and writes
  await p.evaluate(() => { window.__perm = 'prompt'; });
  await p.click('[data-a=go][data-v=dont]'); await p.fill('form[data-f=addMinor] input', 'After allow'); await p.click('form[data-f=addMinor] button');
  await p.waitForSelector('#fpill:has-text("allow")', { timeout: 5000 });
  await p.click('#fpill'); await p.waitForSelector('#fpill:has-text("saved")', { timeout: 5000 });
  check((await fileData()).minors.some(m => m.text === 'After allow'), '4: written after allowing again');

  // 5. stop using the file: pill hidden, file kept
  await p.click('[data-a=menu]'); await p.click('dialog >> text=Stop using the file');
  check(await p.locator('#fpill').isHidden(), '5: pill hidden after stop'); check(!!(await fileData()), '5: file kept');

  // 6. a browser without file access (Firefox/Safari/phone): no file buttons
  const q = await ctx.newPage(); await q.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
  await q.goto('https://pusis.test/app.html'); await q.click('[data-a=menu]');
  check(!(await q.locator('dialog >> text=Save to a new file').count()), '6: no file buttons where the browser cannot do it');
  await b.close();
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'all file sync checks passed');
})().catch(e => { console.log('TEST CRASH', e.message, '\n' + problems.join('\n')); process.exit(1); });
