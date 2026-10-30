// Activity indicators are metadata; they never gate the microphone's samples.
export function createVoiceActivityGate({holdMs=420,startLevel=.030,stopLevel=.015}={}){
  let speaking=false,lastLoud=-Infinity;
  return{update(level,stamp,enabled=true){if(!enabled){speaking=false;lastLoud=-Infinity;return false;}if(level>=(speaking?stopLevel:startLevel)){lastLoud=stamp;speaking=true;}else if(stamp-lastLoud>=holdMs)speaking=false;return speaking;},reset(){speaking=false;lastLoud=-Infinity;}};
}
export function voiceConnectionUsable({connected,joined,lossAt,stamp,healthy,graceMs=5000}){
  return !!connected||!!joined&&!!healthy&&lossAt>0&&stamp-lossAt>=0&&stamp-lossAt<graceMs;
}
export function voiceGainChanged(previous,next){return !Number.isFinite(previous)||Math.abs(previous-next)>.012||(previous===0)!==(next===0);}

// AudioParam automation runs on the audio thread. Stationary players should
// not enqueue identical curves on every spatial tick.
export function createVoiceSpatialParamUpdater(){
 const targets=new WeakMap();
 return(param,value,time,tau)=>{
  if(!param||!Number.isFinite(value))return false;
  const previous=targets.get(param);
  if(previous!==undefined&&Math.abs(previous-value)<.002)return false;
  param.setTargetAtTime(value,time,tau);targets.set(param,value);return true;
 };
}
export function voicePresenceConnectionChanged(previous,next){
 return previous?.joined!==next?.joined||previous?.session!==next?.session||
  previous?.memberId!==next?.memberId||previous?.skywayMemberId!==next?.skywayMemberId;
}
