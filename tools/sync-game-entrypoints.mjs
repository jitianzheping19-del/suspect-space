import {readFile,writeFile} from 'node:fs/promises';

// The home-screen manifest launches the complete entry point. Keep it and the
// alternate URL on the same implementation as the canonical index before build.
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const name of ['space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
 const file=new URL('../'+name,import.meta.url);
 const previous=await readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(previous!==source){await writeFile(file,source);console.log('Synchronized game entry:',name);}
}
