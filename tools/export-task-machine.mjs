// Reuse the game's exact task art and picking implementation, with one source.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const html = await readFile('space-suspect-complete.html', 'utf8');
const marker = 'function createInteractiveTaskMachine(THREE,host,getState,onAction,onValue,onUnavailable){';
const start = html.indexOf(marker);
const end = html.indexOf('/* INTERACTIVE_TASK_MACHINES_V1_END */', start);
if (start < 0 || end < 0) throw new Error('Original interactive task machine not found');
let source = html.slice(start, end);
const heading = 'label(({filter:';
if (!source.includes(heading)) throw new Error('Original task machine heading changed');
source = source.replace(heading, 'label(state.machineLabel||({filter:');
// These labels in the original omit their local group and stack at the scene
// origin. Restore group ownership for the preview without duplicating the art.
for (const call of [
  'label(String(i+1),.88,-.57,.3,.28)',
  'label(String.fromCharCode(65+i),0,-1.72,.39,.52)',
  'label(String(i+1),.57,-.48,.29,.34)',
  'label(String(i+1),-.85,-.54,.27,.24)',
  'label(i?"可燃ごみ":"金属回収",0,-.29,.8,1.65)',
  'label(String(i*20),.96,y,.3,.35)',
]) {
  if (!source.includes(call)) throw new Error('Original task label binding changed: ' + call);
  source = source.replace(call, call.slice(0, -1) + ',"#cae6ee",g)');
}
await mkdir('public', { recursive: true });
await writeFile('public/task-machines.js', '// Generated from space-suspect-complete.html. Do not edit.\nexport ' + source);
