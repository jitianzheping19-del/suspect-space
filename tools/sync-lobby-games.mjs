import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../assets-source/lobby-lounge.html',import.meta.url);
let html=await readFile(file,'utf8');
const match=(await readFile(new URL('../lobby-soccer-match.js',import.meta.url),'utf8')).replaceAll('export function ','function ');
const skills=(await readFile(new URL('../lobby-soccer-skills.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export const ','const ').replaceAll('export function ','function ');
const kick=(await readFile(new URL('../lobby-soccer-kick.js',import.meta.url),'utf8')).replaceAll('export function ','function ');
const tactics=(await readFile(new URL('../lobby-soccer-tactics.js',import.meta.url),'utf8')).replaceAll('export function ','function ');
const slide=(await readFile(new URL('../lobby-soccer-slide.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export const ','const ').replaceAll('export function ','function ');
const press=(await readFile(new URL('../lobby-soccer-press.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export const ','const ').replaceAll('export function ','function ');
const air=(await readFile(new URL('../lobby-soccer-air.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export function ','function ');
const bots=(await readFile(new URL('../lobby-soccer-bots.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export function ','function ');
const finishes=(await readFile(new URL('../lobby-soccer-finishes.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export function ','function ');
const kickoff=(await readFile(new URL('../lobby-soccer-kickoff.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export function ','function ');
const stadium=await readFile(new URL('../assets-source/lobby-soccer-stadium.js',import.meta.url),'utf8');
const rules=(await readFile(new URL('../lobby-games-rules.js',import.meta.url),'utf8')).replace(/^import .*lobby-soccer-(?:skills|press|air|bots|finishes|kickoff|slide|kick|tactics|match).js';\n/gm,'').replace('export function createLobbyGamesRules','function createLobbyGamesRules');
const scene=await readFile(new URL('../assets-source/lobby-games-scene.js',import.meta.url),'utf8');
const content='/* LOBBY_GAMES_BUNDLE_BEGIN */\n'+match+'\n'+skills+'\n'+kick+'\n'+tactics+'\n'+slide+'\n'+press+'\n'+air+'\n'+bots+'\n'+finishes+'\n'+kickoff+'\n'+rules+'\n'+stadium+'\n'+scene+'\n/* LOBBY_GAMES_BUNDLE_END */';
const marker=/\/\* LOBBY_GAMES_BUNDLE_BEGIN \*\/[\s\S]*?\/\* LOBBY_GAMES_BUNDLE_END \*\//;
if(marker.test(html))html=html.replace(marker,()=>content);
else{
 const anchor='    window.SpaceSuspectLobby.__lobbyStartRender=()=>{';
 if(!html.includes(anchor))throw new Error('Lobby game insertion anchor missing');
 html=html.replace(anchor,()=>content+'\n'+anchor);
}
await writeFile(file,html);
