// Availability does not load the feature. Only an explicit open starts import().
export function deferredFeature(load,create,onError=()=>{}){
 let instance=null,pending=null,enabled=false,revision=0,wallet=null,disposed=false;
 function ensure(){
  if(instance)return Promise.resolve(instance);
  if(!pending)pending=Promise.resolve().then(load).then(module=>{
   if(disposed)return null;
   instance=create(module);instance.setWallet?.(wallet);instance.sync?.(enabled);return instance;
  }).finally(()=>pending=null);
  return pending;
 }
 return{async open(...args){
   if(!enabled||disposed)return;
   const stamp=++revision;
   try{const feature=await ensure();if(feature&&stamp===revision&&enabled&&!disposed)return await feature.open(...args);}
   catch(error){if(stamp===revision&&enabled&&!disposed)onError(error);}
  },
  sync(value=true){if(enabled&&!value)revision++;enabled=!!value&&!disposed;instance?.sync?.(enabled);},
  setWallet(value){wallet=value;instance?.setWallet?.(value);},
  reset(){revision++;wallet=null;instance?.reset?.();instance?.close?.();},
  close(){revision++;instance?.close?.();},
  dispose(){revision++;disposed=true;enabled=false;instance?.dispose?.();instance=null;wallet=null;},
  get loaded(){return !!instance;}
 };
}
function makeLauncher(label,id,className){const button=document.createElement('button');button.type='button';button.textContent=label;if(id)button.id=id;if(className)button.className=className;button.hidden=true;document.body.append(button);return button;}
function loadStatus(button,loading){button.setAttribute('aria-busy',String(loading));button.dataset.loading=String(loading);}
export function createLazyGacha(THREE,api){
 const badge=makeLauncher('🎟 —','','ssTicketBadge');let wallet=null,failed=false;
 const label=()=>{badge.textContent=failed?'ガチャを再試行':`🎟 ${wallet?.tickets??'—'}${wallet?'枚':''}`;badge.title=failed?'読み込めませんでした。押すと再試行します。':`通常チケット ${wallet?.tickets??'確認中'}枚 / 特別 ${wallet?.premium??'確認中'}枚`;};
 const shell=deferredFeature(()=>import('./gacha-ui.js'),m=>m.createGachaUI(THREE,{...api,badge,onWallet(value){wallet=value;label();api.onWallet?.(value);}}),()=>{failed=true;});
 const open=async(...args)=>{shell.sync(api.canOpen());if(!api.canOpen())return;failed=false;loadStatus(badge,true);badge.textContent='読み込み中…';try{await shell.open(...args);}finally{loadStatus(badge,false);label();}};
 badge.onclick=()=>open();
 return{open,close(){shell.close();},sync(visible){shell.sync(visible);badge.hidden=!visible;},setWallet(value){wallet=value;shell.setWallet(value);label();if(!shell.loaded)api.onWallet?.(value);},reset(){wallet=null;failed=false;shell.reset();label();},dispose(){shell.dispose();badge.remove();},get loaded(){return shell.loaded;}};
}
export function createLazyPractice(api){
 const button=makeLauncher('タスク・役職練習','poolPracticeBtn'),shortcut=document.createElement('button');shortcut.type='button';shortcut.textContent='プール横の練習設備';shortcut.disabled=true;document.querySelector('[data-settings-section="operation"]')?.append(shortcut);
 let failed=false;
 const shell=deferredFeature(()=>import('./practice-lab.js'),m=>m.installPracticeLab({...api,button,shortcut}),()=>{failed=true;});
 const open=async()=>{shell.sync(api.available());if(!api.available())return;failed=false;loadStatus(button,true);loadStatus(shortcut,true);button.textContent='読み込み中…';shortcut.textContent='読み込み中…';try{await shell.open();}finally{loadStatus(button,false);loadStatus(shortcut,false);button.textContent=failed?'練習を再試行':'タスク・役職練習';shortcut.textContent=failed?'練習を再試行':'プール横の練習設備';}};
 button.onclick=shortcut.onclick=open;
 const sync=()=>{const allowed=api.available();shell.sync(allowed);button.hidden=!allowed||!api.near();shortcut.disabled=!allowed;};
 const leave=()=>{shell.close();sync();};window.addEventListener('spacesuspect:room-leave',leave);
 return{open,sync,close(){shell.close();},dispose(){window.removeEventListener('spacesuspect:room-leave',leave);shell.dispose();button.remove();shortcut.remove();},get loaded(){return shell.loaded;}};
}
let selectedModule,selectedLoad;
export function createLazySelectedEffect(args){
 if(selectedModule)return selectedModule.createSelectedRoleEffect(args);
 let effect=null,disposed=false,failed=false;
 selectedLoad||=import('./selected-role-fx.js').then(m=>selectedModule=m).catch(e=>{selectedLoad=null;throw e;});
 selectedLoad.then(m=>{if(!disposed)effect=m.createSelectedRoleEffect(args);}).catch(()=>{failed=true;});
 return{update(stamp){return !disposed&&!failed&&(effect?effect.update(stamp):!selectedModule);},dispose(){disposed=true;effect?.dispose();}};
}
