// Keep the editable companion sculpt and all costume consumers synchronized.
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
const helper=(await readFile('assets-source/detailed-companions.js','utf8')).trim();
const marker=/\/\* DETAILED_COMPANIONS_V1_BEGIN[\s\S]*?\/\* DETAILED_COMPANIONS_V1_END \*\//;
const entries=['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html'];
for(const name of [...entries,'assets-source/lobby-lounge.html']){
 const source=await readFile(name,'utf8');if(!marker.test(source))throw new Error('Missing companion source marker: '+name);
 const updated=source.replace(marker,()=>helper);if(updated!==source)await writeFile(name,updated);
}
const main=await readFile('index.html','utf8');
const builder=main.match(/function buildLightCostume\(THREE,code\)\{[\s\S]*?\n  return root;\n\}/)?.[0];
if(!builder?.includes('buildDetailedCompanion'))throw new Error('Costume builder missing sculpt hook');
const lobby=await readFile('assets-source/lobby-lounge.html','utf8');
const pattern=/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
for(const name of entries){
 const source=await readFile(name,'utf8'),match=source.match(pattern);
 if(!match)throw new Error('Embedded assets missing: '+name);
 const assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64')));
 assets.COSTUME_LIB_SRC=helper+'\n\n'+builder;assets.INTEGRATED_LOBBY_TEMPLATE=lobby;
 const encoded=gzipSync(Buffer.from(JSON.stringify(assets)),{level:9,mtime:0}).toString('base64');
 const payload='const EMBEDDED_ASSET_PAYLOAD='+JSON.stringify(encoded.match(/.{1,120}/g),null,1)+'.join("");';
 await writeFile(name,source.replace(pattern,()=>payload));console.log('Updated companion models: '+name);
}
