import {createTaskTerminalDocument,classicTaskIndex} from './task-terminal-document.js';
import {createSkeldTaskRun,SKELD_EXTRA_HINTS} from './skeld-task-rules.js';
import {createSkeldTaskMachine} from './skeld-task-machine.js';
import {createFrostTaskRun,taskInstructions} from './frost-task-rules.js';
import {createFrostTaskMachine} from './frost-task-machine.js';
import './practice-lab.css';
const terminalIndex=classicTaskIndex;
const examples=[['同じ色をつなぐ','左の端子を押し、同じ色の右の端子まで動かして離す。'],['転送を開始','開始ボタンを押し、ゲージが満ちるまで待つ。'],['コードを入力','画面に示された数字を、順番に押す。'],['針を合わせる','緑の範囲へ針を合わせ、指定の位置で確定する。'],['検査を続ける','指定された検査部分を押し、進行ゲージを確認する。'],['カードを通す','カードをつかみ、速すぎない一定の速さで読み取り部へ動かす。'],['燃料をためる','指定のボタンを押し続け、満タンになったら離す。']];
export function taskExample(task){return examples[terminalIndex(task)]||examples[0];}
export function installPracticeLab(api){
 const dialog=document.createElement('dialog');dialog.id='practiceLab';dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','タスク・役職練習');
 dialog.innerHTML='<header><h2>タスク・役職練習</h2><button type="button" data-close>閉じる</button></header><nav><button type="button" data-mode="tasks">タスク</button><button type="button" data-mode="roles">役職の能力</button></nav><section data-pick><label>練習する内容 <select data-choice></select></label><button type="button" data-start>練習する</button></section><section data-example><strong></strong><p></p><svg viewBox="0 0 260 58" aria-label="押して、動かして、離す操作の例"><rect x="12" y="10" width="50" height="38" rx="10" fill="#2e566b"/><path d="M75 29h103m-12-8 14 8-14 8" stroke="#b7e8d8" fill="none" stroke-width="3"/><rect x="195" y="10" width="50" height="38" rx="10" fill="#277764"/><circle class="practiceFinger" cx="37" cy="29" r="10" fill="#fff3cc"/></svg></section><p data-practice-status role="status"></p><div data-stage></div><button type="button" data-repeat hidden>もう一度練習</button>';
 document.body.append(dialog);const q=s=>dialog.querySelector(s),choice=q('[data-choice]'),stage=q('[data-stage]'),status=q('[data-practice-status]');let mode='tasks',machine=null,frame=null,active=null,version=0,selectedTasks=[],loadTimer=0;
 function stop(){version++;clearTimeout(loadTimer);loadTimer=0;if(frame)frame.contentWindow?.postMessage({type:'ss-task-terminal-close',id:active?.id},'*');machine?.dispose();machine=null;frame?.remove();frame=null;active=null;stage.replaceChildren();}
 function close(){stop();dialog.close();}q('[data-close]').onclick=close;dialog.addEventListener('close',stop);
 function populate(){choice.replaceChildren();selectedTasks=api.tasks();const items=mode==='tasks'?selectedTasks:api.roles();for(const [i,item]of items.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=mode==='tasks'?`${item.mapLabel||''} ${item.name}`:item.name;choice.append(option);}q('[data-repeat]').hidden=true;status.textContent='練習は本番の進行・報酬に影響しません。';preview();}
 function preview(){const item=(mode==='tasks'?selectedTasks:api.roles())[Number(choice.value)||0];if(!item)return;const [title,text]=mode==='tasks'?[item.name,SKELD_EXTRA_HINTS[item.mode]||taskInstructions[item.mode]||taskExample(item)[1]]:[item.name,item.description];q('[data-example] strong').textContent=title;q('[data-example] p').textContent=text;q('[data-example] svg').hidden=mode!=='tasks';}
 choice.onchange=()=>{stop();preview();};for(const b of dialog.querySelectorAll('[data-mode]'))b.onclick=()=>{stop();mode=b.dataset.mode;populate();};
 function complete(){if(!active||active.done)return;active.done=true;status.textContent='練習完了！もう一度試すか、別のタスクを選べます。';q('[data-repeat]').hidden=false;api.completed?.(active.task);}
 async function start(){
  stop();const current=version,item=(mode==='tasks'?selectedTasks:api.roles())[Number(choice.value)||0];if(!item)return;
  q('[data-repeat]').hidden=true;status.textContent='準備しています…';
  if(mode==='roles'){
   frame=document.createElement('iframe');frame.title=item.name+'の能力練習';frame.src=new URL('./index.html?rolePractice=1&role='+encodeURIComponent(item.id),location.href).href;stage.append(frame);status.textContent='移動して対象へ近づき、能力ボタンを使ってみよう。練習内で状況を切り替えられます。';return;
  }
  active={id:crypto.randomUUID(),task:item,done:false};const done=()=>{if(current===version)complete();};
  try{
   if(item.taskEngine==='skeld'){const run=createSkeldTaskRun(item,done);machine=createSkeldTaskMachine(stage,run);status.textContent=SKELD_EXTRA_HINTS[run.state.mode]||taskExample(item)[1];}
   else if(item.taskEngine==='frost'||item.mapMode==='frost'){const run=createFrostTaskRun(item,done);machine=createFrostTaskMachine(stage,run,{onClose:close,onUnavailable(){status.textContent='表示できませんでした。「練習する」で再試行できます。';}});status.textContent='光っている設備を操作してみよう。';}
   else{
    const source=await createTaskTerminalDocument();if(current!==version||!dialog.open)return;frame=document.createElement('iframe');frame.title=item.name;frame.srcdoc=source;frame.addEventListener('load',openTerminal);stage.append(frame);status.textContent='端末を起動しています…';loadTimer=setTimeout(()=>{if(current!==version||active?.ready)return;stop();status.textContent='端末を起動できませんでした。「練習する」で再試行できます。';},20000);
   }
  }catch(e){status.textContent='練習を開けませんでした。「練習する」で再試行できます。';}
 }
 q('[data-start]').onclick=start;q('[data-repeat]').onclick=start;
 function openTerminal(){if(!frame||!active||mode!=='tasks'||active.openSent)return;active.openSent=true;frame.contentWindow.postMessage({type:'ss-task-terminal-open',id:active.id,index:terminalIndex(active.task),name:active.task.name,hue:.5,volume:api.volume?.()??.7},'*');}
 window.addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow)return;const data=event.data||{};if(mode==='roles'&&data.type==='ss-role-practice-exit'){close();return;}if(!active||mode!=='tasks')return;
  if(data.type==='ss-task-terminal-init')openTerminal();
  if(data.id!==active.id)return;if(data.type==='ss-task-terminal-ready'){active.ready=true;clearTimeout(loadTimer);loadTimer=0;status.textContent='操作してみよう。閉じるとロビーに戻れます。';}if(data.type==='ss-task-terminal-done')complete();if(data.type==='ss-task-terminal-cancel')close();
 });
 const button=document.createElement('button');button.type='button';button.id='poolPracticeBtn';button.textContent='タスク・役職練習';button.hidden=true;document.body.append(button);
 function open(){if(!api.available())return;api.pause?.();if(!dialog.open)dialog.showModal();populate();}button.onclick=open;
 const settings=document.querySelector('[data-settings-section="operation"]'),shortcut=document.createElement('button');shortcut.type='button';shortcut.textContent='プール横の練習設備';shortcut.onclick=()=>{if(api.available())open();};settings?.append(shortcut);
 return{open,close,sync(){const allowed=api.available();button.hidden=!allowed||!api.near();shortcut.disabled=!allowed;if(!allowed&&dialog.open)close();}};
}
