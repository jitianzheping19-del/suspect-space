import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {AIRSHIP_TASK_INTERACTIONS} from '../airship-tasks.js';import {createAirshipTaskRun} from '../airship-task-rules.js';
const html=fs.readFileSync('index.html','utf8'),data=JSON.parse(fs.readFileSync('assets-source/airship-map-data.json')),furniture=JSON.parse(fs.readFileSync('assets-source/airship-furniture.json'));
const layout=html.slice(html.indexOf('function createAirshipLayout(){'),html.indexOf('function buildAstraMap('));
const adapter=html.slice(html.indexOf('const airshipTaskRunCache='),html.indexOf('function openTaskGame('));
const context=vm.createContext({AIRSHIP_TASK_INTERACTIONS,AIRSHIP_MAP_DATA:data,AIRSHIP_FURNITURE_DATA:furniture,AIRSHIP_WORLD_SCALE:furniture._meta.worldScale,createAirshipTaskRun,console});
vm.runInContext(layout+`
const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{dataset:{},textContent:'',replaceChildren(){}});return elements.get(id);};
let taskGame=null,taskInteractionLock=false,taskMachine3D=null,game={round:1,phase:'play'},code='room-a',uid='self',currentMapMode='astra',completed=0;
function closeTaskGame(){taskGame?.frostRun.cancel();taskGame=null;}
function finishTaskGame(){completed++;}function show(){}const roomExperience={showHelp(){}};
function createAirshipTaskMachine(){return {canvas:{focus(){}}};}
`+adapter,context);
const tasks=vm.runInContext('createAirshipLayout().tasks',context);assert.equal(tasks.length,19);for(let i=0;i<19;i++){assert.equal(tasks[i].id,'airship-task-'+i);assert.equal(tasks[i].kind,'airship');assert.equal(tasks[i].taskEngine,'airship');assert.equal(tasks[i].room,data.tasks[i].room);assert.equal(tasks[i].x,data.tasks[i].x*furniture._meta.worldScale);}
vm.runInContext(`
openAirshipTaskGame(createAirshipLayout().tasks[1]);taskGame.frostRun.act('digit',1);const cached=taskGame.frostRun;closeTaskGame();openAirshipTaskGame(createAirshipLayout().tasks[1]);if(taskGame.frostRun!==cached)throw Error('lost progress on reopen');
game.round=2;openAirshipTaskGame(createAirshipLayout().tasks[1]);if(taskGame.frostRun===cached)throw Error('round leaked');
const stale=taskGame.frostRun;game.round=3;for(const n of stale.state.code)stale.act('digit',n);stale.act('confirm');if(completed!==0)throw Error('stale round submitted');
openAirshipTaskGame(createAirshipLayout().tasks[1]);const live=taskGame.frostRun;for(const n of live.state.code)live.act('digit',n);live.act('confirm');if(completed!==1)throw Error('current completion not submitted');
`,context);
console.log('PASS 19 production station IDs/coordinates/engines, main game dispatch, cached progress, new-round reset and stale-completion rejection');
