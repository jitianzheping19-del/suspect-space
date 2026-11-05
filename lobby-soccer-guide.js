export const SOCCER_GUIDE=[
 ['move','基本','移動とドリブル','左スティックを動かす','少し倒すと細かいタッチ。大きく倒すと走ります。ボールに近づくと足元でキープします。','左スティックを進みたい方向へ'],
 ['dash','基本','ダッシュ','フェイントボタンを長押し','押している間だけ加速します。指を離すと通常の速さに戻ります。','フェイントを長押し → 離す'],
 ['pass','パス・シュート','パス','右のキックボタンから味方へフリック','狙い線が味方につながり「パス」と出たら指を離します。前に出したい味方を狙ってください。','味方の方向へなぞる → 離す'],
 ['through','パス・シュート','スルーパス','味方へフリックして0.35秒止める','2本の線のうち前方へ伸びる線が光ったら指を離します。保持前なら通常パス。方向を変えると保持時間がやり直しになります。','味方へフリック → 0.35秒止める → 離す'],
 ['shot','パス・シュート','シュート','ゴールへ狙って指を離す','長く押すほど強く蹴ります。2回タップでもシュートを選べます。','押す → ゴールへ狙う → 離す'],
 ['curve','パス・シュート','カーブシュート','狙ってから指を横へ曲げる','曲がる予測線を確認し、指を離します。まっすぐな操作なら直線のシュートになります。','ゴールへなぞる → 横に曲げる → 離す'],
 ['lob','パス・シュート','フライパス','味方へなぞり、ボタンへ戻す','「フライパス」と出たら離します。ボールを浮かせて相手の上を越します。','味方へなぞる → ボタンへ戻す → 離す'],
 ['scissors','フェイント','シザース','ボールを持って左スティックで円を描く','スティックを大きく倒したまま一周させると、左右の足でボールをまたぎます。半円や短い往復では出ません。','左スティックで一周 → シザース'],
 ['backward','基本','足裏で後退','ボールを持って後ろへスティックを倒す','ボールに向いたまま、足の裏で少しずつ引いて下がります。前へ倒すと通常のボールタッチに戻ります。','後ろへ倒す → 足裏で引く'],
 ['shotFeint','フェイント','キックフェイント','キックを構えたままフェイントを押す','シュートを取り消して切り返します。キック側の指を離しても、取り消した球は蹴りません。','キックを押しながら別の指でフェイント'],
 ['doubleTouch','フェイント','ダブルタッチ','フェイントをタップ','左右の足でボールを素早く動かします。左スティックでかわす側を選べます。','フェイントを短くタップ'],
 ['roulette','フェイント','ルーレット','左スティックを横へ倒してフェイント','ボールを身体で守りながら回転して進みます。相手が近づくタイミングに合わせます。','左スティックを横へ ＋ フェイント'],
 ['heelLift','フェイント','ヒールリフト','左スティックを下へ倒してフェイント','かかとでボールを浮かせます。そのままキックを押すと空中シュートにつなげられます。','左スティックを下へ ＋ フェイント'],
 ['press','守備','プレス','プレスを長押し','相手に近づいてボールを奪います。左スティックで接近方向を調整でき、離すと止まります。','プレスを押して接近 → 離すと解除'],
 ['matchup','守備','マッチアップ','マッチアップを長押し','相手との間合いを保ちます。ボールを奪いに行くときはプレスへ切り替えます。','マッチアップを長押しで間合いを保つ'],
 ['slide','守備','スライディング','滑る方向へスライドボタンをフリック','伸ばした足でボールを狙います。相手に接触すると相手も転倒します。起き上がるまで次の操作を待ちます。','スライドボタンから狙う方向へ → 離す'],
 ['traps','空中のボール','自動トラップ','ボールの落下位置へ移動する','触れる高さと速さに合わせて、頭・胸・膝・足・足裏を自動で使います。シュートしたいときは、捕まえる前にキックを押します。','落下位置へ移動。ボタン操作は不要'],
 ['header','空中のボール','ダイビングヘッド','前方の高い球にキックを押す','前に飛び込み、頭でゴールへ打ちます。ボールに届く距離で「ヘディング」表示を確認します。','前方の高い球 → キック'],
 ['heelOverhead','空中のボール','ヒールリフト → オーバーヘッド','ヒールリフトの直後にキックを押す','かかとで浮かせてから、踏み切って反転し、足をボールに当てます。着地・起き上がりが終わるまで待ちます。','ヒールリフト → キック → 着地・起き上がり'],
 ['overhead','空中のボール','オーバーヘッド','背後の高い球にキックを押す','背後へ身体を倒し、両脚を交差させて蹴ります。ヒールリフトからもつなげられます。','背後の高い球 → キック'],
 ['volley','空中のボール','ジャンピングボレー','足先の高さの浮き球にキックを押す','踏み切って足を伸ばし、浮いたボールを直接シュートします。着地してから通常操作に戻ります。','前方・足先の浮き球 → キック']
];
export function createSoccerGuide({document,window,onOpen=()=>{}}){
 const button=document.createElement('button');button.id='soccerTutorialBtn';button.type='button';button.textContent='？ チュートリアル';button.hidden=true;button.dataset.spacePointerAction='direct';
 const dialog=document.createElement('dialog');dialog.id='soccerTutorial';dialog.setAttribute('aria-labelledby','soccerTutorialTitle');
 dialog.innerHTML='<header><h2 id="soccerTutorialTitle">フットサルの遊び方</h2><button type="button" aria-label="チュートリアルを閉じる">閉じる</button></header><nav role="tablist" aria-label="操作の種類"></nav><div class="soccerGuideActions" aria-label="確認する動作"></div><section role="tabpanel"><h3></h3><strong></strong><p></p><video controls playsinline muted loop preload="metadata"></video><p class="soccerGuideGesture"></p><p class="soccerGuideVideoError" hidden>動画を読み込めませんでした。接続を確認して、動作を選び直してください。</p></section>';
 document.body.append(button,dialog);const nav=dialog.querySelector('nav'),actions=dialog.querySelector('.soccerGuideActions'),video=dialog.querySelector('video'),panel=dialog.querySelector('[role="tabpanel"]');let group='';
 function show(row){const [id,,title,lead,description,gesture]=row;panel.querySelector('h3').textContent=title;panel.querySelector('strong').textContent=lead;panel.querySelector('p').textContent=description;panel.querySelector('.soccerGuideGesture').textContent=gesture;video.pause();video.src=new URL('tutorial/soccer/'+id+'.mp4',document.baseURI).href;video.setAttribute('aria-label',title+'の操作例');panel.querySelector('.soccerGuideVideoError').hidden=true;for(const b of actions.children)b.setAttribute('aria-pressed',String(b.dataset.clip===id));}
 function tab(category){group=category;for(const b of nav.children){const selected=b.textContent===category;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected)panel.setAttribute('aria-labelledby',b.id);}actions.replaceChildren();for(const row of SOCCER_GUIDE.filter(r=>r[1]===category)){const b=document.createElement('button');b.type='button';b.textContent=row[2];b.dataset.clip=row[0];b.onclick=()=>show(row);actions.append(b);}show(SOCCER_GUIDE.find(r=>r[1]===category));}
 for(const [i,category]of [...new Set(SOCCER_GUIDE.map(r=>r[1]))].entries()){const b=document.createElement('button');b.id='soccerGuideTab'+i;b.type='button';b.role='tab';b.textContent=category;b.onclick=()=>tab(category);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...nav.children],n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[n].click();tabs[n].focus();}};nav.append(b);}
 const close=()=>{video.pause();dialog.close();onOpen(false);button.focus();};dialog.querySelector('header button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});video.addEventListener('error',()=>panel.querySelector('.soccerGuideVideoError').hidden=false);
 button.onclick=()=>{if(!group)tab('基本');dialog.showModal();onOpen(true);};
 return {get open(){return dialog.open;},update(visible){button.hidden=!visible;if(!visible&&dialog.open)close();}};
}
