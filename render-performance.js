// Self-contained so srcdoc scenes can receive this factory without bundler
// aliases or dependencies on the parent window's JavaScript realm.
export function createRenderBudget() {
  const nav = globalThis.navigator || {};
  const mobile = nav.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod/i.test(nav.userAgent || '') ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1) ||
    (globalThis.matchMedia?.('(pointer: coarse)').matches === true &&
      globalThis.matchMedia?.('(any-pointer: fine)').matches !== true);
  const fps = mobile ? 30 : 60;
  // One bridge per document, including serialized srcdoc scenes. Keep explicit
  // simulation gates at their existing rate when presentation quality changes.
  let quality=globalThis.__spaceRenderQuality;
  if(!quality){
    const valid=value=>['auto','ultralow','low','balanced','high'].includes(value);
    let preset='auto';
    try{const saved=globalThis.localStorage?.getItem('space-suspect-render-preset-v1');if(valid(saved))preset=saved;}catch{}
    try{const inherited=globalThis.parent?.__spaceRenderQuality?.preset;if(valid(inherited))preset=inherited;}catch{}
    const frames=()=>globalThis.document?.querySelectorAll('iframe')||[];
    const send=frame=>frame?.postMessage({type:'ss-render-quality',preset:quality.preset},'*');
    quality={preset,setPreset(value){if(!valid(value))return;quality.preset=value;for(const frame of frames())send(frame.contentWindow);}};
    globalThis.__spaceRenderQuality=quality;
    globalThis.addEventListener?.('message',event=>{
      if(event.source===globalThis.parent&&event.data?.type==='ss-render-quality')quality.setPreset(event.data.preset);
      else if(event.data?.type==='ss-render-quality-request'&&[...frames()].some(frame=>frame.contentWindow===event.source))send(event.source);
    });
    globalThis.document?.addEventListener('load',event=>{if(event.target?.tagName==='IFRAME')send(event.target.contentWindow);},true);
    if(globalThis.parent&&globalThis.parent!==globalThis)globalThis.parent.postMessage({type:'ss-render-quality-request'},'*');
  }
  const ultra=()=>quality.preset==='ultralow';
  const pixelRatio=requested=>Math.min(globalThis.devicePixelRatio||1,requested,mobile?1:requested,ultra() ? .65 : Infinity);
  const rendererRatios=new WeakMap();
  function syncRenderer(renderer,requested){
    if(requested!==undefined)rendererRatios.set(renderer,requested);
    if(!rendererRatios.has(renderer))return;
    const ratio=pixelRatio(rendererRatios.get(renderer));
    if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
  }
  let idle=false;
  function gate(rate = fps) {
    const presentation=arguments.length===0;
    let next = -Infinity;
    return {
      due(stamp) {
        const interval=1000/(presentation?Math.min(rate,ultra()?20:rate,idle?15:rate):rate);
        if (stamp + .25 < next) return false;
        // Retain phase on 60/90/120 Hz displays; don't accumulate frame drift.
        next = Number.isFinite(next) && stamp - next < interval * 3
          ? next + interval * Math.max(1, Math.floor((stamp + .25 - next) / interval) + 1)
          : stamp + interval;
        return true;
      },
      reset() { next = -Infinity; }
    };
  }
  let shadowAt = -Infinity;
  function shadows(renderer, stamp) {
    syncRenderer(renderer);
    if(ultra()&&renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;renderer.shadowMap.needsUpdate=true;}
    if (!mobile) return;
    renderer.shadowMap.autoUpdate = false;
    if (renderer.shadowMap.enabled && stamp - shadowAt >= 100) {
      renderer.shadowMap.needsUpdate = true;
      shadowAt = stamp;
    }
  }
  return {mobile, fps, gate, shadows, pixelRatio, syncRenderer,get ultraLight(){return ultra();},
    setPreset:value=>quality.setPreset(value),setIdle:value=>{idle=!!value;}};
}

// Inject into the existing module (not a second renderer or animation loop).
export function renderBudgetSource(name = 'sceneBudget') {
  return `const ${name}=(${createRenderBudget.toString()})();`;
}
