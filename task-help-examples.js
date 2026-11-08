import {AIRSHIP_TASK_HINTS} from './airship-tasks.js';
import {classicTaskIndex} from './task-terminal-document.js';
const terminalIndex=classicTaskIndex;
const examples=[['同じ色をつなぐ','左の端子を押し、同じ色の右の端子まで動かして離す。'],['転送を開始','開始ボタンを押し、ゲージが満ちるまで待つ。'],['コードを入力','画面に示された数字を、順番に押す。'],['針を合わせる','緑の範囲へ針を合わせ、指定の位置で確定する。'],['検査を続ける','指定された検査部分を押し、進行ゲージを確認する。'],['カードを通す','カードをつかみ、速すぎない一定の速さで読み取り部へ動かす。'],['燃料をためる','指定のボタンを押し続け、満タンになったら離す。']];
export function taskExample(task){if(task.taskEngine==='airship')return [task.name,AIRSHIP_TASK_HINTS[task.mode]];return examples[terminalIndex(task)]||examples[0];}
