import {readFile,writeFile} from 'node:fs/promises';
const path='assets-source/lobby-lounge.html',source=await readFile(path,'utf8'),code=(await readFile('gacha-navigation.js','utf8')).replace('export function','function');
const start='/* GACHA_NAVIGATION_START */',end='/* GACHA_NAVIGATION_END */';
let next;if(source.includes(start))next=source.slice(0,source.indexOf(start))+start+'\n'+code+end+source.slice(source.indexOf(end)+end.length);else next=source.replace('function installLobbyExpansion(',start+'\n'+code+end+'\nfunction installLobbyExpansion(');if(next!==source)await writeFile(path,next);
