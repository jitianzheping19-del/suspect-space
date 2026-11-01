// Cache only public, versioned game assets. Account, room and voice requests
// continue to use their existing transports and authentication.
export async function registerGameAssetCache({navigator=globalThis.navigator,location=globalThis.location,document=globalThis.document,enabled=import.meta.env?.PROD===true}={}){
 if(!enabled||!navigator?.serviceWorker||!['https:','http:'].includes(location?.protocol)||globalThis.SPACE_SUSPECT_GAS)return null;
 try{
  const url=new URL('game-cache-worker.js',location.href);const registration=await navigator.serviceWorker.register(url.href,{scope:new URL('./',url).pathname,updateViaCache:'none'});
  const warm=()=>{const worker=navigator.serviceWorker.controller||registration.active;if(!worker)return;const urls=[...document.querySelectorAll('script[src],link[rel="stylesheet"][href],link[rel="modulepreload"][href]')].map(n=>n.src||n.href);worker.postMessage({type:'cache-assets',urls});};
  navigator.serviceWorker.ready.then(warm).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',warm);return registration;
 }catch(error){console.warn('ゲームデータは通常のブラウザーキャッシュを使用します',error);return null;}
}
void registerGameAssetCache();
