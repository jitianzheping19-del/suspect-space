import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,setPersistence,indexedDBLocalPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getDatabase,ref,get,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export const FIREBASE_PROJECTS=Object.freeze({
 firebase1:Object.freeze({apiKey:'AIzaSyDMqagmX6rHUTEAofMNfMa4lUnKRdrKJOE',authDomain:'among-us-c7bae.firebaseapp.com',databaseURL:'https://among-us-c7bae-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'among-us-c7bae',storageBucket:'among-us-c7bae.firebasestorage.app',messagingSenderId:'755088053949',appId:'1:755088053949:web:ffc828a9eae4904908c9d4',measurementId:'G-3CLCFNLZEK'}),
 firebase2:Object.freeze({apiKey:'AIzaSyCRKPAy_nhL7XZSXf_PxX1qfdhY7xUk74g',authDomain:'among-d587b.firebaseapp.com',databaseURL:'https://among-d587b-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'among-d587b',storageBucket:'among-d587b.firebasestorage.app',messagingSenderId:'783502577174',appId:'1:783502577174:web:f6e21b968ad97a12d6af37'})
});
const CONTROL_PATH='appSettings/firebaseConnection',STORAGE_KEY='space-suspect-firebase-connection-v1';
const defaults=()=>({active:'firebase2',databaseURL2:FIREBASE_PROJECTS.firebase2.databaseURL,revision:0});
function databaseURL(value,projectId){
 let url;try{url=new URL(String(value||'').trim());}catch{throw new Error('Realtime Database URLを正しく入力してください。');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||
    !new RegExp('^'+projectId+'(?:-[a-z0-9-]+)?(?:\\.[a-z0-9-]+)?\\.(?:firebasedatabase\\.app|firebaseio\\.com)$').test(url.hostname))
  throw new Error(projectId+' のRealtime Database URLを指定してください。');
 return url.origin;
}
function validateState(value){
 if(value==null)return defaults();
 if(!value||!['firebase1','firebase2'].includes(value.active)||!Number.isSafeInteger(value.revision)||value.revision<1)throw new Error('共有Firebase設定の形式が不正です。');
 return{active:value.active,databaseURL2:databaseURL(value.databaseURL2,'among-d587b'),revision:value.revision};
}
const connectionKey=s=>s.active+':'+(s.active==='firebase2'?s.databaseURL2:FIREBASE_PROJECTS.firebase1.databaseURL);
function explain(error){
 if(/network-request-failed|network.error|disconnected|unavailable/i.test(error?.code||''))return 'Firebaseに接続できません。ネットワークを確認して、もう一度お試しください。';
 if(/invalid-credential|wrong-password|user-not-found|invalid-email/i.test(error?.code||''))return '管理者の認証情報が正しくありません。入力内容を確認してください。';
 if(/too-many-requests/i.test(error?.code||''))return '認証の試行が多すぎます。しばらく待ってから、もう一度お試しください。';
 if(/permission.denied/i.test(error?.code||''))return 'Firebase 1のDatabaseルールで接続先設定へのアクセスが拒否されました。database.rules.jsonの反映と管理者アカウントを確認してください。';
 return error?.message||String(error);
}
function bounded(promise,message,ms=12000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));}

export function createFirebaseProjects({adminUids,beforeReload,onStatus=()=>{}}){
 let state=defaults(),initialized=null,preparing=null,control=null,ready=false,reloading=false,error='',formError='',panel=null,saving=false,formDirty=false;
 const apps=new Map(),auths=new Map();let detachControl=null,detachAuth=null,baseConnection='';
 const canManage=()=>!!auths.get('firebase1')?.currentUser&&adminUids.has(auths.get('firebase1').currentUser.uid);
 function remember(next){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('接続先をブラウザに保存できません。ブラウザの保存設定を確認してください。');}}
 try{const cached=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(cached)state=validateState(cached);}catch{state=defaults();}
 function signal(){render();window.dispatchEvent(new Event('spacesuspect:admin-state'));onStatus({state:{...state},ready,reloading,error});}
 async function initialize(){
  if(initialized)return initialized;
  initialized=(async()=>{
   for(const[id,config]of Object.entries(FIREBASE_PROJECTS)){
    const app=getApps().find(a=>a.name===id)||initializeApp(config,id);
    if(app.options.projectId!==config.projectId||app.options.apiKey!==config.apiKey)throw new Error(id+' は別のFirebase設定で初期化されています。');
    apps.set(id,app);const auth=getAuth(app);auths.set(id,auth);
    try{await setPersistence(auth,indexedDBLocalPersistence);}catch{await setPersistence(auth,browserLocalPersistence);}
    await auth.authStateReady();
   }
   control=getDatabase(apps.get('firebase1'),FIREBASE_PROJECTS.firebase1.databaseURL);
   detachAuth=onAuthStateChanged(auths.get('firebase1'),signal);
  })().catch(e=>{initialized=null;throw e;});
  return initialized;
 }
 async function reload(next){
  if(reloading)return;reloading=true;state=next;error='';signal();
  // Persist before stopping any connection so the very next load selects the
  // new project. It still fetches the authoritative setting before gameplay.
  try{remember(next);}catch(e){error=explain(e);signal();}
  detachControl?.();detachControl=null;
  try{await beforeReload();}finally{location.reload();}
 }
 async function prepare(){
  if(preparing)return preparing;
  preparing=(async()=>{
   try{
    await initialize();
    const snapshot=await bounded(get(ref(control,CONTROL_PATH)),'接続先設定を取得できません。ネットワークを確認してください。');
    state=validateState(snapshot.val());remember(state);baseConnection=connectionKey(state);ready=true;error='';
    if(!detachControl)detachControl=onValue(ref(control,CONTROL_PATH),snapshot=>{
     try{const next=validateState(snapshot.val());if(next.revision<state.revision)return;
      if(connectionKey(next)!==baseConnection){void reload(next);return;}state=next;remember(state);signal();
     }catch(e){error=explain(e);signal();}
    },e=>{detachControl?.();detachControl=null;error=explain(e);ready=false;signal();});
    signal();
    if(reloading)throw new Error('Firebaseの接続先を切り替えています。');
    const config={...FIREBASE_PROJECTS[state.active],databaseURL:state.active==='firebase2'?state.databaseURL2:FIREBASE_PROJECTS.firebase1.databaseURL};
    return{app:apps.get(state.active),auth:auths.get(state.active),db:getDatabase(apps.get(state.active),config.databaseURL),config};
   }catch(e){error=explain(e);ready=false;signal();preparing=null;throw new Error(error);}
  })().finally(()=>{preparing=null;render();});
  return preparing;
 }
 async function checkConnection(database){
  await new Promise((resolve,reject)=>{let detach=()=>{},done=false;
   const finish=e=>{if(done)return;done=true;clearTimeout(timer);detach();e?reject(e):resolve();};
   const timer=setTimeout(()=>finish(new Error('切り替え先に接続できません。Realtime Database URLとネットワークを確認してください。')),10000);
   detach=onValue(ref(database,'.info/connected'),snap=>{if(snap.val()===true)finish();},finish);if(done)detach();
  });
 }
 async function select(active,url2){
  if(!canManage())throw new Error('Firebase設定を変更できるのは管理者だけです。');
  if(!ready||reloading)throw new Error('接続先設定の読み込みが完了していません。');
  if(!['firebase1','firebase2'].includes(active))throw new Error('Firebase 1またはFirebase 2を選択してください。');
  const normalized=databaseURL(url2,'among-d587b'),current={...state};
  if(current.active===active&&current.databaseURL2===normalized)throw new Error('選択した接続先は現在使用中です。');
  const target=getDatabase(apps.get(active),active==='firebase2'?normalized:FIREBASE_PROJECTS.firebase1.databaseURL);
  await checkConnection(target);
  if(!canManage())throw new Error('管理者としてログインし直してください。');
  // Only this small configuration node is written. Game/profile/inventory
  // collections in either project are never copied, cleared or overwritten.
  const result=await bounded(runTransaction(ref(control,CONTROL_PATH),value=>{
   if(!canManage())return;
   const latest=validateState(value);if(latest.revision!==current.revision)return;
   return{active,databaseURL2:normalized,revision:latest.revision+1,updatedBy:auths.get('firebase1').currentUser.uid,updatedAt:Date.now()};
  },{applyLocally:false}),'接続先の変更結果を確認できません。通信が復旧すると共有設定を再確認します。');
  if(!result.committed)throw new Error('別の管理者が設定を変更しました。最新の接続先を確認して、もう一度操作してください。');
  const next=validateState(result.snapshot.val());
  if(connectionKey(next)!==baseConnection)await reload(next);
  else{state=next;formDirty=false;remember(next);signal();}
 }
 function mount(){
  const host=window.__spaceAdminSettings?.();if(!host||panel)return;
  panel=document.createElement('section');panel.className='firebaseProjectSettings';panel.hidden=true;
  panel.innerHTML=`<style>.firebaseProjectSettings{margin-top:18px;padding:14px;border:1px solid #46677b;border-radius:12px;background:#0a1c28}.firebaseProjectSettings[hidden]{display:none!important}.firebaseProjectSettings label{display:grid;gap:6px;margin:12px 0}.firebaseProjectSettings select,.firebaseProjectSettings input{width:100%;box-sizing:border-box;min-height:42px;padding:9px;border:1px solid #557487;border-radius:8px;background:#102b3b;color:#e8f8ff;font:inherit}.firebaseProjectSettings output{display:block;overflow-wrap:anywhere;white-space:pre-line;line-height:1.6}.firebaseProjectSettings p{font-size:12px;line-height:1.6}.firebaseProjectSettings [role=alert]{color:#ffb7a9;white-space:pre-wrap}.firebaseProjectSettings button{width:100%;min-height:44px;margin-top:8px}</style><h3>Firebase接続設定</h3><output data-current aria-live="polite"></output><label>接続先<select data-project><option value="firebase1">Firebase 1（among-us-c7bae）</option><option value="firebase2">Firebase 2（among-d587b）</option></select></label><label>Firebase 2のRealtime Database URL<input data-url type="url" spellcheck="false" autocomplete="off"></label><p>切り替えると全員の画面を再読み込みします。アカウント・部屋・所持品は選択先の既存データを使います。設定の変更にはFirebase 1の管理者アカウントを使用します。</p><button type="button" data-apply>切り替えて全員を再読み込み</button><button type="button" data-retry hidden>接続先設定を再取得</button><p data-message role="alert"></p>`;
  host.append(panel);panel.querySelector('[data-project]').value=state.active;panel.querySelector('[data-url]').value=state.databaseURL2;
  for(const field of panel.querySelectorAll('input,select'))field.addEventListener('input',()=>{formDirty=true;formError='';render();});
  panel.querySelector('[data-retry]').onclick=async()=>{try{await prepare();}catch{}};
  panel.querySelector('[data-apply]').onclick=async()=>{if(!canManage()||saving)return;const button=panel.querySelector('[data-apply]'),message=panel.querySelector('[data-message]');saving=true;formError='';button.disabled=true;message.textContent='接続先を確認しています…';try{await select(panel.querySelector('[data-project]').value,panel.querySelector('[data-url]').value);if(!reloading)formError='接続設定を保存しました。';}catch(e){formError=explain(e);}finally{saving=false;render();}};
 }
 function render(){
  mount();if(!panel)return;panel.hidden=!canManage();
  const config=FIREBASE_PROJECTS[state.active],url=state.active==='firebase2'?state.databaseURL2:config.databaseURL;
  panel.querySelector('[data-current]').textContent=(reloading?'切り替え中：':ready?'現在使用中：':'接続先確認中：')+(state.active==='firebase1'?'Firebase 1':'Firebase 2')+' / '+config.projectId+'\n'+url;
  if(!formDirty){panel.querySelector('[data-project]').value=state.active;panel.querySelector('[data-url]').value=state.databaseURL2;}
  panel.querySelector('[data-apply]').disabled=!ready||reloading||saving||!canManage();
  panel.querySelector('[data-retry]').hidden=!error||ready;panel.querySelector('[data-retry]').disabled=!!preparing||reloading;
  if(!saving)panel.querySelector('[data-message]').textContent=formError||error;
 }
 window.addEventListener('spacesuspect:input-settings-open',render);
 window.addEventListener('spacesuspect:settings-tab',render);
 window.__spaceCanManageFirebase=canManage;
 async function authorizeManager(email,password){
  await initialize();if(canManage())return;
  if(!String(email||'').trim()||!String(password||''))throw new Error('管理者の認証情報を入力してください。');
  const auth=auths.get('firebase1');let result;
  try{result=await signInWithEmailAndPassword(auth,String(email).trim(),password);}catch(e){throw new Error(explain(e));}
  if(!adminUids.has(result.user.uid)){await signOut(auth);throw new Error('このアカウントにはFirebase設定の管理権限がありません。');}
  try{await prepare();}catch{ /* Show the settings error and retry action. */ }
 }
 return{prepare,canManage,authorizeManager,get selected(){return state.active;},get switching(){return reloading;},async signOut(){for(const auth of auths.values())if(auth.currentUser)await signOut(auth);},dispose(){detachControl?.();detachAuth?.();window.removeEventListener('spacesuspect:input-settings-open',render);window.removeEventListener('spacesuspect:settings-tab',render);panel?.remove();}};
}
