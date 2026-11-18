import {setActionCaption} from './lobby-action-caption.js';
import {paintSoccerIcon} from './lobby-soccer-icons.js';
// Static 24-unit drawings. The text and pointer handling belong to the original button.
const drawings = {
  use: ['1 0 20 23', '<path fill="#ffd8a9" stroke="#795445" d="M7 12V7a1.5 1.5 0 0 1 3 0v4-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 4-2 7-6 7h-1c-2 0-3.2-.8-4.5-2.2L3.8 14a1.6 1.6 0 0 1 2.4-2.1L8 14"/><path d="M9 20h7" stroke="#5ae1be" stroke-width="2.8"/>'],
  car: ['0 5 24 17', '<path d="m4 12 2.4-5h10.8l3 5 1 1.5V18H2.8v-4.5Z" fill="#49cbb6" stroke="#b7f4d7"/><path d="m6.8 11 1.4-3h7.3l2 3Z" fill="#234f71" stroke="none"/><path d="M6 18v2m12-2v2" stroke="#b5c8d4"/><path d="M5 14.5h2.5m9 0H19" stroke="#ffe8a2"/><path d="M10 16h4" stroke="#124c51"/>'],
  dismount: ['2 1 21 22', '<path d="M4 3h8v18H4Z" fill="#83c5df" stroke="#d4ebef"/><path d="m6 5 4-1v15l-4-.8Z" fill="#326381" stroke="none"/><path d="M10 12h11m-5-5 5 5-5 5" stroke="#ffd383" stroke-width="2.5"/>'],
  practice: ['0 0 24 24', '<circle cx="11" cy="13" r="8.5" fill="#fb8979" stroke="#ffe5c6"/><circle cx="11" cy="13" r="5" fill="#fff1d1" stroke="none"/><circle cx="11" cy="13" r="2.4" fill="#c95461" stroke="none"/><path d="m11 13 8-8m-1 .5L18 2m1 3.5L22 5" stroke="#90e5f1"/>'],
  capsule: ['-1 -2 26 28', '<g transform="rotate(-32 12 12)"><rect x="5" y="2.5" width="14" height="19" rx="7" fill="#f6efdb" stroke="#b3dedf"/><path d="M5 12V10a7 7 0 0 1 14 0v2Z" fill="#ff8e94" stroke="none"/><path d="M5 12h14" stroke="#456578"/><path d="M8 8a4 4 0 0 1 4-3" stroke="#ffe6d8"/></g>'],
  premium: ['-2 -1 27 27', '<g transform="rotate(-32 11 14)"><rect x="4.5" y="5" width="13" height="16.5" rx="6.5" fill="#e9cbff" stroke="#f4ddaa"/><path d="M4.5 13v-1.5a6.5 6.5 0 0 1 13 0V13Z" fill="#9572df" stroke="none"/><path d="M5 13h12" stroke="#ffdf80"/></g><path d="m17.5 1.2 1.4 4.4 4 1.5-4 1.5-1.4 4.1L16 8.6l-4-1.5 4-1.5Z" fill="#ffe297" stroke="#fff4ce" stroke-width=".7"/>'],
  camera: ['1 2 22 20', '<path d="M3 7h4l1.7-3h6.6L17 7h4v13H3Z" fill="#8dcbd9" stroke="#d6ece7"/><path d="M4 11h16v7H4Z" fill="#447389" stroke="none"/><circle cx="12" cy="13" r="4.2" fill="#254f69" stroke="#ffd58b"/><circle cx="13" cy="12" r="1.2" fill="#a8faff" stroke="none"/><path d="M17.5 9h1" stroke="#ffe5a4"/>'],
  groupPhoto: ['1 2 22 20', '<path d="M3 8V4h4m10 0h4v4M3 16v4h4m10 0h4v-4" stroke="#ffdd96"/><circle cx="9" cy="9" r="2.5" fill="#ffe3bc" stroke="none"/><path d="M4.8 17a4.3 4.3 0 0 1 8.6 0Z" fill="#7ed7cb" stroke="none"/><circle cx="15.5" cy="10" r="2" fill="#edb790" stroke="none"/><path d="M13 16a3.4 3.4 0 0 1 6 .5h-5Z" fill="#b7a4f6" stroke="none"/>'],
  news: ['2 2 21 21', '<path d="M4 4h14v15a1.5 1.5 0 0 0 3 0V8h-3M19.5 20.5H6a2 2 0 0 1-2-2Z" fill="#f5dfad" stroke="#fff0c8"/><path d="M7.5 8h7" stroke="#da715e"/><path d="M7.5 12h7m-7 4h4" stroke="#51677a"/>'],
  monitor: ['0 2 24 21', '<rect x="2" y="4" width="20" height="14" rx="2" fill="#254565" stroke="#a6cce0"/><path d="M12 18v3m-4 0h8" stroke="#b4c7d0"/><path d="M5 12h3l2-4 3 6 2-3h4" stroke="#7aefb3"/>'],
  outfit: ['0 1 24 22', '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z" fill="#ad94ec" stroke="#ead8fc"/><path d="M9.5 18h5m-2.5-9v6" stroke="#ffd694"/>'],
  sit: ['2 2 19 21', '<rect x="5.5" y="4" width="12" height="9" rx="2" fill="#70bccd" stroke="#cae3e1"/><path d="M4 13h15v3H4Z" fill="#efb979" stroke="#ffe0a5"/><path d="M6 16v5m11-5v5" stroke="#c3d0d6"/>'],
  stand: ['1 1 22 22', '<path d="M3 9v7h10m-9 0v5m8-5v5" stroke="#edc38b"/><path d="M17 14V3m-4 4 4-4 4 4" stroke="#83e9b1"/>'],
  pet: ['0 1 24 21', '<path d="M5.5 16c1-1.5 2.5-2.5 3.5-4 1.3-1.8 4.5-1.8 5.8 0 1 1.5 2.8 2.7 3.7 4 1.6 2.6-.8 4.7-3.5 3.7-2.2-.8-3.8-.8-6 0-2.7 1-5.1-1.1-3.5-3.7Z"/><g class="accent" fill="currentColor" stroke="none"><ellipse cx="4" cy="10" rx="2" ry="2.5"/><ellipse cx="9" cy="6" rx="2" ry="3"/><ellipse cx="15" cy="6" rx="2" ry="3"/><ellipse cx="20" cy="10" rx="2" ry="2.5"/></g>'],
  dash: ['-1 0 24 23', '<circle cx="16.5" cy="4.2" r="1.8" fill="currentColor"/><path d="m8 10 3.5-3 3 1 2 4h4m-7-4-3 6 4 2-1 5m-3-7-3 4H3"/><path class="accent" d="M2 7h5m-6 5h4"/>'],
  tag: ['2 0 22 23', '<path d="m4 16 2-6c.4-1.4 2.4-1.2 2.4.2v1l3-5c.8-1.4 2.8-.3 2 1.1l-1.8 3 2.9-3.7c1-1.2 2.8.1 1.8 1.4l-2.7 3.7 2.6-2.3c1.2-1 2.7.6 1.6 1.7l-4.7 5.7c-1.2 1.4-2.6 2.2-4.3 2.4L7.5 21Z"/><path class="accent" d="m16 2 1 2m4 0-2 2m3 2h-2"/>'],
  jump: ['3 1 18 22', '<path d="M12 16V3m-6 6 6-6 6 6"/><path class="accent" d="m5 17 7 4 7-4"/>'],
  unstuck: ['1 2 22 20', '<path d="M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4"/><path class="accent" d="M9 4h6m-6 16h6"/>'],
  poseStand: ['4 0 16 23', '<circle cx="12" cy="5" r="2.2"/><path d="m6 13 3-5h6l3 5m-8-4v6l-2 6m6-12v6l2 6"/>'],
  poseWave: ['3 0 20 23', '<circle cx="11" cy="5" r="2.2"/><path d="m5 15 3-6h6l3-3 1-4m-8 8v6l-2 5m5-11v6l3 5"/><path class="accent" d="M21 3v3"/>'],
  poseCheer: ['1 1 22 22', '<circle cx="12" cy="6" r="2.2"/><path d="m3 4 5 6h8l5-6m-11 6v5l-3 6m7-11v5l3 6"/>'],
  poseHero: ['3 0 18 23', '<circle cx="12" cy="5" r="2.2"/><path d="m9 9-4 4 4 2m6-6 4 4-4 2M9 9h6l-1 7 2 5m-6-5-2 5"/><path class="accent" d="m15 9 4 9-5-1"/>'],
};

export function setLobbyActionFace(button, kind, caption, title, soccerArt) {
  let face = button.querySelector('.lobbyActionFace');
  if (!face) {
    face = button.ownerDocument.createElement('span');
    face.className = 'lobbyActionFace';
    face.innerHTML = '<svg class="lobbyActionMark" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></svg><span class="lobbyActionLabel"></span>';
    button.replaceChildren(face);
  }
  if (soccerArt) {
    paintSoccerIcon(button,soccerArt);
  } else if (button.dataset.actionIcon !== kind || button.dataset.soccerArt || !face.firstChild.hasChildNodes()) {
    delete button.dataset.soccerArt;
    const [viewBox, drawing] = drawings[kind] || drawings.use;
    face.firstChild.setAttribute('viewBox', viewBox);
    face.firstChild.innerHTML = drawing;
  }
  if (button.dataset.actionIcon !== kind) button.dataset.actionIcon = kind;
  setActionCaption(face.lastChild, caption);
  if (button.title !== title || button.getAttribute('aria-label') !== title) {
    button.title = title;
    button.setAttribute('aria-label', title);
  }
}
