// Keep the editable meeting scene identical in every published game entry.
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { bundleMeetingLibraries } from './bundle-meeting-libraries.mjs';

const scene = await bundleMeetingLibraries(await readFile('assets-source/meeting-scene.html', 'utf8'));
const pattern = /const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
for (const name of ['index.html', 'space-suspect-complete.html', 'space-suspect.html', 'space-suspect-final.html']) {
  const html = await readFile(name, 'utf8');
  const match = html.match(pattern);
  if (!match) throw new Error('Missing embedded scenes: ' + name);
  const assets = JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''), 'base64')));
  assets.MEETING_3D_SRCDOC = scene;
  const encoded = gzipSync(Buffer.from(JSON.stringify(assets)), { level: 9, mtime: 0 }).toString('base64');
  const payload = 'const EMBEDDED_ASSET_PAYLOAD=' + JSON.stringify(encoded.match(/.{1,120}/g), null, 1) + '.join("");';
  await writeFile(name, html.replace(pattern, () => payload));
  console.log('Updated meeting scene: ' + name);
}
