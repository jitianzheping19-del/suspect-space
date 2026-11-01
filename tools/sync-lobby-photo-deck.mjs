import {readFile,writeFile} from 'node:fs/promises';
const path='assets-source/lobby-lounge.html',source=await readFile(path,'utf8');
const deck=(await readFile('assets-source/lobby-photo-deck.js','utf8')).trim();
const marker=/\/\* LOBBY_PHOTO_DECK_BEGIN \*\/[\s\S]*?\/\* LOBBY_PHOTO_DECK_END \*\//;
const anchor='function installLobbyExpansion(THREE,scene,addObstacle){';
const next=marker.test(source)?source.replace(marker,()=>deck):source.replace(anchor,()=>deck+'\n'+anchor);
if(next===source&&!marker.test(source))throw Error('Photo deck insertion point missing');
if(next!==source)await writeFile(path,next);
