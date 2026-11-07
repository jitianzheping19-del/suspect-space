import {canSoccerSecretPower,soccerSecretRelayTarget} from './lobby-soccer-powers.js';
import './lobby-soccer-secret-ui.css';

const POWERS=[
 ['feint','分身フェイント','分身','#8ce8d0','1回タップで残像を出してかわす','<path d="M10 9v14m-4-12v10M15 8h6l3 6-3 4v7m-6-11-3 5 4 2-1 5m5-8 6 3"/><circle cx="19" cy="5" r="2"/>'],
 ['taichi','太極拳','太極拳','#c4aeff','飛んでくるボールを受け流して反撃','<circle cx="16" cy="16" r="11"/><path d="M16 5c-10 0-10 11 0 11s10 11 0 11"/><circle cx="16" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="21.5" r="1.5"/>'],
 ['iron','鉄頭','鉄頭','#a6d8ff','浮き球へジャンプしてヘディング','<path d="M9 24v-5a7 7 0 0 1 14 0v5M7 26h18M16 2v4M4 7l4 3m20-3-4 3"/><circle cx="16" cy="9" r="3"/><path d="m13 18 3-3 3 3"/>'],
 ['belly','腹砲','腹砲','#ffb87e','ボールを腹でためて発射','<circle cx="13" cy="17" r="8"/><circle cx="13" cy="17" r="3"/><path d="m20 12 9-5-4 8 5 2-9 7M4 5l3 3m0 18-3 3"/>'],
 ['relay','空中リレー','空中リレー','#8edfff','味方へ空中パスをつなぐ。最後の天空シュートに炎が付く','<circle cx="5" cy="23" r="3"/><circle cx="27" cy="23" r="3"/><circle cx="16" cy="7" r="3"/><path d="M6 17c0-6 3-9 5-10m10 1c3 2 5 5 5 9m-4-3 4 4 3-4M11 24h10"/>']
,
 ['thunder','雷鳴シュート','雷鳴','#ffe18a','短くためて放つ高速シュート','<path d="m18 3-11 15h8l-2 11 12-17h-9z"/>'],
 ['meteor','流星シュート','流星','#ff997e','高く打ち上げ、ゴールへ落とすシュート','<circle cx="11" cy="22" r="7"/><path d="m12 11 9-8m-2 13 10-8M7 9l5-5m11 18 5-5"/>'],
 ['cyclone','旋風奪取','旋風','#9ae9da','近くの相手やこぼれ球を竜巻で奪う','<path d="M5 7c20-6 29 5 3 7m2 4c17-5 19 4 3 6m1 4 5-2M6 3h10"/>'],
 ['ice','氷晶壁','氷晶壁','#abdfff','正面に氷の壁。飛来球を一度弾いて砕ける','<path d="m4 26 1-13 4-5 4 7v11m0 0V8l4-6 4 6v18m0 0V15l4-6 3 6v11M2 28h28M17 2v24"/>'],
 ['dragon','双龍パス','双龍','#82f6cc','二頭の龍をまとった浮き球を味方へ送る','<path d="M5 27c-4-12 24-5 18-20l-4 2 1-6 7 4m0-4 2 7M27 28c7-14-23-7-18-20l4 2-1-6-7 3m0-4-2 7"/>'],
 ['drive','ドライブシュート','ドライブ','#a6e5ff','縦回転をかけ、途中から沈むシュート','<path d="M3 23C9 1 24 1 26 23m-5-4 5 6 4-7"/><circle cx="9" cy="13" r="4"/><path d="m6 11 6 4"/>']
];

function availability(c,kind,onFeint){
 const g=c.g,b=g.ball,own=g.secretPowers?.[c.uid],skill=g.skills?.[c.uid],record=kind==='feint'?skill:own;
 const available=kind==='feint'?typeof onFeint==='function'&&c.canFeint:canSoccerSecretPower(g,c.uid,kind,c.players,c.F,c.time);
 if(c.pending)return {state:'waiting',text:'受付中',progress:0};
 if(record&&c.time<record.cooldownUntil){
  const active=kind==='feint'?c.time<skill.at+680:own.kind===kind&&c.time<own.until;
  return {state:active?'active':'cooldown',text:active?'発動中':'回復中',progress:Math.max(0,Math.min(1,(c.time-record.at)/Math.max(1,record.cooldownUntil-record.at)))};
 }
 if(available)return {state:'ready',text:kind==='taichi'?'構える':'発動できる',progress:1};
 let text='体勢を整える';
 if(b.keeperOwner!==undefined)text='GKが保持';
 else if(c.time<Number(b.resetUntil||0))text='再開待ち';
 else if(c.time<Number(g.finishes?.[c.uid]?.until||0))text='着地待ち';
 else if(kind==='feint'&&b.handOwner===c.uid)text='足元に戻す';
 else if((['feint','belly','thunder','meteor','dragon','drive'].includes(kind))&&b.dribbler!==c.uid)text='ボールが必要';
 else if(kind==='cyclone')text='相手の球へ近づく';
 else if(kind==='ice'&&b.dribbler===c.uid)text='守備で使える';
 else if(kind==='iron')text='浮き球を待つ';
 else if(kind==='taichi'&&b.dribbler)text='飛来球を待つ';
 else if(['relay','dragon'].includes(kind))text=soccerSecretRelayTarget(g,c.uid,c.players,c.F)?'球を受ける':'味方が必要';
 return {state:'waiting',text,progress:0};
}

export function createSoccerSecretControls({document,context,send,onFeint}){
 const bar=document.createElement('section');bar.id='soccerSecretPowers';bar.hidden=true;bar.setAttribute('aria-label','少林サッカーの必殺技');
 const heading=document.createElement('header');heading.innerHTML='<span class="soccerSecretSeal" aria-hidden="true">気</span><strong>少林サッカー</strong><span class="soccerSecretCombo">この試合限定</span>';bar.append(heading);
 const row=document.createElement('div');row.className='soccerSecretButtons';row.setAttribute('role','group');row.setAttribute('aria-label','必殺技');bar.append(row);
 const tabs=document.createElement('nav');tabs.className='soccerSecretTabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','必殺技の種類');bar.insertBefore(tabs,row);
 const pageButtons=[];let page=0;
 function selectPage(next){page=next;for(const [i,b]of pageButtons.entries()){b.setAttribute('aria-selected',String(i===page));b.tabIndex=i===page?0:-1;}for(const [kind,item]of buttons)item.button.hidden=Math.floor(POWERS.findIndex(p=>p[0]===kind)/5)!==page;row.setAttribute('aria-labelledby','soccerSecretTab-'+page);for(const card of autoCards)card.hidden=page!==2;}
 for(const [i,label]of ['基本技','奥義','連携'].entries()){
  const b=document.createElement('button');b.type='button';b.id='soccerSecretTab-'+i;b.textContent=label;b.setAttribute('role','tab');b.setAttribute('aria-controls','soccerSecretPage');b.dataset.spacePointerAction='direct';
  let at=-Infinity;b.addEventListener('pointerdown',e=>{if(e.button!==0||bar.hidden)return;e.preventDefault();e.stopPropagation();at=performance.now();selectPage(i);},{passive:false});
  b.addEventListener('click',e=>{if(e.isTrusted&&e.detail>0&&performance.now()-at<1000)return;if(!bar.hidden)selectPage(i);});
  b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowLeft'?2:1))%3;selectPage(next);pageButtons[next].focus();}});
  tabs.append(b);pageButtons.push(b);
 }
 row.id='soccerSecretPage';row.setAttribute('role','tabpanel');
 const buttons=new Map();
 for(const [kind,label,short,color,title,art]of POWERS){
  const b=document.createElement('button');b.type='button';b.title=title;b.dataset.power=kind;b.dataset.spacePointerAction='direct';b.setAttribute('aria-label',label);b.setAttribute('aria-describedby','soccerSecretState-'+kind);b.style.setProperty('--power-color',color);
  b.innerHTML='<span class="soccerSecretIcon" aria-hidden="true"><svg class="soccerSecretRecharge" viewBox="0 0 40 40"><circle class="track" cx="20" cy="20" r="18"/><circle class="progress" cx="20" cy="20" r="18" pathLength="1"/></svg><svg class="soccerSecretGlyph" viewBox="0 0 32 32">'+art+'</svg></span><span class="soccerSecretName">'+short+'</span><small id="soccerSecretState-'+kind+'" class="soccerSecretState"></small>';
  let pointerAt=-Infinity;
  b.addEventListener('pointerdown',event=>{if(event.button!==0||b.disabled)return;event.preventDefault();event.stopPropagation();pointerAt=performance.now();b.click();},{passive:false});
  b.addEventListener('click',event=>{if(event.isTrusted&&event.detail>0&&performance.now()-pointerAt<1000){event.preventDefault();event.stopImmediatePropagation();}},true);
  b.addEventListener('click',()=>{if(!b.disabled){if(kind==='feint')onFeint();else send('soccer-secret-power',{power:kind});}});
  row.append(b);buttons.set(kind,{button:b,status:b.querySelector('small')});
 }
 const autoCards=[];
 for(const [kind,label,detail]of [['twin','ツインシュート','低い浮き球に2人で合わせる'],['twinOverhead','ツインオーバーヘッド','頭上・後方の球に2人で合わせる']]){
  const card=document.createElement('div');card.className='soccerSecretAuto';card.dataset.combo=kind;card.hidden=true;
  card.innerHTML='<span class="soccerSecretAutoBadge">AUTO · 2人</span><strong>'+label+'</strong><small>'+detail+'</small><span>味方と球に近づくと自動</span>';row.append(card);autoCards.push(card);
 }
 const hint=document.createElement('p');hint.className='soccerSecretHint';hint.textContent='最大ためで炎シュート · 右下のフェイント3回でハンド';bar.append(hint);
 const announcement=document.createElement('output');announcement.id='soccerSecretAnnouncement';announcement.hidden=true;announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');bar.append(announcement);document.body.append(bar);
 const combo=heading.querySelector('.soccerSecretCombo');let announced={},until=0,match='';
 function announce(key,text,color,time){if(announced[key]===text)return;announced[key]=text;announcement.textContent=text;announcement.style.setProperty('--power-color',color);announcement.hidden=false;until=time+1100;}
 return {update(){
  const c=context(),g=c.g;
  bar.hidden=!(c.visible&&g?.secretMode&&g.status==='playing'&&g.members?.[c.uid]!==undefined);
  if(bar.hidden){announcement.hidden=true;announced={};until=0;match='';return;}
  const identity=(g.id||g.startAt||'')+':'+c.uid;if(identity!==match){announced={};match=identity;until=0;selectPage(0);}
  for(const [kind,{button,status}]of buttons){const value=availability(c,kind,onFeint);button.disabled=value.state!=='ready';button.dataset.state=value.state;button.style.setProperty('--recharge',String(1-value.progress));if(status.textContent!==value.text)status.textContent=value.text;}
  const chain=g.secretChain,count=chain&&c.time-chain.at<8000?chain.count:0,comboText=g.secretCombo&&!g.secretCombo.cancelled&&c.time<g.secretCombo.until?'ツイン連携':count>1?'空中リレー ×'+count:'この試合限定';if(combo.textContent!==comboText)combo.textContent=comboText;combo.classList.toggle('chained',count>1);
  const pair=g.secretCombo;
  for(const card of autoCards)card.classList.toggle('active',!!pair&&!pair.cancelled&&pair.kind===card.dataset.combo&&pair.ids.includes(c.uid)&&c.time<pair.until);
  if(pair&&!pair.cancelled&&pair.ids.includes(c.uid)&&c.time>=pair.at&&c.time-pair.at<900)announce('combo:'+pair.at,pair.kind==='twinOverhead'?'ツインオーバーヘッド！':'ツインシュート！','#ffe3a4',c.time);
  const power=g.secretPowers?.[c.uid],skill=g.skills?.[c.uid],kick=g.kicks?.[c.uid],finish=g.finishes?.[c.uid];
  if(power&&!power.cancelled&&c.time>=power.at&&c.time-power.at<900){const spec=POWERS.find(p=>p[0]===power.kind);if(spec)announce('power:'+power.at,spec[1]+'！',spec[3],c.time);}
  if(skill&&!skill.cancelled&&c.time>=skill.at&&c.time-skill.at<680)announce('skill:'+skill.at,'分身フェイント！','#8ce8d0',c.time);
  if(g.ball.fire&&g.ball.lastTouch===c.uid){const at=Math.max(kick?.at||0,power?.at||0,finish?.at||0);if(c.time-at<1800&&!g.ball.secretShot)announce('fire:'+at,'炎シュート！','#ffb87e',c.time);}
  announcement.hidden=c.time>=until;
  // Keep only recent events; repeated network snapshots must not replay the cue.
  for(const key of Object.keys(announced))if(c.time-Number(key.split(':')[1])>3000)delete announced[key];
 }};
}
