// Present the existing settings controls; their handlers and values stay on
// the original elements when the header/navigation are rearranged.
const dialog = document.getElementById('inputSettingsDialog');
const card = dialog?.querySelector('.inputSettingsDialogCard');
const nav = document.getElementById('inputSettingsNav');
if (card && nav) {
  dialog.dataset.settingsDesign = 'observatory';
  const header = document.createElement('header');
  header.className = 'settingsDesignHeader';
  const title = document.getElementById('inputSettingsTitle') || document.createElement('h2');
  title.id = 'inputSettingsTitle';
  title.textContent = '設定';
  header.append(title);
  const close = document.getElementById('inputSettingsClose');
  if (close) {
    close.classList.remove('settingsNavClose');
    close.classList.add('settingsDesignClose');
    header.append(close);
  }
  card.prepend(header);
  dialog.setAttribute('aria-labelledby', title.id);

  const icons = {
    player: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    audio: '<path d="m11 4-6 5H2v6h3l6 5V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    quality: '<rect x="3" y="3" width="18" height="14" rx="3"/><path d="M8 21h8m-4-4v4m-5-9 3-3 3 2 4-4"/>',
    operation: '<path d="M7 7h10c3 0 5 8 4 11s-4 0-6-2H9c-2 2-5 5-6 2S4 7 7 7Z"/><path d="M6 11h4m-2-2v4m7-2h.01M18 13h.01"/>',
    room: '<path d="M4 21V5l12-2v18M2 21h20M16 7h4v14m-8-9h.01"/>',
    inbox: '<path d="m5 4-3 9v7h20v-7l-3-9H5ZM2 13h6l2 3h4l2-3h6"/>',
    admin: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>'
  };
  const tabs = [...nav.querySelectorAll('button[data-settings-target]')];
  for (const tab of tabs) {
    const key = tab.dataset.settingsTarget;
    const glyph = document.createElement('span');
    glyph.className = 'settingsNavIcon';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[key] || icons.quality}</svg>`;
    tab.prepend(glyph);
    tab.id ||= `settingsTab_${key}`;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel?.setAttribute('aria-labelledby', tab.id);
    // Settings should activate on release, including when opened during play.
    tab.dataset.spacePointerAction = 'direct';
  }
  const portrait = matchMedia('(max-width: 640px) and (orientation: portrait)');
  function syncNavigation() {
    nav.setAttribute('aria-orientation', portrait.matches ? 'horizontal' : 'vertical');
    const visible = tabs.filter(tab => !tab.hidden && !tab.disabled);
    const selected = visible.find(tab => tab.getAttribute('aria-selected') === 'true') || visible[0];
    for (const tab of tabs) tab.tabIndex = tab === selected ? 0 : -1;
    if (selected && !dialog.classList.contains('hidden')) selected.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'auto'});
  }
  window.addEventListener('keydown', event => {
    const tab = event.target instanceof Element ? event.target.closest('button[data-settings-target]') : null;
    if (!tab || !nav.contains(tab) || event.altKey || event.ctrlKey || event.metaKey || dialog.querySelector('.is-listening')) return;
    const forward = portrait.matches ? 'ArrowRight' : 'ArrowDown';
    const backward = portrait.matches ? 'ArrowLeft' : 'ArrowUp';
    if (![forward, backward, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const visible = tabs.filter(item => !item.hidden && !item.disabled);
    const current = visible.indexOf(tab);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (current + (event.key === forward ? 1 : -1) + visible.length) % visible.length;
    visible[index]?.focus();
    visible[index]?.click();
  }, true);
  new MutationObserver(syncNavigation).observe(nav, {subtree: true, attributes: true, attributeFilter: ['aria-selected', 'hidden']});
  portrait.addEventListener('change', syncNavigation);
  addEventListener('spacesuspect:input-settings-open', () => queueMicrotask(syncNavigation));
  syncNavigation();
}
