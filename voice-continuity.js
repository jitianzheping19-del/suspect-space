// Activity indicators are metadata; they never gate the microphone's samples.
export function createVoiceActivityGate({holdMs=420,startLevel=.030,stopLevel=.015}={}){
  let speaking=false,lastLoud=-Infinity;
  return{update(level,stamp,enabled=true){if(!enabled){speaking=false;lastLoud=-Infinity;return false;}if(level>=(speaking?stopLevel:startLevel)){lastLoud=stamp;speaking=true;}else if(stamp-lastLoud>=holdMs)speaking=false;return speaking;},reset(){speaking=false;lastLoud=-Infinity;}};
}
export function voiceConnectionUsable({connected,joined,lossAt,stamp,healthy,graceMs=5000}){
  return !!connected||!!joined&&!!healthy&&lossAt>0&&stamp-lossAt>=0&&stamp-lossAt<graceMs;
}
export function voiceGainChanged(previous,next){return !Number.isFinite(previous)||Math.abs(previous-next)>.012||(previous===0)!==(next===0);}
