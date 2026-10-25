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
  let idle=false;
  function gate(rate = fps) {
    const presentation=arguments.length===0;
    let next = -Infinity;
    return {
      due(stamp) {
        const interval=1000/(presentation&&idle?Math.min(rate,15):rate);
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
    if (!mobile) return;
    renderer.shadowMap.autoUpdate = false;
    if (renderer.shadowMap.enabled && stamp - shadowAt >= 100) {
      renderer.shadowMap.needsUpdate = true;
      shadowAt = stamp;
    }
  }
  return {mobile, fps, gate, shadows,setIdle:value=>{idle=!!value;},
    pixelRatio: requested => Math.min(globalThis.devicePixelRatio || 1, requested, mobile ? 1.15 : requested)};
}

// Inject into the existing module (not a second renderer or animation loop).
export function renderBudgetSource(name = 'sceneBudget') {
  return `const ${name}=(${createRenderBudget.toString()})();`;
}
