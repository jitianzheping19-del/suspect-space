import {createMotionPreference} from './motion-preference.js';
export const motionPreference=createMotionPreference();
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};

export function setActionAvailability(button,{remaining=0,reason='',pending=false}={}){
 if(!button)return;
 const state=pending?'pending':!button.disabled?'ready':remaining>0?'cooldown':'unavailable';
 const labels={ready:'使用可能',pending:'処理中',cooldown:`あと${Math.ceil(remaining)}秒`,unavailable:'使用不可'};
 const detail=reason||({ready:'押すと使用します。',pending:'処理が終わるまでお待ちください。',cooldown:`あと${Math.ceil(remaining)}秒待つと再使用できます。`,unavailable:'対象や役職の使用条件を確認してください。'})[state];
 if(button.dataset.availability!==state)button.dataset.availability=state;
 if(button.dataset.disabledReason!==detail)button.dataset.disabledReason=detail;
 if(button.dataset.availabilityLabel!==labels[state])button.dataset.availabilityLabel=labels[state];
 if(button.getAttribute('aria-description')!==detail)button.setAttribute('aria-description',detail);
}

export function installComfortSettings(){
 const operation=document.querySelector('[data-settings-section="operation"]');
 if(!operation||document.getElementById('comfortSettings'))return;
 const section=document.createElement('section');section.id='comfortSettings';section.className='comfortSection';
 section.innerHTML='<h3>見やすさ・案内</h3><label for="comfortTextSize">説明・チャットの文字サイズ</label><select id="comfortTextSize"><option value="normal">標準</option><option value="large">大きく</option><option value="larger">さらに大きく</option></select><label for="comfortMotion">画面の動き</label><select id="comfortMotion"><option value="system">端末の設定に合わせる</option><option value="reduce">揺れ・点滅・動きを減らす</option></select><p>対戦の速度や残り時間は変わりません。</p><button type="button" id="comfortGuideRestart">遊び方の案内をもう一度見る</button>';
 operation.append(section);
 const text=section.querySelector('#comfortTextSize'),motion=section.querySelector('#comfortMotion');
 const setText=value=>{const chosen=['normal','large','larger'].includes(value)?value:'normal';text.value=chosen;document.documentElement.dataset.textSize=chosen;document.documentElement.style.setProperty('--ui-text-scale',String({normal:1,large:1.15,larger:1.3}[chosen]));save('space-suspect-text-size-v1',chosen);};
 setText(read('space-suspect-text-size-v1','normal'));motion.value=motionPreference.mode;
 text.addEventListener('change',()=>setText(text.value));motion.addEventListener('change',()=>motionPreference.set(motion.value));
 motionPreference.addEventListener('change',()=>motion.value=motionPreference.mode);
 const guide=document.createElement('aside');guide.id='playGuide';guide.hidden=true;guide.setAttribute('aria-label','遊び方の案内');
 guide.innerHTML='<p id="playGuideText" role="status" aria-live="polite"></p><button type="button" aria-label="案内を閉じる">×</button>';
 document.body.append(guide);
 const guideKey='space-suspect-learning-v1';let dismissed=read(guideKey,'')==='done',lastState=null,moved=false,origin=null,taskLearned=false;
 const dismiss=()=>{dismissed=true;guide.hidden=true;save(guideKey,'done');};guide.querySelector('button').onclick=dismiss;
 section.querySelector('#comfortGuideRestart').onclick=()=>{dismissed=false;moved=false;origin=null;taskLearned=false;save(guideKey,'');window.__closeSpaceInputSettings?.();sync(lastState);};
 function sync(state){
  lastState=state;if(!state)return;
  const active=['lobby','play','meeting'].includes(state.phase),current=state.current;
  if(state.position&&state.phase==='lobby'){origin||={...state.position};if(Math.hypot(state.position.x-origin.x,state.position.z-origin.z)>1.5)moved=true;}
  if(Object.values(current?.tasks||{}).some(Boolean))taskLearned=true;
  if(state.phase==='meeting'&&state.voted){dismiss();return;}
  const blocked=[...document.querySelectorAll('[aria-modal="true"]')].some(node=>!['meeting'].includes(node.id)&&!node.hidden&&!node.classList.contains('hidden')&&node.getAttribute('aria-hidden')!=='true'&&getComputedStyle(node).display!=='none');
  let message='';
  if(!dismissed&&active&&!blocked&&!current?.observer){
   if(state.phase==='lobby'&&!moved)message=matchMedia('(pointer:coarse)').matches?'左のスティックで移動してみよう。配置は「設定」で変えられます。':'WASDまたは矢印キーで移動してみよう。キーは「設定」で変えられます。';
   else if(state.phase==='lobby')message='試合が始まると役職が決まります。「準備OK」で参加の準備を伝えよう。';
   else if(state.phase==='play'&&!taskLearned)message=current?.role==='crew'?'マップで担当タスクを確認 → 近づいて「使用」。終了後は×で戻れます。':'上の役職名から目標を確認。能力ボタンの残り時間と対象を見て使おう。';
   else if(state.phase==='meeting')message='話し合いの後、相手を選んで投票。判断できないときは「スキップ」。';
  }
  guide.hidden=!message;if(guide.querySelector('p').textContent!==message)guide.querySelector('p').textContent=message;
 }
 const previous=window.__ssxExperienceSync;window.__ssxExperienceSync=state=>{previous?.(state);sync(state);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)guide.hidden=true;else sync(lastState);});
 window.addEventListener('spacesuspect:room-leave',()=>{guide.hidden=true;lastState=null;origin=null;});
 return {sync,dismiss};
}
