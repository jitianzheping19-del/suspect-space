export const SOCCER_GUIDE=[
 ['move','基本','移動とドリブル','左スティックを動かす','少し倒すと細かいタッチ。大きく倒すと走ります。ボールに近づくと足元でキープします。','左スティックを進みたい方向へ'],
 ['dash','基本','ダッシュ','フェイントボタンを長押し','押している間だけ加速します。スタミナは4秒でなくなり、止まると回復します。使い切ったら指を離し、回復してから押し直します。','フェイントを長押し → 離す'],
 ['pass','パス・シュート','パス','右のキックボタンから味方へフリック','狙い線が味方につながり「パス」と出たら指を離します。前に出したい味方を狙ってください。','味方の方向へなぞる → 離す'],
 ['through','パス・シュート','スルーパス','味方へフリックして0.35秒止める','2本の線のうち前方へ伸びる線が光ったら指を離します。保持前なら通常パス。方向を変えると保持時間がやり直しになります。','味方へフリック → 0.35秒止める → 離す'],
 ['shot','パス・シュート','シュート','ゴールへ狙って指を離す','長く押すほど強く蹴ります。2回タップでもシュートを選べます。','押す → ゴールへ狙う → 離す'],
 ['curve','パス・シュート','カーブシュート','狙ってから指を横へ曲げる','曲がる予測線を確認し、指を離します。まっすぐな操作なら直線のシュートになります。','ゴールへなぞる → 横に曲げる → 離す'],
 ['lob','パス・シュート','フライパス','味方へなぞり、ボタンへ戻す','「フライパス」と出たら離します。ボールを浮かせて相手の上を越します。','味方へなぞる → ボタンへ戻す → 離す'],
 ['scissors','フェイント','シザース','ボールを持って左スティックで円を描く','スティックを大きく倒したまま一周させると、左右の足でボールをまたぎます。半円や短い往復では出ません。','左スティックで一周 → シザース'],
 ['backward','基本','足裏で後退','ボールを持って後ろへスティックを倒す','ボールに向いたまま、足の裏で少しずつ引いて下がります。前へ倒すと通常のボールタッチに戻ります。','後ろへ倒す → 足裏で引く'],
 ['shotFeint','フェイント','キックフェイント','キックを構えたままフェイントを押す','シュートを取り消して切り返します。キック側の指を離しても、取り消した球は蹴りません。','キックを押しながら別の指でフェイント'],
 ['doubleTouch','フェイント','ダブルタッチ','キャラの前方へフェイントをフリック','左右の足でボールを素早く動かします。キャラクターの向きが基準です。','前方へフリック → 離す'],
 ['roulette','フェイント','ルーレット','キャラの横方向へフェイントをフリック','ボールを身体で守りながら回転して進みます。相手が近づくタイミングに合わせます。','キャラの横へフリック → 離す'],
 ['heelLift','フェイント','ヒールリフト','キャラの後方へフェイントをフリック','かかとでボールを浮かせます。そのままキックを押すと空中シュートにつなげられます。','キャラの後ろへフリック → 離す'],
 ['press','守備','プレス','プレスを長押し','相手に近づいてボールを奪います。左スティックで接近方向を調整でき、離すと止まります。','プレスを押して接近 → 離すと解除'],
 ['slide','守備','スライディング','滑る方向へスライドボタンをフリック','伸ばした足でボールを狙います。相手に接触すると相手も転倒します。起き上がるまで次の操作を待ちます。','スライドボタンから狙う方向へ → 離す'],
 ['traps','空中のボール','自動トラップ','ボールの落下位置へ移動する','触れる高さと速さに合わせて自動でトラップします。トラップ中は左スティックでボールを収める方向を選べます。シュートしたいときは、捕まえる前にキックを押します。','落下位置へ移動 → 左スティックで収める方向を選ぶ'],
 ['header','空中のボール','ダイビングヘッド','前方の高い球にキックを押す','前に飛び込み、頭でゴールへ打ちます。ボールに届く距離で「ヘディング」表示を確認します。','前方の高い球 → キック'],
 ['heelOverhead','空中のボール','ヒールリフト → オーバーヘッド','ヒールリフトの直後にキックを押す','かかとで浮かせてから、踏み切って反転し、足をボールに当てます。着地・起き上がりが終わるまで待ちます。','ヒールリフト → キック → 着地・起き上がり'],
 ['overhead','空中のボール','オーバーヘッド','背後の高い球にキックを押す','背後へ身体を倒し、両脚を交差させて蹴ります。ヒールリフトからもつなげられます。','背後の高い球 → キック'],
 ['volley','空中のボール','ジャンピングボレー','足先の高さの浮き球にキックを押す','踏み切って足を伸ばし、浮いたボールを直接シュートします。着地してから通常操作に戻ります。','前方・足先の浮き球 → キック']
];
export function soccerGuidePhotos(id){
 const captions=id==='traps'?['頭の高さで受ける','胸の高さで受ける','足の高さで受ける']:['操作の準備','操作中','動作の結果'];
 return captions.map((caption,i)=>({src:'tutorial/soccer/'+id+'-'+(i+1)+'.jpg',caption,time:id==='traps'?[.25,2.05,5.65][i]:[.45,1.10,2.20][i]}));
}
export function createSoccerGuide({document,window,onOpen=()=>{}}){
 const button=document.createElement('button');button.id='soccerTutorialBtn';button.type='button';button.textContent='チュートリアル';button.hidden=true;button.dataset.spacePointerAction='direct';
 const dialog=document.createElement('dialog');dialog.id='soccerTutorial';dialog.setAttribute('aria-labelledby','soccerTutorialTitle');
 dialog.innerHTML='<header><h2 id="soccerTutorialTitle">フットサルの遊び方</h2><button type="button" data-space-pointer-action="direct" aria-label="チュートリアルを閉じる">閉じる</button></header><nav role="tablist" aria-label="操作の種類"></nav><div class="soccerGuideActions" aria-label="確認する動作"></div><section role="tabpanel"><h3></h3><strong></strong><p></p><video controls autoplay playsinline muted loop preload="metadata"></video><div class="soccerGuidePhotos" hidden aria-label="操作の流れを写真で見る"></div><div class="soccerGuideMediaButtons"><button type="button" data-space-pointer-action="direct" data-photos>写真で見る</button><button type="button" data-space-pointer-action="direct" data-retry-video hidden>動画を再試行</button></div><p class="soccerGuideGesture"></p><p class="soccerGuideVideoError" role="status" hidden></p><p class="soccerGuidePhotoError" role="status" hidden>写真を読み込めませんでした。上の操作説明をご確認ください。</p></section>';
 document.body.append(button,dialog);
 const nav=dialog.querySelector('nav'),actions=dialog.querySelector('.soccerGuideActions'),video=dialog.querySelector('video'),panel=dialog.querySelector('[role="tabpanel"]'),photos=dialog.querySelector('.soccerGuidePhotos'),photoButton=dialog.querySelector('[data-photos]'),retryButton=dialog.querySelector('[data-retry-video]'),notice=dialog.querySelector('.soccerGuideVideoError'),photoError=dialog.querySelector('.soccerGuidePhotoError');
 let group='',current=null,attempt=0,timer=0,preferPhotos=false,photoNotice='';
 const stopWatch=()=>{window.clearTimeout(timer);timer=0;};
 function stopVideo(){
  ++attempt;stopWatch();video.onplaying=video.onwaiting=video.onstalled=video.onerror=video.onpause=null;
  video.pause();video.removeAttribute('src');video.load();
 }
 function showPhotos(reason=''){
  if(!current||!dialog.open)return;stopVideo();preferPhotos=true;photoNotice=reason;
  video.hidden=true;photos.hidden=false;photoButton.hidden=true;retryButton.hidden=false;
  notice.textContent=reason;notice.hidden=!reason;photoError.hidden=true;
  photos.replaceChildren();
  for(const [i,photo]of soccerGuidePhotos(current[0]).entries()){
   const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
   img.width=640;img.height=400;img.alt=current[2]+'：'+photo.caption;
   img.onerror=()=>{if(img.isConnected&&!photos.hidden)photoError.hidden=false;};
   img.src=new URL(photo.src,document.baseURI).href;caption.textContent=(i+1)+'. '+photo.caption;
   figure.append(img,caption);photos.append(figure);
  }
 }
 function playVideo(){
  if(!current||!dialog.open)return;stopVideo();const run=attempt;
  preferPhotos=false;photoNotice='';video.hidden=false;photos.hidden=true;photoButton.hidden=false;retryButton.hidden=true;notice.hidden=true;photoError.hidden=true;
  const failed=()=>{if(run===attempt&&dialog.open)showPhotos('動画を再生できないため、写真で説明しています。');};
  const watch=()=>{if(run!==attempt||timer)return;timer=window.setTimeout(()=>{timer=0;failed();},6000);};
  video.onplaying=()=>{if(run===attempt)stopWatch();};video.onpause=()=>{if(run===attempt&&video.paused&&video.readyState>=2)stopWatch();};video.onerror=failed;video.onwaiting=video.onstalled=watch;
  if(!video.canPlayType('video/mp4')){failed();return;}
  video.poster=new URL(soccerGuidePhotos(current[0])[0].src,document.baseURI).href;
  video.src=new URL('tutorial/soccer/'+current[0]+'.mp4',document.baseURI).href;video.muted=true;watch();
  try{const started=video.play();started?.catch(e=>{if(e.name!=='AbortError')failed();});}catch{failed();}
 }
 function show(row){
  current=row;const [id,,title,lead,description,gesture]=row;
  panel.querySelector('h3').textContent=title;panel.querySelector('strong').textContent=lead;panel.querySelector('p').textContent=description;panel.querySelector('.soccerGuideGesture').textContent=gesture;
  video.setAttribute('aria-label',title+'の操作例');
  for(const b of actions.children)b.setAttribute('aria-pressed',String(b.dataset.clip===id));
  if(preferPhotos)showPhotos(photoNotice);else playVideo();
 }
 function tab(category){group=category;for(const b of nav.children){const selected=b.textContent===category;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected)panel.setAttribute('aria-labelledby',b.id);}actions.replaceChildren();for(const row of SOCCER_GUIDE.filter(r=>r[1]===category)){const b=document.createElement('button');b.dataset.spacePointerAction='direct';b.type='button';b.textContent=row[2];b.dataset.clip=row[0];b.onclick=()=>show(row);actions.append(b);}show(SOCCER_GUIDE.find(r=>r[1]===category));}
 for(const [i,category]of [...new Set(SOCCER_GUIDE.map(r=>r[1]))].entries()){const b=document.createElement('button');b.dataset.spacePointerAction='direct';b.id='soccerGuideTab'+i;b.type='button';b.role='tab';b.textContent=category;b.onclick=()=>tab(category);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...nav.children],n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[n].click();tabs[n].focus();}};nav.append(b);}
 const close=()=>{stopVideo();dialog.close();onOpen(false);if(!button.hidden)button.focus();};
 dialog.querySelector('header button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 photoButton.onclick=()=>showPhotos();retryButton.onclick=playVideo;
 button.onclick=()=>{if(dialog.open)return;dialog.showModal();onOpen(true);if(!group)tab('基本');else show(current);};
 let pointerAt=-Infinity;
 const immediate=e=>{const b=e.target.closest('button');if(!b||e.button!==0)return;e.preventDefault();e.stopPropagation();pointerAt=window.performance.now();b.click();};
 // The retry swaps two buttons under the finger. Suppress its synthetic click
 // across the whole guide so it cannot activate the newly visible photo button.
 const dedupe=e=>{if(e.isTrusted&&e.detail>0&&e.target.closest('button')&&window.performance.now()-pointerAt<700){e.preventDefault();e.stopImmediatePropagation();}};
 for(const root of [button,dialog]){root.addEventListener('pointerdown',immediate,{passive:false});root.addEventListener('click',dedupe,true);}
 return {get open(){return dialog.open;},update(visible){button.hidden=!visible;if(!visible&&dialog.open)close();}};
}
