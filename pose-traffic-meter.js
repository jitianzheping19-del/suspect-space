// Count successful data-channel sends and accepted remote samples, not render
// callbacks or attempted sends. Reporting is bounded by the room's peer count.
export function createPoseTrafficMeter(){
 let start=null,send=new Map(),receive=new Map(),latest={sendHz:0,receiveHz:0};
 const peak=(counts,seconds)=>Math.max(0,...counts.values())/seconds;
 return{
  record(direction,id,stamp){if(start===null)start=stamp;const counts=direction==='send'?send:receive;counts.set(id,(counts.get(id)||0)+1);},
  snapshot(stamp){if(start===null)return{...latest};const elapsed=stamp-start;if(elapsed>=1000){latest={sendHz:Math.round(peak(send,elapsed/1000)),receiveHz:Math.round(peak(receive,elapsed/1000))};send.clear();receive.clear();start=stamp;}return{...latest};},
  reset(){start=null;send.clear();receive.clear();latest={sendHz:0,receiveHz:0};}
 };
}
