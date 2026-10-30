// Map the sender's sample clock to the local monotonic render clock. Packet
// arrival bursts must not squeeze 100 ms of movement into a single frame.
export function alignRemotePoseTimeline(data,samples,next){
 if(!next.timestampFresh){next.sampleAt=next.receivedAt;return;}
 const offset=next.receivedAt-next.timestamp;
 if(!samples.length||!Number.isFinite(data.remotePoseClockOffset))data.remotePoseClockOffset=offset;
 else if(offset<data.remotePoseClockOffset){
  const shift=offset-data.remotePoseClockOffset;
  for(const sample of samples)if(sample.timestampFresh)sample.sampleAt=(sample.sampleAt??sample.receivedAt)+shift;
  data.remotePoseClockOffset=offset;
 }
 next.sampleAt=next.timestamp+data.remotePoseClockOffset;
}
