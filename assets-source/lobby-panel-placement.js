/* LOBBY_PANEL_PLACEMENT_BEGIN */
// Parent UI and the lobby iframe share coordinates through a bounded message.
// Try stable free slots instead of assuming a fixed bottom offset is safe.
function installLobbyPanelPlacement(){
 let reserved=[],scheduled=false;
 function place(){scheduled=false;const hud=document.getElementById('lobbyKartHud');if(!hud||hud.dataset.show!=='true')return;
  const box=hud.getBoundingClientRect(),w=box.width,h=box.height,gap=10;
  const xs=[innerWidth-w-gap,gap,(innerWidth-w)/2],ys=[84,innerHeight-h-112,innerHeight*.45-h/2,12];
  let best=null;
  for(const x0 of xs)for(const y0 of ys){const x=Math.max(gap,Math.min(innerWidth-w-gap,x0)),y=Math.max(gap,Math.min(innerHeight-h-gap,y0));let score=0;
   for(const r of reserved){const overlapX=Math.max(0,Math.min(x+w+gap,r.right)-Math.max(x-gap,r.left)),overlapY=Math.max(0,Math.min(y+h+gap,r.bottom)-Math.max(y-gap,r.top));score+=overlapX*overlapY;}
   if(!best||score<best.score)best={x,y,score};
  }
  if(best){hud.style.setProperty('left',best.x+'px','important');hud.style.setProperty('top',best.y+'px','important');hud.style.setProperty('right','auto','important');hud.style.setProperty('bottom','auto','important');}
 }
 const queue=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(place);}};
 window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='lobby-ui-reserved'||!Array.isArray(event.data.rects))return;reserved=event.data.rects.slice(0,16).filter(r=>['left','top','right','bottom'].every(k=>Number.isFinite(r[k])));queue();});
 window.addEventListener('resize',queue);
}
installLobbyPanelPlacement();
/* LOBBY_PANEL_PLACEMENT_END */
