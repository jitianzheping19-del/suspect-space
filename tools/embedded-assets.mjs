// Development utility only. Published games need no build step or extra asset requests.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
const [action,input,directory,output]=process.argv.slice(2);
if(!['unpack','pack'].includes(action)||!input||!directory||(action==='pack'&&!output)){
 console.error('Unpack: node tools/embedded-assets.mjs unpack game.html assets-directory\nRepack: node tools/embedded-assets.mjs pack game.html assets-directory output.html');process.exit(1);
}
const html=await readFile(input,'utf8');
const pattern=/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
const match=html.match(pattern);if(!match)throw new Error('Embedded asset bundle was not found.');
const assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64')).toString('utf8'));
if(action==='unpack'){
 await mkdir(directory,{recursive:true});const manifest={version:1,assets:{}};
 for(const [key,value]of Object.entries(assets)){
  if(key==='KILL_DEMOS'){
   const files={};await mkdir(join(directory,key),{recursive:true});
   for(const [name,source]of Object.entries(value)){const path=key+'/'+name+'.html';await writeFile(join(directory,path),typeof source==='string'?source:source.html);files[name]={file:path,template:typeof source==='string'?null:{...source,html:null}};}
   manifest.assets[key]={kind:'group',files};
  }else{
   const kind=typeof value==='string'?'text':'json',extension=key==='COSTUME_LIB_SRC'?'.js':kind==='text'&&/<(?:!doctype|html)/i.test(value)?'.html':'.json',path=key+extension;
   await writeFile(join(directory,path),kind==='json'?JSON.stringify(value,null,2)+'\n':value);manifest.assets[key]={kind,file:path};
  }
 }
 await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Extracted '+Object.keys(assets).length+' asset groups into '+directory);
}else{
 const manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));if(manifest.version!==1)throw new Error('Unsupported asset manifest.');
 if(Object.keys(assets).sort().join('|')!==Object.keys(manifest.assets).sort().join('|'))throw new Error('The asset keys differ from this game version.');
 for(const [key,entry]of Object.entries(manifest.assets)){
  if(entry.kind==='group'){assets[key]={};for(const [name,part]of Object.entries(entry.files)){const source=await readFile(join(directory,part.file),'utf8');assets[key][name]=part.template?{...part.template,html:source}:source;}}
  else{const source=await readFile(join(directory,entry.file),'utf8');assets[key]=entry.kind==='json'?JSON.parse(source):source;}
 }
 const encoded=gzipSync(Buffer.from(JSON.stringify(assets)),{level:9,mtime:0}).toString('base64'),payload='const EMBEDDED_ASSET_PAYLOAD='+JSON.stringify(encoded.match(/.{1,120}/g),null,1)+'.join("");';
 await writeFile(output,html.replace(pattern,()=>payload));console.log('Repacked assets into '+output);
}
