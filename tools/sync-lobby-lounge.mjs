// Keep the editable lobby source and the four shipped embedded versions aligned.
// Other embedded assets are preserved verbatim after JSON decoding.
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';

const source = await readFile(new URL('../assets-source/lobby-lounge.html', import.meta.url), 'utf8');
const pattern = /const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
for (const name of ['index.html', 'space-suspect-complete.html', 'space-suspect.html', 'space-suspect-final.html']) {
  const file = new URL('../' + name, import.meta.url);
  const html = await readFile(file, 'utf8');
  const match = html.match(pattern);
  if (!match) throw new Error('Embedded assets missing: ' + name);
  const assets = JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''), 'base64')).toString('utf8'));
  if (typeof assets.INTEGRATED_LOBBY_TEMPLATE !== 'string') throw new Error('Lobby source missing: ' + name);
  if (assets.INTEGRATED_LOBBY_TEMPLATE === source) continue;
  assets.INTEGRATED_LOBBY_TEMPLATE = source;
  const encoded = gzipSync(Buffer.from(JSON.stringify(assets)), { level: 9, mtime: 0 }).toString('base64');
  const payload = 'const EMBEDDED_ASSET_PAYLOAD=' + JSON.stringify(encoded.match(/.{1,120}/g), null, 1) + '.join("");';
  await writeFile(file, html.replace(pattern, () => payload));
  console.log('Updated lobby in ' + name);
}
