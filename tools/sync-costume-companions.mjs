// Keep the editable costume sculpts and all game/preview consumers synchronized.
import './sync-costume-catalog.mjs';
import './sync-premium-catalog.mjs';
import './sync-lobby-ascent.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
const helper=(await readFile('assets-source/detailed-companions.js','utf8')).trim();
const wearables=(await readFile('assets-source/detailed-wearables.js','utf8')).trim();
const premium='/* GIFT_SKIN_V1_BEGIN */\n'+(await readFile('premium-skins-expansion.js','utf8')).replace(/export (const|function) /g,'$1 ')+'\n'+(await readFile('premium-skins.js','utf8')).replace(/^import .*?;\s*/m,'').replace(/export (const|function) /g,'$1 ')+'\n/* GIFT_SKIN_V1_END */';
const premiumMarker=/\/\* GIFT_SKIN_V1_BEGIN \*\/[\s\S]*?\/\* GIFT_SKIN_V1_END \*\//;
const marker=/\/\* DETAILED_COMPANIONS_V1_BEGIN[\s\S]*?\/\* DETAILED_COMPANIONS_V1_END \*\//;
const wearableMarker=/\/\* DETAILED_WEARABLES_V1_BEGIN[\s\S]*?\/\* DETAILED_WEARABLES_V1_END \*\//;
const builderMarker=/function buildLightCostume\(THREE,code\)\{[\s\S]*?\n  return root;\n\}/;
const entries=['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html'];
const authoritative=await readFile('index.html','utf8');
const builder=authoritative.match(builderMarker)?.[0];
if(!builder?.includes('buildDetailedCompanion')||!builder.includes('buildDetailedWearable'))throw new Error('Costume builder missing sculpt hooks');
for(const name of [...entries,'assets-source/lobby-lounge.html']){
 const source=await readFile(name,'utf8');if(!marker.test(source))throw new Error('Missing companion source marker: '+name);
 if(!builderMarker.test(source))throw new Error('Missing costume builder: '+name);
 let updated=source.replace(marker,()=>helper).replace(builderMarker,()=>builder);
 if(name==='assets-source/lobby-lounge.html')updated=premiumMarker.test(updated)?updated.replace(premiumMarker,()=>premium):updated.replace('function buildLightCostume(THREE,code){',()=>premium+'\nfunction buildLightCostume(THREE,code){');
 updated=wearableMarker.test(updated)?updated.replace(wearableMarker,()=>wearables):updated.replace('function buildLightCostume(THREE,code){',()=>wearables+'\n\nfunction buildLightCostume(THREE,code){');
 if(updated!==source)await writeFile(name,updated);
}
const lobby=await readFile('assets-source/lobby-lounge.html','utf8');
const pattern=/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
for(const name of entries){
 const source=await readFile(name,'utf8'),match=source.match(pattern);
 if(!match)throw new Error('Embedded assets missing: '+name);
 const assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64')));
 assets.COSTUME_LIB_SRC=helper+'\n\n'+wearables+'\n\n'+premium+'\n\n'+builder;assets.INTEGRATED_LOBBY_TEMPLATE=lobby;
 const encoded=gzipSync(Buffer.from(JSON.stringify(assets)),{level:9,mtime:0}).toString('base64');
 const payload='const EMBEDDED_ASSET_PAYLOAD='+JSON.stringify(encoded.match(/.{1,120}/g),null,1)+'.join("");';
 await writeFile(name,source.replace(pattern,()=>payload));console.log('Updated costume models: '+name);
}
