// Each illustration has a padded viewBox fitted to its visible strokes.
const ink = '#172c43';
const kit = 'var(--kit,#38cdab)';
const light = 'var(--kit-light,#a4ffe1)';

function ball(x, y, r) {
  return `<g transform="translate(${x} ${y}) scale(${r / 10})">
    <circle r="10" fill="#fcfff3" stroke="${ink}" stroke-width="1.3"/>
    <path d="M2-9.7A10 10 0 0 1-6 8a9 9 0 0 0 8-17.7" fill="#aecbda"/>
    <g fill="${ink}"><path d="m-4-2 4-2 4 3-2 4-5-.4Z M-7-7l4-2-1 3-3 1Z M7-6l2 2 .7 4-3-2Z M-9 2l3 1 1 4-2 1Z M2 8l4-2 .5 2L3 9.5Z"/></g>
    <path d="m-4-6 2 3m5 2 4-1m-5 5 2 4m-7-4-3 .5" fill="none" stroke="#506475" stroke-width=".7"/>
  </g>`;
}

function boot(transform) {
  return `<g transform="${transform}" stroke-linejoin="round">
    <path d="m3 9 5 2 2-7 7 2 2 5 12 5c2 1 2 5-1 6H7c-4 0-6-2-6-5Z" fill="${kit}" stroke="${ink}" stroke-width="1.5"/>
    <path d="m4 12 5 2 3-6 4 1-3 7-8 2Z" fill="${light}"/>
    <path d="M2 18q11 3 29 0l-.5 4H6q-4-.4-4-4" fill="#f6f4dc"/>
    <path d="m7 22 .4 3h3l.8-3m11 0 .6 3h3l.6-3" fill="${light}" stroke="${ink}" stroke-width=".8"/>
    <path d="m16 10 3 1m0 1 3 1m0 1 3 1" fill="none" stroke="#fff9e9" stroke-width="1.6" stroke-linecap="round"/>
  </g>`;
}

function streak(path, color=light, width=3) {
  return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function shirt(team, plus) {
  const cloth=team==='blue'?'#519eff':'#ff6c78',fold=team==='blue'?'#1a568e':'#ae3c55';
  return `<path d="m23 6 6 2 6-2 10 7-5 7-4-3v18H19V17l-5 3-4-7Z" fill="${cloth}" stroke="${ink}" stroke-width="1.5"/>
    <path d="m23 6 6 2 6-2-1 4-5 3-5-3Z" fill="#fff2dc"/><path d="m20 16 3 3v14h-4ZM32 16h3v17h-3Z" fill="${fold}"/>
    <rect x="25" y="17" width="8" height="7" rx="2" fill="${ink}"/><path d="M27 20h.4m3 0h.4" stroke="#ffedbd" stroke-width="1.7"/>
    <circle cx="44" cy="30" r="9" fill="${fold}" stroke="#fff1cd" stroke-width="2"/>
    ${streak(plus?'M40 30h8m-4-4v8':'M40 30h8','#fff8e6',2.6)}`;
}

const illustrations = {
  pass: ['4 11 48 25', streak('M7 30q17 9 39-11',kit,6)+streak('M19 30q13 1 30-16m-9 1 10-2-3 10',light,3)+ball(15,25,9)],
  through: ['4 8 52 29', streak('m6 33 25-11m-14 13 28-13',kit,2.5)+streak('m15 29 38-18m-12-1 13 1-6 11',light,4)+ball(16,27,8)],
  lob: ['6 9 52 29', '<ellipse cx="49" cy="33" rx="7" ry="2.5" fill="#ccb5ff"/>'+streak('M10 30Q32-6 49 27',kit,4)+streak('m42 24 7 4 1-8',light,3)+ball(16,23,8)],
  shot: ['3 1 54 36', '<path d="m5 35 19-19-5 1L42 6l8 14-14 8 4-6-24 13 7-8Z" fill="#f85f42"/><path d="m16 32 16-16-2 5 18-12-6 11-11 6 2-6Z" fill="#ffbf55"/>'+streak('m8 25 10-8m14 15 7-5','#ffe8a2',2)+ball(45,13,10)],
  curve: ['6 1 53 37', streak('M8 33q31 11 41-20','#ef7949',7)+streak('M12 34q21 4 30-11','#ffd37b',3)+ball(48,12,9)],
  feint: ['4 -2 50 42', streak('M8 30q-6 9 15 7t27-17m-7 3 8-7 1 10',light,2.5)+boot('translate(12 1) rotate(-15 12 15) scale(.91)')+ball(36,28,8.5)],
  trap: ['5 2 48 39', streak('M7 31h9m25 0h10m-5-16v8m-3-3 3 4 3-4',light,2.5)+ball(30,31,8)+boot('translate(13 1) scale(.94 .86)')],
  dash: ['1 0 58 36', streak('M4 18h14m-9 8h10m-16 5h9',light,2.6)+boot('translate(19 4) rotate(-18 15 13) scale(1.06)')],
  press: ['4 2 55 38', '<path d="m33 4 15 5-2 12q-3 11-13 17-12-7-15-18L17 9Z" fill="#7b3745" stroke="#ffb798" stroke-width="2"/>'+streak('m6 13 8 6-8 6m51-12-8 6 8 6','#ff936c',3.6)+ball(32.5,19,9)],
  slide: ['5 2 57 36', '<circle cx="28" cy="9" r="4.5" fill="#ffd0aa"/><path d="m27 15-7 8-8 1-1 3 12 .5 8-7Z" fill="#f3c3a1"/><path d="m28 13 10 8-8 7-10-5Z" fill="#71bbff" stroke="#163e64" stroke-width="1.4"/><path d="m21 23 9 4 8-3 8 2-2 4-10-1-7 4-9-5Z" fill="#f8f4df"/><path d="m43 26 7-1 2 4-8 2Z" fill="#ffb45e"/>'+streak('M7 32h10m-4 4h27','#76cfff',2.5)+ball(54,22,5.5)],
  header: ['9 1 49 37', '<path d="M11 35q2-9 11-11l8 3 7 9Z" fill="#49a5d4"/><path d="M23 24q-8-1-7-9c0-8 11-11 16-4l3 2-1 2 3 4-4 1q-1 6-7 5l-2 3-4-2Z" fill="#ffcba6"/><path d="M16 18q-4-11 7-13 7-.6 10 6l-6 1-3-2-1 4-6 1Z" fill="#33435b"/>'+streak('m37 8 3-4m-1 10 4-1','#ffcf77',2)+ball(49,10,7)],
  volley: ['2 -1 56 40', streak('m4 30 15-8m-11 14 17-7',light,2.2)+boot('translate(13 9) rotate(-24 13 13) scale(.95)')+ball(47,10,8.5)],
  sky: ['9 0 48 38', '<path d="m15 34 7-14 3 6L40 5l-5 19-4-4-12 16Z" fill="#ffe68e"/>'+streak('m11 27 8-12m16 17 5-6','#8bcaff',2)+ball(46,11,9)],
  overhead: ['8 -6 47 38', streak('M10 30q-2-19 18-23m-4-3 6 3-5 4',light,2.5)+boot('translate(33 29) rotate(-120) scale(.8)')+ball(45,10,8)],
  start: ['9 6 45 31', '<path d="M11 8h41v27H11Z" fill="#25836a" stroke="#b1f7c7" stroke-width="2"/>'+streak('M31.5 9v25M12 16h5v10h-5m40-10h-5v10h5','#bdfbcf',1.5)+'<circle cx="31.5" cy="21.5" r="6" fill="none" stroke="#c1fcd0" stroke-width="1.5"/><path d="m28 13 13 8-13 8Z" fill="#ffe295" stroke="#2d574e" stroke-width="1"/>'],
  stop: ['8 1 43 37', '<path d="M12 20q2-9 13-8l24-1-1 9-12 2c-1 12-12 17-19 11-5-3-6-8-5-13Z" fill="#ffa758" stroke="#702d3b" stroke-width="1.5"/><circle cx="23" cy="23" r="5" fill="#763b46"/><path d="m33 13 5-.5-.5 5-5 .5Z" fill="#8d4046"/>'+streak('m13 10-3-3m10 1-1-5','#ffe1a1',2)],
  exit: ['10 2 45 35', '<path d="M12 35V9l19-5 9 3v28Z" fill="#89c9e2" stroke="#20364c" stroke-width="2"/><path d="M16 33V12l14-3v24Z" fill="#25536a"/><path d="m30 7 7 2v23l-7 2Z" fill="#cdeaf0"/>'+streak('M28 22h24m-8-7 9 7-9 7','#ffcf7e',3.5)],
  'blue-plus':['8 4 47 37',shirt('blue',true)], 'blue-minus':['8 4 47 37',shirt('blue',false)],
  'red-plus':['8 4 47 37',shirt('red',true)], 'red-minus':['8 4 47 37',shirt('red',false)]
};

export function paintSoccerIcon(button, kind) {
  if (!Object.hasOwn(illustrations,kind)) kind='pass';
  if (button.dataset.soccerArt === kind) return;
  const svg = button.querySelector('svg');
  const [viewBox,drawing]=illustrations[kind];
  svg.setAttribute('viewBox',viewBox);
  svg.innerHTML='<g fill="none" stroke="none" stroke-linecap="round" stroke-linejoin="round">'+drawing+'</g>';
  button.dataset.soccerArt=kind;
}
