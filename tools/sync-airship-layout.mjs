// Propagate editable Airship coordinates without touching other game assets.
import {readFile,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile('assets-source/airship-map-data.json','utf8'));
const furniture=JSON.parse(await readFile('assets-source/airship-furniture.json','utf8'));
for(const file of ['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
  let html=await readFile(file,'utf8');
  for(const [name,value]of [['AIRSHIP_MAP_DATA',data],['AIRSHIP_FURNITURE_DATA',furniture]]){
    const pattern=new RegExp('^const '+name+'=.*?;$','m');
    if(!pattern.test(html))throw new Error('Missing '+name+' in '+file);
    html=html.replace(pattern,()=>`const ${name}=${JSON.stringify(value)};`);
  }
  html=html.replace(/const AIRSHIP_WORLD_SCALE=[\d.]+;/,()=>`const AIRSHIP_WORLD_SCALE=${furniture._meta.worldScale};`);
  await writeFile(file,html);console.log('Updated Airship layout: '+file);
}
