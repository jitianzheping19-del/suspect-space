// Embed the self-contained course in the lobby srcdoc before asset packaging.
import {readFile,writeFile} from 'node:fs/promises';
const path='assets-source/lobby-lounge.html',source=await readFile(path,'utf8');
const course=(await readFile('assets-source/lobby-ascent.js','utf8')).trim();
const marker=/\/\* LOBBY_ASCENT_BEGIN \*\/[\s\S]*?\/\* LOBBY_ASCENT_END \*\//;
const anchor='    // Upholstered banquettes retain the established seat IDs, positions and height.';
let next=marker.test(source)?source.replace(marker,()=>course):source.replace(anchor,()=>course+'\n    createLobbyAscent({THREE,scene,obstacles});\n'+anchor);
if(next===source&&!marker.test(source))throw new Error('Lobby ascent insertion point missing');
if(next!==source)await writeFile(path,next);
