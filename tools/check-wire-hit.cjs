const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('task-terminal-document.js','utf8');
const start=source.indexOf('  "/* ================= 1. WIRING'),end=source.indexOf('  "/* ================= 2. DATA',start);
const lines=source.slice(start,end).trim().split('\n').map(line=>JSON.parse(line.trim().replace(/,$/,''))).join('\n');
const ctx=vm.createContext({Math:Object.assign(Object.create(Math),{random:()=>.5})});
vm.runInContext('const COL={red:1,blue:2,yellow:3,pink:4},tasks=[],tone=()=>{};'+lines+';globalThis.task=tasks[0];',ctx);
const task=ctx.task;task.init();task.down(97,112);task.move(485,174);task.up();assert(!task.done,'wrong color cannot complete');
for(let i=0;i<4;i++){task.down(97,112+i*62);task.move(485,112+i*62);task.up();if(i<3)assert(!task.done);}
assert(task.done,'all four wires can be grabbed and released 35px horizontally from the visible connectors');
console.log('PASS widened wiring connector hits and wrong-color rejection');
