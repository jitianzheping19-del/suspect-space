// Exercise the shipped game with the existing in-memory Firebase fixture.
// No account, room, token, microphone or production database is used.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createServer}=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'tmp/runtime-lightening-shots');
const rejoin=fs.readFileSync(path.join(__dirname,'check-room-rejoin.cjs'),'utf8');
const fixtureDeclarations=rejoin.slice(rejoin.indexOf('const fakeDatabase='),rejoin.indexOf('(async()=>{'));
const {fakeDatabase,fixture}=vm.runInNewContext(fixtureDeclarations+'\n({fakeDatabase,fixture})');
const probes=`
window.__lighteningQA={
  async speaker(name,mic,speaking,enabled=true){
    game.settings.voiceEnabled=enabled;game.lobbySettings.voiceEnabled=enabled;await updateVoiceRoomGate();
    players[hostId].name=name;game.players[hostId].name=name;
    voiceRemoteStates.set(hostId,{joined:true,mic,speaking,micIntent:mic});
    clearTimeout(roleRevealTimer);clearTimeout(revealDelayTimer);pendingRoleReveal=null;
    document.getElementById('roleReveal').classList.add('hidden');
  },
  tag(){
    const a=avatars.get(hostId),tag=a.userData.nameTag,state=voiceDisplayState(hostId),name=players[hostId].name;
    const width=Math.min(5.1,2.5+name.length*.2),expected=label(name,'#f8fdff',width,false);
    drawMicOverlayOnNameTag(expected,name,'#f8fdff',state?.mic===false,!!state,state?.mic===true&&state?.speaking===true);
    const result={sprite:tag.uuid,material:tag.material.uuid,texture:tag.material.map.uuid,
      identicalCanvas:tag.material.map.image.toDataURL()===expected.material.map.image.toDataURL(),
      actualPNG:tag.material.map.image.toDataURL(),expectedPNG:expected.material.map.image.toDataURL(),
      state,forced:voiceForcedMuteReason(),enabled:voiceRoomIsEnabled(),remote:voiceRemoteStates.get(hostId),
      scale:tag.scale.toArray(),expectedScale:expected.scale.toArray(),key:a.userData.tagKey,
      expectedKey:(!state?'off':state.mic?(state.speaking?'speaking':'on'):'muted')+':'+name+':#f8fdff'};
    expected.material.map.dispose();expected.material.dispose();return result;
  },
  hiddenPalettes(){let calls=0;const original=nearestSuitColor;nearestSuitColor=(...a)=>{calls++;return original(...a)};try{renderAllColorPalettes();}finally{nearestSuitColor=original;}return calls;},
  burst(){return new Promise(resolve=>{let count=0;const original=renderAllColorPalettes;renderAllColorPalettes=()=>{count++;original()};for(let i=0;i<200;i++)safeRenderUI();requestAnimationFrame(()=>{renderAllColorPalettes=original;resolve(count)});});},
  map(mode){game.settings.mapMode=mode;setMapMode(mode);const spawn=findCafeteriaSpawn(0);position.x=spawn.x;position.z=spawn.z;
    for(const id of [uid,hostId]){players[id].x=spawn.x+(id===uid?0:1.5);players[id].z=spawn.z;game.players[id].x=players[id].x;game.players[id].z=players[id].z;const a=avatars.get(id);if(a)delete a.userData.remotePoseSamples;}
    lastSent={x:999,z:999,at:0};safeRenderUI();
  },
  sight(){return visibilityPass?{rays:visibilityPass.solver.result.count,checks:visibilityPass.solver.result.segmentChecks,previousChecks:visibilityPass.solver.result.naiveSegmentChecks}:null;}
};`;
(async()=>{
  const server=createServer((req,res)=>{
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  fs.mkdirSync(output,{recursive:true});const results=[];
  try {
    for(const [file,width,height] of [['index.html',1280,800],['space-suspect-complete.html',1024,768],['space-suspect-complete.html',844,390]]) {
      const page=await browser.newPage({viewport:{width,height},isMobile:width<1200,hasTouch:width<1200}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/firebase-database.js',r=>r.fulfill({body:fakeDatabase,contentType:'application/javascript'}));
      await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/,r=>r.abort());
      await page.route('**/'+file,r=>r.fulfill({body:fs.readFileSync(path.join(root,file),'utf8')
        .replace('function showMeetingIntro(reason)',fixture+probes+'\nfunction showMeetingIntro(reason)')
        .replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}',''),contentType:'text/html'}));
      await page.goto('http://127.0.0.1:'+server.address().port+'/'+file,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__lighteningQA,{timeout:90000});
      await page.evaluate(()=>window.__rejoinQA.load('2d'));await page.waitForTimeout(450);
      const hidden=await page.evaluate(()=>window.__lighteningQA.hiddenPalettes());assert.equal(hidden,0,'hidden palettes must not recompute suit colours');
      const burst=await page.evaluate(()=>window.__lighteningQA.burst());assert.equal(burst,1,'200 refreshes must coalesce into one palette pass');
      let identity;
      for(const [name,mic,speaking,enabled] of [
        ['ホスト',true,false,true],['ホスト',true,true,true],['ホスト',false,false,true],
        ['長いプレイヤー名の変更',true,true,true],['短い名',true,false,true],['短い名',false,false,false],['短い名',true,true,true]
      ]) {
        await page.evaluate(args=>window.__lighteningQA.speaker(...args),[name,mic,speaking,enabled]);
        await page.waitForFunction(()=>{const t=window.__lighteningQA.tag();return t.key===t.expectedKey;},{},{timeout:15000});
      const tag=await page.evaluate(()=>window.__lighteningQA.tag());
        const current=[tag.sprite,tag.material,tag.texture];
        if(identity)assert.deepEqual(current,identity,'mic/name changes recreated the sprite or GPU texture');else identity=current;
        if(!tag.identicalCanvas)for(const kind of ['actual','expected'])fs.writeFileSync(path.join(output,kind+'-label.png'),Buffer.from(tag[kind+'PNG'].split(',')[1],'base64'));
        assert(tag.identicalCanvas,'name or mic appearance differs from original renderer: '+JSON.stringify({key:tag.key,expected:tag.expectedKey,state:tag.state,forced:tag.forced,enabled:tag.enabled,remote:tag.remote,requested:[name,mic,speaking,enabled]}));
        assert.deepEqual(tag.scale,tag.expectedScale,'label sizing differs');
      }
      const maps=[];
      for(const map of ['classic','astra']) {
        await page.evaluate(map=>window.__lighteningQA.map(map),map);await page.waitForTimeout(500);
        const sight=await page.evaluate(()=>window.__lighteningQA.sight());assert(sight?.rays>=256);assert(sight.checks<=sight.previousChecks);
        await page.screenshot({path:path.join(output,file.replace('.html','')+'-'+width+'-'+map+'.png')});maps.push({map,...sight});
      }
      assert.deepEqual(errors,[]);results.push({file,viewport:[width,height],hiddenPaletteComputations:hidden,coalescedPalettePasses:burst,
        labelVariants:7,labelSpriteAndTextureReused:true,labelPixelsIdentical:true,maps,pageErrors:errors});
      console.log('PASS',file,width+'x'+height,'7 identical label variants, texture reuse, coalesced UI and both map masks');
      await page.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
