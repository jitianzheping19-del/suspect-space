// Match-scoped state: never stored in player preferences or browser storage.
export function soccerSecretActive(g){return g?.secretMode===true&&g.status==='playing';}
export function soccerSecretMember(g,id){return soccerSecretActive(g)&&g.members?.[id]!==undefined;}
export function soccerSecretBotTap(g,options,request){
 const zero=(options.enabled===false||options.blue+options.red===0);
 if(request.delta!==-1||!zero){g.secretInput=null;return;}
 const input=g.secretInput?.uid===request.uid?g.secretInput:{uid:request.uid,ids:[]};
 if(input.ids.includes(request.id))return;
 input.ids=[...input.ids,request.id].slice(-3);g.secretInput=input;
 if(input.ids.length===3)g.secretPending=true;
}
export function clearSoccerSecret(g){
 g.secretMode=false;g.secretGoalOffsets=[0,0];g.secretGoalMove=null;g.secretPowers={};g.secretChain=null;g.secretCombo=null;g.combinationCooldowns={};
 if(g.ball){delete g.ball.handOwner;delete g.ball.bellyOwner;delete g.ball.secretCurve;delete g.ball.fire;delete g.ball.secretShot;}
 for(const k of Object.values(g.keepers||{})){delete k.giantUntil;delete k.secretKnockback;}
}
export function soccerSecretHandPoint(p,belly=false){const yaw=Number(p.yaw)||0;return {x:p.x+Math.sin(yaw)*.58,y:(p.lobbyY||0)+(belly?.72:1.05),z:p.z+Math.cos(yaw)*.58};}
export function soccerLobTravel(distance,power,secret=false){return secret?3.6:Math.max(.85,Math.min(1.8,distance/(8+power*6)));}
export function soccerSecretSpeed(g,id){return soccerSecretMember(g,id)?3.2:1;}
export function soccerGoalX(F,z){return (z===F.near?F.nearGoalX:F.farGoalX)??23;}
export function stepSoccerSecretGoals(g,time){
 if(!soccerSecretActive(g))return false;
 g.secretNextGoalAt??=(g.startAt||time)+18000;
 if(time>=g.secretNextGoalAt&&time>=Number(g.ball.resetUntil||0)&&g.ball.keeperOwner===undefined){
  const n=g.secretGoalCount||0;g.secretGoalMove={team:n%2,side:Math.floor(n/2)%2?-1:1,at:time,until:time+6000};g.secretGoalCount=n+1;g.secretNextGoalAt=time+22000;
 }
 const m=g.secretGoalMove,offsets=[0,0];
 if(m&&time<m.until){const age=time-m.at,u=Math.max(0,Math.min(1,age<1200?age/1200:(m.until-time)/1200));offsets[m.team]=m.side*2.4*u*u*(3-2*u);}
 const changed=JSON.stringify(offsets)!==JSON.stringify(g.secretGoalOffsets);g.secretGoalOffsets=offsets;return changed;
}
