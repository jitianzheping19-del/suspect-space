import './settings-design.js';
import './meeting-motion.js';

// The orientation prompt is a recommendation; dismissal lasts for this page.
const guide = document.getElementById('ssxOrientationGuide');
const continueButton = document.getElementById('ssxOrientationContinue');
const portraitPhone = matchMedia('(max-width: 600px) and (orientation: portrait) and (pointer: coarse)');
let dismissed = false;

function closeGuide() {
  if (!guide) return;
  if (typeof guide.close === 'function') guide.close();
  else guide.removeAttribute('open');
  guide.classList.add('hidden');
}

function syncOrientation() {
  if (!guide || dismissed || !portraitPhone.matches) {
    closeGuide();
    return;
  }
  if (guide.open || guide.hasAttribute('open')) return;
  // The game's modal manager isolates inactive dialogs. Restore this one before
  // showModal, then let the manager observe the class change and own focus.
  guide.inert = false;
  guide.removeAttribute('aria-hidden');
  guide.classList.remove('hidden');
  window.SpaceSuspect?.runtime?.stopGameInputForModal?.();
  if (typeof guide.showModal === 'function') guide.showModal();
  else guide.setAttribute('open', '');
}

function dismissGuide() {
  dismissed = true;
  closeGuide();
}

continueButton?.addEventListener('click', dismissGuide);
guide?.addEventListener('cancel', event => {
  event.preventDefault();
  dismissGuide();
});
portraitPhone.addEventListener('change', syncOrientation);
addEventListener('pageshow', syncOrientation);
syncOrientation();

// Feedback follows physical input only. Click/submission timing stays native.
const heldPointers = new Map();
const heldKeys = new Map();
const setup = document.getElementById('setup');
function feedbackButton(target) {
  const button = target instanceof Element ? target.closest('button') : null;
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || button.closest('[inert],.hidden')) return null;
  if (button.closest('#setup[data-entry-design="observatory"],#ssxOrientationGuide,#inputSettingsDialog,#stickPositionDialog')) return button;
  if (document.body.dataset.phase === 'play' && ['roundRoleBtn', 'mapBtn', 'titleInputSettingsBtn', 'voiceToggleBtn'].includes(button.id)) return button;
  return button.id === 'titleInputSettingsBtn' && setup && !setup.classList.contains('hidden') ? button : null;
}
function release(map, key) {
  const button = map.get(key);
  map.delete(key);
  if (button && ![...heldPointers.values(), ...heldKeys.values()].includes(button)) button.removeAttribute('data-entry-pressed');
}
function releaseAll() {
  for (const key of heldPointers.keys()) release(heldPointers, key);
  for (const key of heldKeys.keys()) release(heldKeys, key);
}
document.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const button = feedbackButton(event.target);
  if (!button) return;
  heldPointers.set(event.pointerId, button);
  button.setAttribute('data-entry-pressed', '');
}, {capture: true, passive: true});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  document.addEventListener(type, event => release(heldPointers, event.pointerId), {capture: true, passive: true});
}
document.addEventListener('pointerout', event => {
  const button = heldPointers.get(event.pointerId);
  if (button && !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) release(heldPointers, event.pointerId);
}, {capture: true, passive: true});
document.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key) || event.repeat) return;
  const button = feedbackButton(event.target);
  if (!button) return;
  heldKeys.set(event.key, button);
  button.setAttribute('data-entry-pressed', '');
}, true);
document.addEventListener('keyup', event => release(heldKeys, event.key), true);
document.addEventListener('focusout', event => {
  for (const [key, button] of heldPointers) if (button === event.target) release(heldPointers, key);
  for (const [key, button] of heldKeys) if (button === event.target) release(heldKeys, key);
}, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
addEventListener('blur', releaseAll);
