import {AIRSHIP_TASK_INTERACTIONS} from './airship-tasks.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createAirshipTaskRun(station,onComplete=()=>{},random=Math.random){
 const mode=station.mode;if(!AIRSHIP_TASK_INTERACTIONS.some(t=>t.mode===mode))throw Error('Unknown Airship task');
 const integer=n=>Math.floor(random()*n),shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=integer(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const state={finished:false,progress:0,message:'',error:false,step:0,selected:-1,values:[],holding:false,elapsed:0};
 switch(mode){
  case 'polish':state.values=Array(6).fill(0);break;
  case 'identity':state.code=String(10000+integer(90000));state.input='';break;
  case 'records':state.order=shuffle([0,1,2,0,1,2]);break;
  case 'loom':state.order=shuffle([0,1,2,3]);state.values=Array(4).fill(false);break;
  case 'safe':state.code=[2+integer(4),5+integer(3),1+integer(4)];state.angle=0;state.delta=0;break;
  case 'refuel':state.connected=false;break;
  case 'freight':state.order=shuffle([0,1,2,0,1,2]);break;
  case 'supplies':state.target=[2,3,1];state.values=[0,0,0];break;
  case 'voltage':state.volts=shuffle([24,12,31]);break;
  case 'shower':state.values=[0,0,0];state.targets=[90,120,60];state.fixed=[false,false,false];state.selected=0;break;
  case 'pump':state.lever=0;break;
  case 'attitude':state.values=[-28,22];break;
  case 'uplink':state.values=[20,90];state.target=[35+integer(5)*10,102+integer(9)];state.transmitting=false;break;
  case 'burger':state.order=[0,...shuffle([1,2,3]),4];break;
  case 'breakers':state.order=shuffle([1,2,3,4,5]);break;
  case 'medical':state.patient=integer(3);state.scanning=false;state.scanned=false;break;
  case 'surveillance':state.anomaly=integer(6);break;
  case 'routing':state.values=[1,1,1,1,1,1,1,1,1];break;
  case 'armory':state.order=shuffle([0,1,2,3]);state.values=Array(4).fill(false);break;
 }
 let notified=false;
 const finish=()=>{state.progress=1;state.finished=true;state.holding=false;state.message='作業完了';state.error=false;if(!notified){notified=true;onComplete();}};
 const error=message=>{state.error=true;state.message=message;return false;};
 const ok=message=>{state.error=false;state.message=message;return true;};
 const advance=(total,message)=>{state.step++;state.progress=state.step/total;if(state.step===total)finish();else ok(message||'確認しました');return true;};
 function act(type,value){
  if(state.finished)return false;
  const n=Number(value),index=Number.isInteger(n)?n:-1;
  if(type==='release'){state.holding=false;return true;}
  switch(mode){
   case 'polish':if(type==='rub'&&index>=0&&index<6){state.values[index]=Math.min(1,state.values[index]+.2);state.progress=state.values.reduce((a,b)=>a+b)/6;if(state.progress>=.999)finish();return true;}break;
   case 'identity':if(type==='digit'&&index>=0&&index<=9&&state.input.length<5)state.input+=index;else if(type==='back')state.input=state.input.slice(0,-1);else if(type==='confirm'){if(state.input===state.code)finish();else return error('身分証の5桁と照合してください');}else return false;return ok('');
   case 'records':case 'freight':if(type==='choose'&&index>=0&&index<3){if(index!==state.order[state.step])return error(mode==='records'?'書類と棚の記号を合わせてください':'荷物の取り扱いラベルを確認してください');return advance(6,'次の荷物を確認');}break;
   case 'loom':case 'armory':
    if(type==='select'&&index>=0&&index<4&&!state.values[index]){state.selected=index;return ok('対応する'+(mode==='loom'?'端子':'収納枠')+'を選択');}
    if(type==='place'&&index>=0&&index<4&&state.selected>=0){if(state.order[index]!==state.selected)return error('形・記号が違います');state.values[state.selected]=true;state.selected=-1;state.progress=state.values.filter(Boolean).length/4;if(state.progress===1)finish();else ok('固定しました');return true;}break;
   case 'safe':if(type==='turn'&&Number.isFinite(n)){const next=clamp(n,0,9);state.delta=next-state.angle;state.angle=next;return ok('');}if(type==='confirm'){const sign=state.step===1?-1:1;if(Math.abs(state.angle-state.code[state.step])>.15||Math.sign(state.delta)!==sign)return error('矢印の向きに回して、番号を合わせてください');return advance(3,'次の番号へ');}break;
   case 'refuel':if(type==='connect'){state.connected=true;return ok('接続完了。給油を押し続ける');}if(type==='hold'&&state.connected){state.holding=true;return ok('給油中');}break;
   case 'supplies':if(type==='stock'||type==='remove'){if(index<0||index>2)return false;state.values[index]=clamp(state.values[index]+(type==='stock'?1:-1),0,5);state.progress=state.values.filter((v,i)=>v===state.target[i]).length/3;if(state.progress===1)finish();else ok('必要数に合わせて補充');return true;}break;
   case 'voltage':if(type==='probe'&&index===state.step){state.selected=index;return ok('電圧を読み取って記録');}if(type==='record'&&state.selected===state.step){const normal=state.volts[state.step]>=22&&state.volts[state.step]<=26;if(value!==(normal?'normal':'fault'))return error('正常範囲は22〜26Vです');state.selected=-1;return advance(3,'次の回路を測定');}break;
   case 'shower':if(type==='select'&&index>=0&&index<3&&!state.fixed[index]){state.selected=index;return ok('レンチで角度を合わせる');}if(type==='turn'&&Number.isFinite(n)){state.values[state.selected]=clamp(n,0,180);return true;}if(type==='confirm'){const i=state.selected;if(state.fixed[i])return false;if(Math.abs(state.values[i]-state.targets[i])>6)return error('緑の角度へ合わせてください');state.fixed[i]=true;state.selected=state.fixed.indexOf(false);if(state.selected<0)state.selected=i;return advance(3,'次のボルトを締める');}break;
   case 'pump':if(type==='pump'&&(n===0||n===1)){if(state.lever===n)return false;state.lever=n;if(n===0)return advance(6,'燃料を送りました');return ok('ハンドルを下へ');}break;
   case 'attitude':case 'uplink':if((type==='axis0'||type==='axis1')&&Number.isFinite(n)){const i=type==='axis0'?0:1;state.values[i]=clamp(n,mode==='attitude'?-45:0,mode==='attitude'?45:i===0?180:120);if(mode==='uplink'&&state.transmitting){state.transmitting=false;state.elapsed=0;state.progress=0;}return ok('');}if(mode==='uplink'&&type==='transmit'){if(state.values.some((v,i)=>Math.abs(v-state.target[i])>.6))return error('角度と周波数を指定値に合わせてください');state.transmitting=true;return ok('データを送信しています');}break;
   case 'burger':if(type==='ingredient'&&index>=0&&index<=4){if(index!==state.order[state.step])return error('注文票を下から順に重ねてください');return advance(5,'具材を重ねました');}if(type==='undo'&&state.step>0){state.step--;state.progress=state.step/5;return ok('一段戻しました');}break;
   case 'breakers':if(type==='breaker'&&index>=0&&index<5){if(state.order[index]!==state.step+1)return error('1から順にスイッチを入れてください');return advance(5,'回路を接続しました');}break;
   case 'medical':if(type==='scan'&&!state.scanned){state.scanning=true;return ok('診察データを走査しています');}if(type==='patient'&&state.scanned){if(index!==state.patient)return error('番号・血液型が検査結果と一致しません');state.selected=index;return ok('一致しました。記録に押印');}if(type==='stamp'&&state.scanned&&state.selected===state.patient){finish();return true;}break;
   case 'surveillance':if(type==='camera'&&index>=0&&index<6){state.selected=index;return ok('扉の状態を確認');}if(type==='report'&&state.selected>=0){if(state.selected!==state.anomaly)return error('この扉は閉まっています。他の映像を確認してください');finish();return true;}break;
   case 'routing':if(type==='rotate'&&index>=0&&index<9){state.values[index]=(state.values[index]+1)%4;state.progress=state.values.filter(v=>v===0).length/9;return ok('電源から出口までつなげる');}if(type==='test'){if(!circuitConnected(state.values))return error('まだ途切れています。配線の端をつなげてください');finish();return true;}break;
  }
  return false;
 }
 function tick(seconds){if(state.finished||!Number.isFinite(seconds)||seconds<=0)return;const dt=Math.min(seconds,.1);
  if(mode==='refuel'&&state.holding&&state.connected){state.elapsed+=dt;state.progress=Math.min(1,state.elapsed/2.4);if(state.progress>=1)finish();}
  if(mode==='attitude'){state.elapsed=state.values.every(v=>Math.abs(v)<=3)?state.elapsed+dt:0;state.progress=Math.min(1,state.elapsed/1.2);if(state.progress>=1)finish();}
  if(mode==='uplink'&&state.transmitting){state.elapsed+=dt;state.progress=Math.min(1,state.elapsed/1.8);if(state.progress>=1)finish();}
  if(mode==='medical'&&state.scanning){state.elapsed+=dt;state.progress=Math.min(.7,state.elapsed/2*.7);if(state.elapsed>=2){state.scanning=false;state.scanned=true;ok('検査結果と一致する患者を選ぶ');}}
 }
 return {mode,state,act,tick,cancel(){state.holding=false;state.transmitting=false;state.scanning=false;},release(){state.holding=false;}};
}
// Port directions: north/east/south/west. The intended cable snakes through all nine tiles.
export const CIRCUIT_PORTS=[[3,1],[3,1],[3,2],[1,2],[1,3],[0,3],[0,1],[3,1],[3,1]];
export function circuitConnected(rotations){
 const ports=CIRCUIT_PORTS.map((p,i)=>p.map(d=>(d+rotations[i])%4));if(!ports[0].includes(3))return false;
 const queue=[0],seen=new Set(queue),moves=[-3,1,3,-1];while(queue.length){const i=queue.shift();if(i===8&&ports[i].includes(1))return true;for(const d of ports[i]){if(d===1&&i%3===2||d===3&&i%3===0)continue;const n=i+moves[d];if(n<0||n>8||!ports[n].includes((d+2)%4)||seen.has(n))continue;seen.add(n);queue.push(n);}}return false;
}
