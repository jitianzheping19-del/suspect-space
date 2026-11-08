import {readFile,writeFile} from 'node:fs/promises';
const path='assets-source/lobby-lounge.html',source=await readFile(path,'utf8');
const car=(await readFile('assets-source/lobby-race-car.js','utf8')).trim();
const marker=/\/\* LOBBY_RACE_CAR_BEGIN \*\/[\s\S]*?\/\* LOBBY_RACE_CAR_END \*\//;
const anchor='function installLobbyExpansion(THREE,scene,addObstacle){';
if(!marker.test(source)&&!source.includes(anchor))throw Error('Race car insertion point missing');
const next=marker.test(source)?source.replace(marker,()=>car):source.replace(anchor,()=>car+'\n'+anchor);
if(next!==source)await writeFile(path,next);
