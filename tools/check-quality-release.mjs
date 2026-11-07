// Local release gate. Builds and checks an isolated copy; never publishes it.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'tmp/quality-release');await mkdir(out,{recursive:true});
const checks=[
 ...(process.argv.includes('--skip-build')?[]:[['build','npm',['run','build']]]),
 ...['check-game-entrypoints.cjs','check-login-initial-state.mjs','check-quality-state.mjs','check-host-recovery.mjs',
 'check-round-state.mjs','check-lobby-loading.cjs','check-lobby-preload-recovery.cjs',
 'check-input-quality.cjs','check-comfort-ui.cjs','check-motion-preference.mjs','check-playtest-recorder.mjs',
 'check-victory-priority.mjs','check-bot-evidence.mjs','check-release-artifact.mjs','check-quality-flow.cjs','check-modal-freeze.cjs','check-update-gift-ui.cjs',
 'check-gacha-economy.mjs','check-costume-ownership.mjs','check-pose-bandwidth.cjs','check-built-startup.cjs',
 'check-interaction-feedback.mjs','check-interaction-continued.mjs','check-interaction-lifecycle.cjs','check-meeting-intro-preload.cjs','check-built-interaction.cjs',
 'check-selected-features.mjs','check-photo-poses.mjs','check-selected-ui.cjs','check-curve-touch.cjs','check-collection-extras.cjs','check-lobby-photo-ui.cjs','check-built-practice.cjs','check-room-exit-screen.cjs']
 .map(name=>[name,process.execPath,['tools/'+name]])
];
const results=[];
for(const [name,command,args]of checks){
 console.log('RUN',name);const start=Date.now();let output='';
 const child=spawn(command,args,{cwd:root,env:process.env,stdio:['ignore','pipe','pipe'],detached:true});
 child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
 let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGTERM');}catch{}},180000);
 const status=await new Promise(resolve=>{child.once('error',error=>{output+=error.stack;resolve(1);});child.once('exit',code=>resolve(code??1));});
 clearTimeout(timer);await writeFile(path.join(out,name+'.log'),output);
 results.push({name,status,timedOut,elapsedMs:Date.now()-start});
 await writeFile(path.join(out,'results.json'),JSON.stringify({published:false,results},null,2)+'\n');
 console.log(status===0?'PASS':'FAIL',name);
 if(status!==0){console.error(output.slice(-6000));process.exitCode=1;break;}
}
