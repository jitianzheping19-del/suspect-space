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
 section.innerHTML='<h3>見やすさ</h3><label for="comfortTextSize">説明・チャットの文字サイズ</label><select id="comfortTextSize"><option value="normal">標準</option><option value="large">大きく</option><option value="larger">さらに大きく</option></select><label for="comfortMotion">画面の動き</label><select id="comfortMotion"><option value="system">端末の設定に合わせる</option><option value="reduce">揺れ・点滅・動きを減らす</option></select>';
 operation.append(section);
 const text=section.querySelector('#comfortTextSize'),motion=section.querySelector('#comfortMotion');
 const setText=value=>{const chosen=['normal','large','larger'].includes(value)?value:'normal';text.value=chosen;document.documentElement.dataset.textSize=chosen;document.documentElement.style.setProperty('--ui-text-scale',String({normal:1,large:1.15,larger:1.3}[chosen]));save('space-suspect-text-size-v1',chosen);};
 setText(read('space-suspect-text-size-v1','normal'));motion.value=motionPreference.mode;
 text.addEventListener('change',()=>setText(text.value));motion.addEventListener('change',()=>motionPreference.set(motion.value));
 motionPreference.addEventListener('change',()=>motion.value=motionPreference.mode);
}
