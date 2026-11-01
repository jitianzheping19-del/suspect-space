import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('index.html','utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
let stamp=1000,host=true,writes=0,shown=[],disposed=0;
const game={phase:'results',lastVoteResult:{id:'r1'},resultsEndsAt:30000};
const c={game,code:'qa',session:1,latest3D:{meeting:{id:'m1'}},isHost:()=>host,now:()=>stamp,db:{},ref:()=>({}),console,
 runTransaction:async(_r,fn)=>{const next=fn(game);if(next){Object.assign(game,next);writes++;}},
 meeting3DOn:false,meetingFrameRendered:false,voteResultRevealAt:5000,voteResultRevealReportedId:'',ejectVisualUntil:5000,
 voteEjection3D:{dispose(){disposed++;}},resultScalesVisual:{dispose(){disposed++;}},effectTimers:new Map([['voteResult',1],['eject-stage',2]]),clearTimeout(){},show:(...args)=>shown.push(args)};
vm.createContext(c);
vm.runInContext(between('async function reportMeetingResultReveal(','function meeting3DFrame(')+between('    function syncVoteResultPresentation(','    function toggleMap('),c);
await c.reportMeetingResultReveal('old');await c.reportMeetingResultReveal('r1','wrong');assert.equal(writes,0);
c.syncVoteResultPresentation('results');assert.equal(writes,0,'do not skip the ejection');
stamp=5000;host=false;c.syncVoteResultPresentation('results');assert.equal(writes,0,'non-host must not change deadlines');
host=true;c.syncVoteResultPresentation('results');await new Promise(setImmediate);assert.equal(writes,1);assert.equal(game.resultsEndsAt,8000);
stamp=5500;c.syncVoteResultPresentation('results');await new Promise(setImmediate);assert.equal(writes,1,'do not extend the deadline on repeat');
delete game.resultsPresentationId;game.resultsEndsAt=5700;await c.reportMeetingResultReveal('r1');assert.equal(game.resultsEndsAt,5700,'never extend a shorter host deadline');
for(const phase of ['ended','play','lobby']){c.voteEjection3D={dispose(){disposed++;}};c.resultScalesVisual={dispose(){disposed++;}};c.effectTimers.set('voteResult',1);c.ejectVisualUntil=0;shown=[];c.syncVoteResultPresentation(phase);assert.deepEqual(shown,[['voteResult',false]]);assert.equal(c.effectTimers.size,0);assert.equal(c.voteEjection3D,null);assert.equal(c.resultScalesVisual,null);}
c.ejectVisualUntil=9000;shown=[];c.syncVoteResultPresentation('ended');assert.equal(shown.length,0,'finish an in-progress local ejection first');stamp=9000;c.syncVoteResultPresentation('ended');assert.deepEqual(shown,[['voteResult',false]]);
console.log('PASS 2D completion, host-only updates, stale results, bounded deadline, duplicate reports, ending/play/lobby cleanup');
