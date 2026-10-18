import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const html=await readFile('space-suspect-complete.html','utf8');
const payload=html.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/);
const assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(payload[1]).join(''),'base64')));
const {KILL_ASSET_SRCDOC,SS_VAMPIRE_KILL_SRCDOC,SS_VIPER_KILL_SRCDOC,KILL_DEMOS,COSTUME_LIB_SRC}=assets;
// Generate from the originals at build time; never maintain a second art source.
await mkdir('public',{recursive:true});
await writeFile('public/kill-originals.json',JSON.stringify({KILL_ASSET_SRCDOC,SS_VAMPIRE_KILL_SRCDOC,SS_VIPER_KILL_SRCDOC,KILL_DEMOS,COSTUME_LIB_SRC}));
