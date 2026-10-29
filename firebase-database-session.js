import * as sdk from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// Every application read, write and subscription goes through this session.
// The project-selection listener uses the SDK directly on the control database.
export const {getDatabase,ref,query,orderByChild,orderByKey,endBefore,startAfter,limitToFirst,limitToLast,equalTo,serverTimestamp}=sdk;
let activeDatabase=null,activeRoot=null,epoch=0,stopping=false;
const listeners=new Set(),disconnects=new Set(),registrations=new Set();
// Modular SDK references have no public `database` property. Compare their
// roots with the SDK instead; a missing property used to reject every request.
const belongsToActive=value=>{
 const reference=value?.ref||value;
 return !!activeRoot&&!!reference?.root&&sdk.refEqual(reference.root,activeRoot);
};
const allowed=(value,version=epoch)=>!stopping&&version===epoch&&belongsToActive(value);
function assertActive(value,version=epoch){
 if(!allowed(value,version))throw Object.assign(new Error('Firebaseの接続先を切り替えています。再読み込み後に操作してください。'),{code:'database/project-switching'});
}
export function activateDatabaseSession(database){
 if(stopping)throw new Error('接続先を切り替えています。再読み込みを待ってください。');
 if(activeDatabase&&activeDatabase!==database)throw new Error('接続先の変更には再読み込みが必要です。');
 activeDatabase=database;
 activeRoot=sdk.ref(database);
}
export function blockDatabaseSession(){stopping=true;epoch++;for(const unsubscribe of [...listeners])unsubscribe();}
export async function closeDatabaseSession(){
 blockDatabaseSession();
 // Cancel existing presence/cleanup hooks instead of leaving a room, which can
 // delete its data. A project switch never calls the room-deletion workflow.
 const database=activeDatabase;
 const cancel=async()=>{await Promise.allSettled([...registrations]);await Promise.allSettled([...disconnects].map(handle=>handle.cancel()));};
 let timeout;await Promise.race([cancel(),new Promise(resolve=>{timeout=setTimeout(resolve,2500);})]);clearTimeout(timeout);
 if(database)sdk.goOffline(database);
}
export async function get(reference){const version=epoch;assertActive(reference,version);const result=await sdk.get(reference);assertActive(reference,version);return result;}
const write=method=>(reference,...args)=>{try{assertActive(reference);return sdk[method](reference,...args);}catch(error){return Promise.reject(error);}};
export const set=write('set'),update=write('update'),remove=write('remove');
export function runTransaction(reference,updater,options){
 try{assertActive(reference);const version=epoch;return sdk.runTransaction(reference,value=>allowed(reference,version)?updater(value):undefined,options);}
 catch(error){return Promise.reject(error);}
}
function subscribe(method,reference,...args){
 assertActive(reference);const version=epoch;
 const guarded=args.map(arg=>typeof arg==='function'?(...values)=>{if(allowed(reference,version))arg(...values);}:arg);
 const detach=sdk[method](reference,...guarded);let closed=false;
 const unsubscribe=()=>{if(closed)return;closed=true;listeners.delete(unsubscribe);detach();};
 listeners.add(unsubscribe);return unsubscribe;
}
export const onValue=(...args)=>subscribe('onValue',...args),onChildAdded=(...args)=>subscribe('onChildAdded',...args),onChildChanged=(...args)=>subscribe('onChildChanged',...args),onChildRemoved=(...args)=>subscribe('onChildRemoved',...args);
export function onDisconnect(reference){
 assertActive(reference);const version=epoch,raw=sdk.onDisconnect(reference);
 const register=method=>(...args)=>{
  try{assertActive(reference,version);const promise=raw[method](...args);registrations.add(promise);promise.then(()=>registrations.delete(promise),()=>registrations.delete(promise));return promise;}
  catch(error){return Promise.reject(error);}
 };
 const handle={set:register('set'),setWithPriority:register('setWithPriority'),update:register('update'),remove:register('remove'),async cancel(){await raw.cancel();disconnects.delete(handle);}};
 disconnects.add(handle);return handle;
}
