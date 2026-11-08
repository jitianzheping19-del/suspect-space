 async function followup(){
 rows.length=0;
 for(const id of ['crewmate'])await run(id,'all 26 Skeld stations reachable by Use',async()=>{
  setMapMode('classic');game.settings.mapMode='classic';check(TASKS.length===26,'task count '+TASKS.length);const player=game.players.qa;
  for(const task of TASKS){player.assignedTasks=[task.id];player.tasks={};let found=null;
   for(let radius=.5;radius<2.15&&!found;radius+=.15)for(let i=0;i<48&&!found;i++){const a=i/48*Math.PI*2,at={x:task.x+Math.cos(a)*radius,z:task.z+Math.sin(a)*radius};if(collision(at.x,at.z)||wallBetween(at,task))continue;position=at;Object.assign(players.qa,at);Object.assign(player,at);if(nearestTask()?.id===task.id&&nearbyAction()?.kind==='task')found=at;}
   check(found,'unreachable '+task.id+' '+task.name);check(stationMeshes.has(task.id),'missing station '+task.id);check(task.taskEngine||Number.isFinite(task.terminalIndex),'missing engine '+task.id);
  }
 });
 await run('impostor','door sabotage cap including pending closure and unlocking',async()=>{
  updateShipDoorsHost(game,clock);const layout=shipDoorLayout(game),group=layout.groups.find(g=>g.doorIds.length>=2)||layout.groups[0],first=layout.doors.find(d=>d.id===group.doorIds[0]);
  Object.assign(players.b,{x:first.x,z:first.z});const cmd={id:'cap-first',type:'doorClose',groupId:group.id};handleShipDoorCommand(game,'qa',cmd,game.players.qa,players.qa,clock);check(game.commandResults.qa.ok,'first group closes');check(reservedShipDoorCount(game,clock)<=2,'never exceeds 2');check(game.doors.find(d=>d.id===first.id).pendingClose,'occupant delays closure');
  if(reservedShipDoorCount(game,clock)<2){const next=layout.groups.find(g=>g.id!==group.id);handleShipDoorCommand(game,'qa',{...cmd,id:'cap-second',groupId:next.id},game.players.qa,players.qa,clock);}
  check(reservedShipDoorCount(game,clock)===2,'two slots');const third=layout.doors.find(d=>!game.doors.find(s=>s.id===d.id).closed&&!game.doors.find(s=>s.id===d.id).pendingClose);
  handleShipDoorCommand(game,'qa',{...cmd,id:'cap-third',groupId:third.groupId},game.players.qa,players.qa,clock);check(!game.commandResults.qa.ok&&game.commandResults.qa.message.includes('2'),'third command rejected');
  check(setShipDoorOpen(game,third,false,'qa',clock)===false,'low level cap');
  const opening=game.doors.find(s=>s.closed||s.pendingClose);opening.closed=false;opening.pendingClose=false;opening.openingAt=clock;opening.openAt=clock+1000;check(reservedShipDoorCount(game,clock)===2,'unlocking holds slot');
  updateShipDoorsHost(game,clock+1100);check(reservedShipDoorCount(game,clock+1100)===1,'unlocked releases slot');
 });
 await run('doorer','door role respects cap and rejected command keeps cooldown',async()=>{
  updateShipDoorsHost(game,clock);const layout=shipDoorLayout(game),doors=layout.doors.slice(0,3);for(const door of doors.slice(0,2))setShipDoorOpen(game,door,false,'test',clock);
  Object.assign(players.qa,{x:doors[2].x,z:doors[2].z});handleDoorerAbilityCommand(game,'qa',{id:'doorer-cap',type:'ability',ability:'doorer'},game.players.qa,players.qa,clock);
  check(!game.commandResults.qa.ok,'third rejected');check(!game.players.qa.abilityReadyAt,'cooldown not consumed');
  Object.assign(players.qa,{x:doors[0].x,z:doors[0].z});handleDoorerAbilityCommand(game,'qa',{id:'doorer-open',type:'ability',ability:'doorer'},game.players.qa,players.qa,clock);check(game.commandResults.qa.ok,'opening is allowed at cap');check(reservedShipDoorCount(game,clock)===1,'one remains closed');
 });
 return{roles:[{id:'followup'}],rows};
 }
