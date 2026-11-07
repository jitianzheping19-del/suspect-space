// A per-iframe store. Practice references can never reach Firebase or another tab.
const databases=new WeakSet(),references=new WeakSet();
const copy=v=>v===undefined?null:structuredClone(v);
const parts=p=>String(p||'').split('/').filter(Boolean);
const read=(data,path)=>parts(path).reduce((v,k)=>v?.[k],data)??null;
function resolved(v){if(v&&typeof v==='object'){if(v['.sv']==='timestamp')return Date.now();return Array.isArray(v)?v.map(resolved):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,resolved(x)]));}return v;}
const snap=(value,key)=>({key,val:()=>copy(value),exists:()=>value!=null,child:p=>snap(read(value,p),parts(p).at(-1)),forEach:fn=>{for(const [k,v]of Object.entries(value||{}))if(fn(snap(v,k))===true)return true;return false;}});
export function createPracticeDatabase(){const db={data:{},listeners:new Set()};databases.add(db);return db;}
export const isPracticeDatabase=db=>databases.has(db);
export const isPracticeReference=r=>references.has(r);
export function practiceRef(db,path=''){if(!databases.has(db))throw Error('Unknown practice store');const r={practiceDB:db,path:parts(path).join('/'),key:parts(path).at(-1)||null};references.add(r);return r;}
export function practiceOperation(method,r,...args){
 const db=r.practiceDB;if(!references.has(r)||!databases.has(db))throw Error('Unknown practice reference');
 const notify=()=>{for(const listener of [...db.listeners]){const next=copy(read(db.data,listener.r.path));if(JSON.stringify(next)===JSON.stringify(listener.value))continue;const before=listener.value;listener.value=next;queueMicrotask(()=>{if(!db.listeners.has(listener))return;if(listener.method==='onValue')listener.fn(snap(next,listener.r.key));else{const keys=new Set([...Object.keys(before||{}),...Object.keys(next||{})]);for(const k of keys){const a=before?.[k],b=next?.[k],changed=JSON.stringify(a)!==JSON.stringify(b);if(listener.method==='onChildAdded'&&a==null&&b!=null||listener.method==='onChildChanged'&&a!=null&&b!=null&&changed||listener.method==='onChildRemoved'&&a!=null&&b==null)listener.fn(snap(b??a,k));}}});}};
 const write=(path,value)=>{const keys=parts(path);if(!keys.length){db.data=resolved(copy(value))||{};return;}let parent=db.data;for(const k of keys.slice(0,-1))parent=parent[k]??={};const last=keys.at(-1);if(value==null)delete parent[last];else parent[last]=resolved(copy(value));};
 if(method==='get')return Promise.resolve(snap(read(db.data,r.path),r.key));
 if(method==='set'||method==='remove'){write(r.path,method==='remove'?null:args[0]);notify();return Promise.resolve();}
 if(method==='update'){for(const [key,v]of Object.entries(args[0]||{}))write(r.path+'/'+key,v);notify();return Promise.resolve();}
 if(method==='runTransaction'){const result=args[0](copy(read(db.data,r.path)));if(result!==undefined){write(r.path,result);notify();}return Promise.resolve({committed:result!==undefined,snapshot:snap(read(db.data,r.path),r.key)});}
 if(method==='onDisconnect')return{set:async()=>{},update:async()=>{},remove:async()=>{},cancel:async()=>{}};
 if(method.startsWith('on')){const listener={method,r,fn:args[0],value:copy(read(db.data,r.path))};db.listeners.add(listener);queueMicrotask(()=>{if(!db.listeners.has(listener))return;if(method==='onValue')listener.fn(snap(listener.value,r.key));if(method==='onChildAdded')for(const[k,v]of Object.entries(listener.value||{}))listener.fn(snap(v,k));});return()=>db.listeners.delete(listener);}
 throw Error('Unsupported practice operation '+method);
}
