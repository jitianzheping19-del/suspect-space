import assert from 'node:assert/strict';
import {AIRSHIP_TASK_INTERACTIONS as tasks} from '../airship-tasks.js';
import {createAirshipTaskRun,circuitConnected} from '../airship-task-rules.js';
assert.equal(tasks.length,19);assert.equal(new Set(tasks.map(t=>t.mode)).size,19);assert(circuitConnected(Array(9).fill(0)));assert(!circuitConnected(Array(9).fill(1)));
for(const task of tasks){let done=0;const r=createAirshipTaskRun(task,()=>done++,()=>.42),s=r.state,a=r.act,tick=n=>{for(let i=0;i<n;i++)r.tick(.1);};
 a('not-an-action',99);assert(!s.finished);r.tick(1000);assert(!s.finished,task.mode+' cannot auto complete');
 switch(task.mode){
  case 'polish':a('rub',-1);assert.equal(s.progress,0);for(let i=0;i<6;i++)for(let j=0;j<5;j++)a('rub',i);break;
  case 'identity':a('confirm');assert(s.error);for(const n of s.code)a('digit',n);a('confirm');break;
  case 'records':case 'freight':a('choose',(s.order[0]+1)%3);assert.equal(s.step,0);for(const n of s.order)a('choose',n);break;
  case 'loom':case 'armory':a('place',0);assert.equal(s.progress,0);for(let i=0;i<4;i++){a('select',i);a('place',s.order.indexOf((i+1)%4));assert(s.error);a('place',s.order.indexOf(i));}break;
  case 'safe':a('confirm');assert(s.error);for(let i=0;i<3;i++){a('turn',i===1?9:0);a('turn',s.code[i]);a('confirm');}break;
  case 'refuel':a('hold');tick(50);assert.equal(s.progress,0);a('connect');a('hold');tick(8);r.release();const held=s.progress;tick(10);assert.equal(s.progress,held);a('hold');tick(40);break;
  case 'supplies':a('stock',9);assert.deepEqual(s.values,[0,0,0]);a('stock',0);a('remove',0);for(let i=0;i<3;i++)for(let n=0;n<s.target[i];n++)a('stock',i);break;
  case 'voltage':a('record','normal');assert.equal(s.step,0);for(let i=0;i<3;i++){a('probe',i);const normal=s.volts[i]>=22&&s.volts[i]<=26;a('record',normal?'fault':'normal');assert(s.error);a('record',normal?'normal':'fault');}break;
  case 'shower':a('confirm');assert(s.error);for(let i=0;i<3;i++){a('select',i);a('turn',s.targets[i]);a('confirm');}break;
  case 'pump':a('pump',0);assert.equal(s.step,0);for(let i=0;i<6;i++){a('pump',1);a('pump',1);a('pump',0);}break;
  case 'attitude':tick(50);assert.equal(s.progress,0);a('axis0',0);a('axis1',0);tick(5);a('axis0',10);tick(1);assert.equal(s.progress,0);a('axis0',0);tick(20);break;
  case 'uplink':a('transmit');assert(s.error);s.target.forEach((v,i)=>a('axis'+i,v));a('transmit');tick(3);a('axis0',0);assert(!s.transmitting);a('axis0',s.target[0]);a('transmit');tick(30);break;
  case 'burger':a('ingredient',4);assert(s.error);a('ingredient',0);a('undo');assert.equal(s.step,0);for(const i of s.order)a('ingredient',i);break;
  case 'breakers':a('breaker',s.order.indexOf(5));assert(s.error);for(let i=1;i<=5;i++)a('breaker',s.order.indexOf(i));break;
  case 'medical':a('stamp');assert(!s.finished);a('scan');tick(30);a('patient',(s.patient+1)%3);assert(s.error);a('patient',s.patient);a('stamp');break;
  case 'surveillance':a('camera',(s.anomaly+1)%6);a('report');assert(s.error);a('camera',s.anomaly);a('report');break;
  case 'routing':a('test');assert(s.error);for(let i=0;i<9;i++)for(let n=0;n<3;n++)a('rotate',i);a('test');break;
 }
 assert(s.finished,task.mode+' can be completed');assert.equal(done,1,task.mode);a('confirm');tick(20);assert.equal(done,1);r.cancel();assert(!s.holding);console.log('PASS',task.mode,'invalid actions, solution, single completion');
}
