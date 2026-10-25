// Source generation only. Keep serialized standalone previews and iframe
// scenes on the same policy as the main game, without external iframe imports.
import {readFile,writeFile} from 'node:fs/promises';
import {renderBudgetSource} from '../render-performance.js';

const targets=[
  ...['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']
    .map(file=>({file,marker:'TASK_MACHINE_RENDER_BUDGET',name:'machineBudget'})),
  {file:'assets-source/lobby-lounge.html',marker:'LOBBY_RENDER_BUDGET',name:'lobbyBudget'},
];
for(const {file,marker,name} of targets){
  const source=await readFile(file,'utf8');
  const pattern=new RegExp(`/\\* ${marker}_BEGIN \\*/[\\s\\S]*?/\\* ${marker}_END \\*/`);
  if(!pattern.test(source))throw new Error('Missing render-budget source marker: '+file);
  const updated=source.replace(pattern,()=>`/* ${marker}_BEGIN */\n${renderBudgetSource(name)}\n/* ${marker}_END */`);
  if(updated!==source)await writeFile(file,updated);
}
