import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {isHostConnectionNotice} from '../room-resume-state.js';

const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const between=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);};
const context=values=>vm.createContext(values);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};

// Resolve writes out of order across meetings and rooms, including failures.
{
 const writes=[],notices=[];
 const c=context({session:1,code:'room-a',uid:'me',connected:true,hostOnline:()=>true,now:()=>100,
  game:{phase:'meeting',round:1,meeting:{id:'m1',votingAt:0,endsAt:1000},players:{me:{alive:true},peer:{alive:true},dead:{alive:false},observer:{alive:true,observer:true}}},
  self:()=>({alive:true}),ownBallot:null,db:{},token:()=>String(writes.length),ref:(_,path)=>path,
  set:(path,value)=>{const pending=deferred();writes.push({path,value,...pending});return pending.promise;},safeRenderUI:()=>{},toast:(...args)=>notices.push(args),errorText:e=>e.message});
 vm.runInContext(between('    let voteSendInFlight=','\nfunction nearestTask()'),c);
 assert.equal(await c.sendVote('dead'),false);assert.equal(await c.sendVote('observer'),false);assert.equal(writes.length,0);
 const first=c.sendVote('peer');assert.equal(await c.sendVote('skip'),false);assert.equal(writes.length,1);
 c.game.meeting={id:'m2',votingAt:0,endsAt:1000};const second=c.sendVote('skip');
 writes[0].resolve();assert.equal(await first,false);assert.equal(c.ownBallot,null);
 assert.equal(await c.sendVote('peer'),false,'old completion must not unlock current meeting');
 writes[1].resolve();assert.equal(await second,true);assert.equal(c.ownBallot.meeting,'m2');
 assert.equal(await c.sendVote('peer'),false,'saved vote cannot be overwritten');
 c.game.meeting={id:'m3',votingAt:0,endsAt:1000};const failed=c.sendVote('peer');writes[2].reject(Error('offline'));
 assert.equal(await failed,false);assert.match(notices.at(-1)[0],/もう一度/);
 const retried=c.sendVote('skip');writes[3].resolve();assert.equal(await retried,true);
 c.game.meeting={id:'m4',votingAt:0,endsAt:1000};const oldRoom=c.sendVote('peer');
 c.session++;c.code='room-b';c.ownBallot=null;const newRoom=c.sendVote('skip');writes[4].reject(Error('old room'));
 const noticeCount=notices.length;assert.equal(await oldRoom,false);assert.equal(notices.length,noticeCount);
 assert.equal(await c.sendVote('peer'),false);writes[5].resolve();assert.equal(await newRoom,true);
 assert.equal(writes[4].path,'ballots/room-a/1/m4/me');assert.equal(writes[5].path,'ballots/room-b/1/m4/me');
 c.connected=false;assert.equal(await c.sendVote('skip'),false);assert.match(notices.at(-1)[0],/接続/);
 console.log('PASS vote deduplication, invalid targets, save retry, stale meeting completion and stale room failure');
}

// A transport failure must preserve the reconnect target; a missing room can clear it.
{
 let stored='5291',read=async()=>{throw Error('network offline');};const message={};
 const c=context({connected:true,uid:'me',readStored:()=>stored,saveStored:(_,v)=>stored=v,$:()=>message,
  readRoomBootstrap:(...args)=>read(...args),applyAccountCostume:p=>p,db:{},ref:(_,p)=>p,update:async()=>{},enterRoom:async()=>{},
  canResumeMatch:()=>true});
 vm.runInContext(between('async function reconnectPreviousRoom(','\nasync function resumeRoomAfterTab('),c);
 assert.equal(await c.reconnectPreviousRoom(),false);assert.equal(stored,'5291');assert.match(message.textContent,/接続先を保存/);
 read=async()=>null;assert.equal(await c.reconnectPreviousRoom(),false);assert.equal(stored,'');
 stored='5291';assert.equal(await c.reconnectPreviousRoom({preserveOnFailure:true}),false);assert.equal(stored,'5291');
 read=async()=>{stored='new-room';return null;};await c.reconnectPreviousRoom();assert.equal(stored,'new-room');
 console.log('PASS transient failure preserves room, missing room clears only matching target, preservation option');
}

// Use the actual queue with a controlled clock, transport and callback queue.
async function queueCase(mode){
 let stamp=1000,writeCount=0;const scheduled=[],taskResults=[],notices=[],removed=[],settled=[];
 const command={id:'task-1',type:'task',extra:{task:'wire'},round:1,phase:'play',at:stamp,retries:0};
 const c=context({pendingCommand:false,pendingCommandId:'',commandQueue:[command],commandAttempt:0,commandRetryTimer:null,
  session:1,code:'room',uid:'me',connected:true,game:{phase:'play',round:1},commands:{},db:{},ref:(_,p)=>p,hostOnline:()=>true,isHost:()=>false,
  update:async()=>{writeCount++;if(mode==='write-failure')throw Error('permission denied');},remove:async path=>removed.push(path),
  now:()=>stamp,setTimeout:fn=>{scheduled.push(fn);return scheduled.length;},clearTimeout:()=>{},queueMicrotask:fn=>scheduled.push(fn),
  handleTaskCommandResult:r=>taskResults.push(r),toast:(...args)=>notices.push(args),errorText:e=>e.message,console,
  settleCommandFromHost:(...args)=>settled.push(args)});
 vm.runInContext(between('async function flushCommandQueue()','\nasync function writeRoomKick('),c);
 await c.flushCommandQueue();
 if(mode==='receipt-timeout'||mode==='confirmed'){
  c.commands[command.id]={result:{received:true,receivedAt:stamp}};
  if(mode==='confirmed')c.game.commandResults={me:{id:command.id,ok:true,type:'task'}};
  stamp+=31000;
 }
 for(let i=0;i<8&&scheduled.length;i++){await scheduled.shift()();await new Promise(resolve=>setImmediate(resolve));}
 if(mode==='confirmed'){assert.equal(settled.length,1);assert.equal(taskResults.length,0);assert.equal(notices.length,0);}
 else {assert.equal(taskResults.length,1,mode);assert.equal(taskResults[0].ok,false);assert.equal(taskResults[0].id,'task-1');assert.equal(c.pendingCommand,false);assert.equal(c.commandQueue.length,0);assert.equal(notices.length,1);}
 assert.equal(writeCount,mode==='no-receipt'?3:1);
}
for(const mode of ['write-failure','no-receipt','receipt-timeout','confirmed'])await queueCase(mode);
console.log('PASS task retry is released on write failure and missing receipts; confirmed results take precedence');

{
 const node={dataset:{},style:{},setAttribute(){}};let visible=false;
 const c=context({isHostConnectionNotice,$:()=>node,show:(_,v)=>visible=v,toastTimer:0,setTimeout:()=>1,clearTimeout:()=>{}});
 vm.runInContext(between('let toastPriority=0;','\n    let readyAcknowledgedAt='),c);
 c.toast('ホストが接続していないため操作を処理できません。');assert(!visible);
 c.toast('ホストが接続していないため操作を処理できません。','command-error');assert(visible);
 c.dismissToast();c.toast('PERMISSION_DENIED','error');assert(visible);assert.equal(node.dataset.kind,'error');
 console.log('PASS explicit action and persistence errors remain visible through connection-notice filtering');
}
