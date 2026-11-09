import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile('assets-source/home-screen-entry.html','utf8');
const [head,body]=source.replace('<!-- ENTRY_HEAD -->','').split('<!-- ENTRY_BODY -->');
if(!head||!body)throw Error('Missing home-screen entry sections');
let index=await readFile('index.html','utf8');
for(const [name,markup]of [['HEAD',head],['BODY',body]]){
 const pattern=new RegExp('<!-- HOME_SCREEN_ENTRY_'+name+'_START -->[\\s\\S]*?<!-- HOME_SCREEN_ENTRY_'+name+'_END -->');
 if(!pattern.test(index))throw Error('Missing '+name+' insertion point');
 index=index.replace(pattern,()=>`<!-- HOME_SCREEN_ENTRY_${name}_START -->\n${markup.trim()}\n<!-- HOME_SCREEN_ENTRY_${name}_END -->`);
}
await writeFile('index.html',index);
console.log('Synced the first-screen installation guide');
