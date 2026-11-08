import {updateGachaTicketBadge} from './gacha-ticket-badge.js';
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
 const label=()=>updateGachaTicketBadge(badge,wallet,failed);label();
 const shell=deferredFeature(()=>import('./gacha-ui.js'),m=>m.createGachaUI(THREE,{...api,badge,onWallet(value){wallet=value;label();api.onWallet?.(value);}}),()=>{failed=true;});
 const open=async(...args)=>{shell.sync(api.canOpen());if(!api.canOpen())return;failed=false;loadStatus(badge,true);badge.textContent='読み込み中…';try{await shell.open(...args);}finally{loadStatus(badge,false);label();}};
 badge.onclick=()=>open();
 return{open,close(){shell.close();},sync(visible){shell.sync(visible);badge.hidden=!visible;},setWallet(value){wallet=value;shell.setWallet(value);label();if(!shell.loaded)api.onWallet?.(value);},reset(){wallet=null;failed=false;shell.reset();label();},dispose(){shell.dispose();badge.remove();},get loaded(){return shell.loaded;}};
}
export function createLazyPractice(api){
 const shell=deferredFeature(()=>import('./practice-lab.js'),m=>m.installPracticeLab(api),()=>api.error?.());
 const open=async()=>{shell.sync(api.available());if(!api.available())return;api.pause?.();await shell.open();};
 const sync=()=>shell.sync(api.available());
 const leave=()=>{shell.close();sync();};window.addEventListener('spacesuspect:room-leave',leave);
 return{open,sync,close(){shell.close();},dispose(){window.removeEventListener('spacesuspect:room-leave',leave);shell.dispose();},get loaded(){return shell.loaded;}};
}
let selectedModule,selectedLoad;
export function createLazySelectedEffect(args){
 if(selectedModule)return selectedModule.createSelectedRoleEffect(args);
 let effect=null,disposed=false,failed=false;
 selectedLoad||=import('./selected-role-fx.js').then(m=>selectedModule=m).catch(e=>{selectedLoad=null;throw e;});
 selectedLoad.then(m=>{if(!disposed)effect=m.createSelectedRoleEffect(args);}).catch(()=>{failed=true;});
 return{update(stamp){return !disposed&&!failed&&(effect?effect.update(stamp):!selectedModule);},dispose(){disposed=true;effect?.dispose();}};
}
