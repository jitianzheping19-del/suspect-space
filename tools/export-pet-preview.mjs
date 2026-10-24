import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const source=await readFile('index.html','utf8'),match=source.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/),assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64')));
const motion=source.slice(source.indexOf('function animateCompanionGait('),source.indexOf('function advanceCompanionFollower('));
await mkdir('public',{recursive:true});
await writeFile('public/pet-models-preview.js','const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));\n'+assets.COSTUME_LIB_SRC+'\n'+motion+'\nexport {buildLightCostume,animateCompanionGait};\n');
