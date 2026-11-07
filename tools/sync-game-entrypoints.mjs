import {readFile,writeFile} from 'node:fs/promises';
import {legacyGameEntries} from './game-entrypoints.mjs';

// Generate ignored compatibility sources for offline tools and browser fixtures
// only after all canonical-source generators finish. Edit index.html instead.
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const name of legacyGameEntries){
 const file=new URL('../'+name,import.meta.url);
 const previous=await readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(previous!==source){await writeFile(file,source);console.log('Synchronized game entry:',name);}
}
