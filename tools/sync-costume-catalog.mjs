// Generate the selection/persistence catalogs from the authored collection.
// No game runtime or tests are started by this source generator.
import {readFile,writeFile} from 'node:fs/promises';

const catalog=JSON.parse(await readFile('assets-source/costume-expansion-catalog.json','utf8'));
const categories={'帽子':'hat','リュック':'bag','ペット':'pet','下の服':'bottom','アクセサリー（大）':'accessory'};
const newIds=Object.values(catalog).flat().map(row=>row[0]);
for(const file of ['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
  let source=await readFile(file,'utf8');
  source=source.replace(/(\{title:"([^"]+)",icon:"[^"]+",items:)(\[\[.*?\]\])(\})/g,(match,prefix,title,items,suffix)=>{
    const additions=catalog[categories[title]];if(!additions)return match;
    const ids=new Set(additions.map(row=>row[0]));
    return prefix+JSON.stringify([...JSON.parse(items).filter(row=>!ids.has(row[0])),...additions])+suffix;
  });
  source=source.replace(/(const PROFILE_COSTUME_PARTS=new Set\(")([^"]+)("\.split\(" "\)\);)/,
    (_,prefix,ids,suffix)=>prefix+[...new Set([...ids.split(' '),...newIds])].join(' ')+suffix);
  await writeFile(file,source);
}
const preview='pet-preview.html';
let source=await readFile(preview,'utf8');
source=source.replace(/const pets=(\{[^;]+\});/,(_,literal)=>{
  // Preserve the existing hand-authored labels; append the same new pet IDs.
  const entries=catalog.pet.map(([id,name])=>`${JSON.stringify(id)}:${JSON.stringify(name)}`).join(',');
  const marker=literal.indexOf(',"potter":');
  return 'const pets='+(marker<0?literal.slice(0,-1):literal.slice(0,marker))+','+entries+'};';
});
await writeFile(preview,source);
