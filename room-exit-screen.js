import './room-exit-screen.css';

let screen=null;
export function showRoomExitScreen(){
 if(!screen){
  screen=document.createElement('dialog');screen.id='roomExitScreen';
  screen.setAttribute('aria-label','メニューへ戻っています');
  screen.innerHTML='<div class="lobbyLoadCard" role="status" aria-live="polite"><div class="lobbyLoadOrbit" aria-hidden="true"><div class="lobbyLoadPlanet"></div><div class="lobbyLoadSatellite"><i></i></div><div class="lobbyLoadRing"></div></div><small>SPACE SUSPECT</small><h2>ロード中…</h2><p class="lobbyLoadStatus">メニューへ戻っています</p></div>';
  screen.addEventListener('cancel',event=>event.preventDefault());
  document.body.append(screen);
 }
 document.body.dataset.roomExit='true';
 if(!screen.open)screen.showModal();
 let closed=false;
 return()=>{if(closed)return;closed=true;screen.close();delete document.body.dataset.roomExit;};
}
