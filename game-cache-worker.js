// This version is replaced with a digest of emitted asset names at build time.
const CACHE_PREFIX='space-suspect-assets-',CACHE_NAME=CACHE_PREFIX+'__ASSET_VERSION__';
function cacheable(value){
 const u=new URL(typeof value==='string'?value:value.url,self.location.href);
 if(u.origin===self.location.origin)return u.pathname.startsWith(new URL('./assets/',self.location.href).pathname)&&/\.(?:js|css|wasm|png|jpe?g|webp|svg|woff2?|webmanifest)$/.test(u.pathname);
 return ['cdn.jsdelivr.net','unpkg.com'].includes(u.hostname)&&/\/three@\d+\.\d+\.\d+\//.test(u.pathname)&&/\.(?:js|wasm)$/.test(u.pathname);
}
async function cached(request){const names=(await caches.keys()).filter(n=>n.startsWith(CACHE_PREFIX));for(const name of names.reverse()){const result=await(await caches.open(name)).match(request);if(result)return result;}}
const pending=new Map();
async function fetchAsset(request){const hit=await cached(request);if(hit)return hit;const key=request.url||String(request);if(pending.has(key))return(await pending.get(key)).clone();const job=(async()=>{const response=await fetch(request);if(response.ok&&response.type!=='opaque'){try{await(await caches.open(CACHE_NAME)).put(request,response.clone());}catch{ /* Storage limits must not prevent gameplay. */ }}return response;})();pending.set(key,job);try{return(await job).clone();}finally{pending.delete(key);}}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=(await caches.keys()).filter(n=>n.startsWith(CACHE_PREFIX));const keep=new Set([CACHE_NAME,...names.filter(n=>n!==CACHE_NAME).slice(-1)]);await Promise.all(names.filter(n=>!keep.has(n)).map(n=>caches.delete(n)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&cacheable(event.request))event.respondWith(fetchAsset(event.request));});
self.addEventListener('message',event=>{if(event.data?.type!=='cache-assets'||!Array.isArray(event.data.urls))return;event.waitUntil(Promise.allSettled(event.data.urls.slice(0,64).filter(u=>typeof u==='string'&&cacheable(u)).map(async url=>{const request=new Request(new URL(url,self.location.href),{cache:'force-cache',mode:'cors',credentials:'same-origin'});return fetchAsset(request);})));});
