// Size in em units so orientation changes only need CSS, not a new measurement.
const widths = new Map();
let context;

function captionWidth(element,text) {
  let width = widths.get(text);
  if (width === undefined) {
    context ??= element.ownerDocument.createElement('canvas').getContext('2d');
    if (context) context.font = '800 100px system-ui';
    width = Math.max(1, context ? context.measureText(text).width / 100 : Array.from(text).length);
    widths.set(text, width);
  }
  return width;
}

// A long hint can use two lines without breaking a Japanese word in half.
const hintStarts = {
  '先行入力：受けたらシュート':'先行入力：',
  'そのまま保持：スルー':'そのまま保持：',
  '押してキックを中止':'押して'
};

export function setActionCaption(element, text) {
  if (element.textContent === text && element.style.getPropertyValue('--caption-em')) return;
  const first = element.tagName === 'SMALL' && hintStarts[text];
  let width;
  if (first) {
    const second=text.slice(first.length);
    element.replaceChildren(first,element.ownerDocument.createElement('br'),second);
    width=Math.max(captionWidth(element,first),captionWidth(element,second));
  } else {
    element.textContent=text;
    width=captionWidth(element,text);
  }
  element.style.setProperty('--caption-em', String(width));
}
