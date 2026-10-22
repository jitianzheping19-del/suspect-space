export const SHADOW_SETTING_KEY = 'space-suspect-render-shadows-v1';

export function readShadowPreference() {
  try {
    const saved = localStorage.getItem(SHADOW_SETTING_KEY);
    return saved === 'true' ? true : saved === 'false' ? false : null;
  } catch {
    return null;
  }
}

export function setRendererShadows(renderer, enabled) {
  if (!renderer?.shadowMap || renderer.shadowMap.enabled === enabled) return;
  renderer.shadowMap.enabled = enabled;
  renderer.shadowMap.needsUpdate = true;
}

// Srcdoc scenes have their own renderer. Install inside its existing module,
// immediately after shadow initialization, so the first frame uses the setting.
function installFrameShadowSettings(renderer, initialEnabled) {
  const apply = enabled => {
    window.__spaceRenderShadowsEnabled = enabled;
    if (renderer.shadowMap.enabled !== enabled) {
      renderer.shadowMap.enabled = enabled;
      renderer.shadowMap.needsUpdate = true;
    }
    for (const frame of document.querySelectorAll('iframe')) {
      frame.contentWindow?.postMessage({type: 'ss-render-shadows', enabled}, '*');
    }
  };
  let enabled = initialEnabled;
  try {
    if (typeof parent.__spaceRenderShadowsEnabled === 'boolean') enabled = parent.__spaceRenderShadowsEnabled;
  } catch { /* Sandboxed scenes use the serialized preference until load. */ }
  apply(enabled);
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'ss-render-shadows' || typeof event.data.enabled !== 'boolean') return;
    apply(event.data.enabled);
  });
  addEventListener('load', event => {
    if (event.target?.tagName === 'IFRAME') {
      event.target.contentWindow?.postMessage({type: 'ss-render-shadows', enabled: window.__spaceRenderShadowsEnabled}, '*');
    }
  }, true);
}

export function withShadowSettings(source) {
  let enabled = globalThis.__spaceRenderShadowsEnabled ?? readShadowPreference();
  if (enabled === null || enabled === undefined) {
    try { enabled = localStorage.getItem('space-suspect-render-preset-v1') !== 'low'; }
    catch { enabled = true; }
  }
  // Only the first assignment belongs to the scene itself. Later occurrences
  // may be escaped source strings for nested animation documents.
  return source.replace(/renderer\.shadowMap\.enabled\s*=\s*true\s*;/,
    match => `${match}\n(${installFrameShadowSettings.toString()})(renderer,${enabled});\n`);
}
