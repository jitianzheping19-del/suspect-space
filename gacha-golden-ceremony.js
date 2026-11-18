// Cosmetic only: the server has already selected the award before this begins.
export function createGoldenPromotionCue(host){
 const cue=document.createElement('div');
 cue.className='goldenPromotionCue';cue.hidden=true;cue.setAttribute('aria-hidden','true');
 cue.innerHTML='<div class="goldenPromotionCracks"></div><div class="gachaCrestCaption"><small></small><strong></strong></div>';
 (host.querySelector('.gachaStage')||host).append(cue);
 const english=cue.querySelector('small'),name=cue.querySelector('strong');
 const captions={
  legend:['LEGEND RARE','レジェンドレア'],
  charge:['SEAL RELEASE','封印解除'],
  crown:['CORONATION','黄金覚醒']
 };
 function show(phase){
  cue.hidden=false;
  if(cue.dataset.phase===phase)return;
  cue.dataset.phase=phase;
  [english.textContent,name.textContent]=captions[phase];
 }
 function update(progress){
  const phase=progress<.32?'legend':progress<.74?'charge':'crown';
  show(phase);host.dataset.goldenPromotion=phase;
 }
 function reset(){cue.hidden=true;delete cue.dataset.phase;delete host.dataset.goldenPromotion;}
 return{update,legend(){show('legend');},reset,dispose(){reset();cue.remove();}};
}
