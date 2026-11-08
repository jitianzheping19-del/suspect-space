import {createTaskTerminalDocument,classicTaskIndex} from './task-terminal-document.js';
import {createSkeldTaskRun,SKELD_EXTRA_HINTS} from './skeld-task-rules.js';
import {createSkeldTaskMachine} from './skeld-task-machine.js';
import {createFrostTaskRun,taskInstructions} from './frost-task-rules.js';
import {createFrostTaskMachine} from './frost-task-machine.js';
import './practice-lab.css';
import {taskExample} from './task-help-examples.js';
export {taskExample};
export function installPracticeLab(api){
 const dialog=document.createElement('dialog');dialog.id='practiceLab';dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','練習');
 dialog.innerHTML='<header><nav aria-label="練習の種類"><button type="button" data-mode="tasks">タスク</button><button type="button" data-mode="roles">役職能力</button></nav><button type="button" data-close>閉じる</button></header><div class="practiceBody"><aside class="practiceChoices"><section data-pick><label data-map-label><span>マップ</span><select data-map></select></label><label><span data-choice-label>タスク</span><select data-choice></select></label></section><details data-example hidden><summary>説明：<strong></strong></summary><p></p></details><p data-practice-status role="status"></p><button type="button" data-repeat hidden>もう一度</button></aside><div data-stage></div></div>';
 document.body.append(dialog);
 const q=s=>dialog.querySelector(s),choice=q('[data-choice]'),map=q('[data-map]'),stage=q('[data-stage]'),status=q('[data-practice-status]');
 let mode='tasks',machine=null,frame=null,active=null,version=0,selectedTasks=[],loadTimer=0;
 function stop(){version++;clearTimeout(loadTimer);loadTimer=0;if(frame)frame.contentWindow?.postMessage({type:'ss-task-terminal-close',id:active?.id},'*');machine?.dispose();machine=null;frame?.remove();frame=null;active=null;stage.replaceChildren();stage.removeAttribute('aria-busy');q('[data-repeat]').hidden=true;}
 function close(){stop();dialog.close();}q('[data-close]').onclick=close;dialog.addEventListener('close',stop);
 const placeholder=(select,label)=>{select.replaceChildren();const option=new Option(label,'');option.disabled=true;option.selected=true;select.append(option);};
 function emptyStage(){const message=document.createElement('p');message.dataset.empty='';message.textContent=mode==='roles'?'役職能力を選択してください':map.value?'タスクを選択してください':'マップを選択してください';stage.replaceChildren(message);}
 function populateChoices(){
  placeholder(choice,mode==='tasks'?'タスクを選択':'役職を選択');
  selectedTasks=api.tasks().filter(t=>(t.mapLabel||'スケルド')===map.value);
  const items=mode==='tasks'?selectedTasks:api.roles();
  for(const [i,item]of items.entries())choice.append(new Option(item.name,String(i)));
  choice.disabled=mode==='tasks'&&!map.value;q('[data-example]').hidden=true;q('[data-example]').open=false;status.textContent='';emptyStage();
 }
 function populate(){
  dialog.dataset.mode=mode;
  for(const b of dialog.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  q('[data-map-label]').hidden=mode!=='tasks';q('[data-choice-label]').textContent=mode==='tasks'?'タスク':'役職能力';
  placeholder(map,'マップを選択');for(const label of new Set(api.tasks().map(t=>t.mapLabel||'スケルド')))map.append(new Option(label,label));populateChoices();
 }
 function preview(item){q('[data-example]').hidden=false;q('[data-example] strong').textContent=item.name;q('[data-example] p').textContent=mode==='tasks'?(SKELD_EXTRA_HINTS[item.mode]||taskInstructions[item.mode]||taskExample(item)[1]):item.description;}
 map.onchange=()=>{stop();populateChoices();};choice.onchange=()=>void start();
 for(const b of dialog.querySelectorAll('[data-mode]'))b.onclick=()=>{stop();mode=b.dataset.mode;populate();};
 function complete(){if(!active||active.done)return;active.done=true;status.textContent='練習完了！';q('[data-repeat]').hidden=false;api.completed?.(active.task);}
 function loading(){stage.setAttribute('aria-busy','true');const overlay=document.createElement('div');overlay.dataset.loadingScreen='';overlay.setAttribute('role','status');overlay.textContent='ロード中…';stage.append(overlay);status.textContent='';}
 function ready(){clearTimeout(loadTimer);stage.removeAttribute('aria-busy');q('[data-loading-screen]')?.remove();if(frame)frame.style.visibility='';status.textContent='';}
 function failed(){stop();status.textContent='読み込めませんでした。「再読み込み」で再試行してください。';q('[data-repeat]').textContent='再読み込み';q('[data-repeat]').hidden=false;}
 async function start(){
  stop();if(choice.value==='')return;const current=version,item=(mode==='tasks'?selectedTasks:api.roles())[Number(choice.value)];if(!item)return;preview(item);q('[data-repeat]').textContent='もう一度';
  if(mode==='roles'){
   loading();frame=document.createElement('iframe');frame.title=item.name+'の能力練習';frame.style.visibility='hidden';frame.src=new URL('./index.html?rolePractice=1&role='+encodeURIComponent(item.id),location.href).href;stage.append(frame);
   loadTimer=setTimeout(()=>{if(current===version)failed();},45000);return;
  }
  active={id:crypto.randomUUID(),task:item,done:false};const done=()=>{if(current===version)complete();};
  try{
   if(item.taskEngine==='skeld'){const run=createSkeldTaskRun(item,done);machine=createSkeldTaskMachine(stage,run);}
   else if(item.taskEngine==='frost'||item.mapMode==='frost'){const run=createFrostTaskRun(item,done);machine=createFrostTaskMachine(stage,run,{onClose:close,onUnavailable:failed});}
   else{
    loading();const source=await createTaskTerminalDocument();if(current!==version||!dialog.open)return;frame=document.createElement('iframe');frame.title=item.name;frame.srcdoc=source;frame.addEventListener('load',openTerminal);stage.append(frame);loadTimer=setTimeout(()=>{if(current===version&&!active?.ready)failed();},20000);
   }
  }catch(e){if(current===version)failed();}
 }
 q('[data-repeat]').onclick=start;
 function openTerminal(){if(!frame||!active||mode!=='tasks'||active.openSent)return;active.openSent=true;frame.contentWindow.postMessage({type:'ss-task-terminal-open',id:active.id,index:classicTaskIndex(active.task),name:active.task.name,hue:.5,volume:api.volume?.()??.7},'*');}
 const onMessage=event=>{
  if(!frame||event.source!==frame.contentWindow)return;const data=event.data||{};
  if(mode==='roles'){if(event.origin!==location.origin)return;if(data.type==='ss-role-practice-exit')close();if(data.type==='ss-role-practice-ready')ready();return;}
  if(!active)return;if(data.type==='ss-task-terminal-init')openTerminal();if(data.id!==active.id)return;
  if(data.type==='ss-task-terminal-ready'){active.ready=true;ready();}if(data.type==='ss-task-terminal-done')complete();if(data.type==='ss-task-terminal-cancel')close();
 };window.addEventListener('message',onMessage);
 function open(){if(!api.available())return;api.pause?.();stop();mode='tasks';populate();if(!dialog.open)dialog.showModal();api.opened?.();}
 return{open,close,dispose(){close();window.removeEventListener('message',onMessage);dialog.remove();},sync(){if(!api.available()&&dialog.open)close();}};
}
