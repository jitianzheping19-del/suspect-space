// Presentation only: existing vote handlers, timers and 3D readiness own state.
const meeting = document.getElementById('meeting');
const players = document.getElementById('votePlayers');
const intro = document.getElementById('meetingIntro');
const results = document.getElementById('voteResultList');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Map();
const cardState = new WeakMap();
let boardKey = '', boardVisible = false, phase = '', frame = 0;

function animate(node, frames, duration = 340, delay = 0) {
  if (!node || reduced.matches || document.hidden || !node.getClientRects().length || !node.animate) return;
  running.get(node)?.cancel();
  const motion = node.animate(frames, {duration, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards'});
  running.set(node, motion);
  const forget = () => { if (running.get(node) === motion) running.delete(node); };
  motion.addEventListener('finish', forget, {once: true});
  motion.addEventListener('cancel', forget, {once: true});
}
function cancel() { for (const motion of running.values()) motion.cancel(); running.clear(); }
function sync() {
  frame = 0;
  const visible = !!meeting && !!players && !meeting.classList.contains('hidden') && !meeting.classList.contains('is-leaving') &&
    meeting.dataset.renderMode === '2d' && !players.classList.contains('hidden') &&
    (!intro || intro.classList.contains('hidden')) && !document.hidden;
  const key = players?.dataset.layoutKey || '';
  const entering = visible && (!boardVisible || boardKey !== key);
  if (!visible) { if (boardVisible) cancel(); boardVisible = false; return; }
  const cards = [...players.querySelectorAll('.voteCard')].filter(card => !card.hidden);
  if (entering) {
    cancel();
    cards.forEach((card, index) => {
      const opacity = getComputedStyle(card).opacity;
      animate(card, [
        {opacity: .2, translate: '0 14px', scale: '.975'},
        {opacity, translate: '0 0', scale: '1'}
      ], 440, Math.min(index * 28, 224));
    });
    animate(document.getElementById('meetingChat'), [{opacity: .5, translate: '0 8px'}, {opacity: 1, translate: '0 0'}], 440, 90);
  }
  if (!entering && phase !== meeting.dataset.phase) {
    animate(document.getElementById('meetingPhase'), [{opacity: .25, translate: '0 5px'}, {opacity: 1, translate: '0 0'}], 300);
  }
  for (const card of cards) {
    const previous = cardState.get(card);
    const state = {voted: card.classList.contains('voted'), selected: card.classList.contains('ssx-vote-selected')};
    if (!entering && previous) {
      if (state.selected && !previous.selected) animate(card, [{scale: '.975'}, {scale: '1.012', offset: .55}, {scale: '1'}], 280);
      if (state.voted && !previous.voted) animate(card.querySelector('.voteName'), [{scale: '.96', opacity: .65}, {scale: '1.025', opacity: 1, offset: .6}, {scale: '1', opacity: 1}], 300);
    }
    cardState.set(card, state);
  }
  boardKey = key; boardVisible = true; phase = meeting.dataset.phase;
}
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
const observer = new MutationObserver(schedule);
if (meeting && players) {
  observer.observe(meeting, {attributes: true, attributeFilter: ['class', 'data-phase', 'data-render-mode']});
  observer.observe(players, {subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'data-layout-key']});
  if (intro) observer.observe(intro, {attributes: true, attributeFilter: ['class']});
}
const resultObserver = new MutationObserver(() => {
  [...results.children].forEach((row, index) => row.style.setProperty('--meeting-row-delay', `${Math.min(index * 32, 224)}ms`));
});
if (results) resultObserver.observe(results, {childList: true});
reduced.addEventListener('change', () => { cancel(); schedule(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); schedule(); });
addEventListener('pagehide', event => {
  cancel(); cancelAnimationFrame(frame); frame = 0;
  if (!event.persisted) { observer.disconnect(); resultObserver.disconnect(); }
});
addEventListener('pageshow', schedule);
schedule();
