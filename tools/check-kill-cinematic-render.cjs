// Run the source preview from a local HTTP server, after exporting its assets:
// node tools/export-kill-preview-assets.mjs
// node tools/check-kill-cinematic-render.cjs http://127.0.0.1:4173
// Uses Playwright; all diagnostics are injected by this test, never shipped.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const output=process.env.KILL_QA_DIR||'/tmp/space-suspect-kill-qa';
const base=process.argv[2]||'http://127.0.0.1:4173';

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/kill-originals.json',r=>r.fulfill({path:path.join(root,'public/kill-originals.json'),contentType:'application/json'}));
    await page.route('**/authored-kill-player.js',r=>{
      let source=fs.readFileSync(path.join(root,'authored-kill-player.js'),'utf8');
      source=source.replace('resize();controller.step(0,0);','window.__killQA={get role(){return configuration.role;},get duration(){return configuration.duration;},get time(){return time;},get renderer(){return renderer;},get controller(){return controller;}};resize();controller.step(0,0);');
      return r.fulfill({body:source,contentType:'text/javascript'});
    });
    await page.goto(base+'/kill-animation-preview.html');
    await page.waitForFunction(()=>window.SpaceSuspectVictimPreview,{timeout:90000});
    const frame=()=>page.frames().find(f=>f.url()==='about:srcdoc');
    async function role(id){
      await page.selectOption('#rolePicker',id);
      await frame().waitForFunction(id=>window.__killQA?.role===id,id);
    }
    async function seek(t){
      await page.evaluate(t=>window.SpaceSuspectVictimPreview.seek(1.5+t),t);
      await frame().waitForFunction(t=>Math.abs(window.__killQA.time-t)<.002,t);
    }
    const roles=await page.locator('#rolePicker option').evaluateAll(nodes=>nodes.map(n=>n.value));
    assert(roles.includes('triggerHappy'),'Machine gun kills have their own cinematic');
    const memory=[];
    for(const id of roles){
      await role(id);await seek(0);
      const initial=await frame().evaluate(()=>{
        const qa=window.__killQA,[a,b]=qa.controller.actors;
        qa.controller.render();const gl=qa.renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        return {attacker:a.suit.color.getHexString(),victim:b.suit.color.getHexString(),cornerAlpha:pixel[3],canvases:document.querySelectorAll('canvas').length,
          reflection:b.visor.parent.children.filter(o=>o.material?.userData.cinematicTransparent).every(o=>o.material.transparent),
          umbrella:a.torso.children.some(o=>o.geometry?.type==='ConeGeometry'),duration:qa.duration};
      });
      assert.equal(initial.attacker,'ee5368',id+' preserves the attacker colour');
      assert.equal(initial.victim,'46c4e6',id+' preserves the victim colour');
      assert.equal(initial.cornerAlpha,0,id+' has transparent canvas corners');
      assert(initial.reflection,id+' keeps the visor overlay transparent');
      assert.equal(initial.canvases,1,'One shared cinematic WebGL canvas');
      if(id==='viper')assert(!initial.umbrella,'Viper has no placeholder cone hat');
      await seek(initial.duration*.53);
      if(id==='viper')assert(await frame().evaluate(()=>window.__killQA.controller.actors[1].body.material.isMeshPhysicalMaterial),'Viper keeps the actual suit shading during corrosion');
      const invalid=await frame().evaluate(()=>{
        const bad=[];window.__killQA.controller.scene.traverse(o=>{if(o.isMesh&&o.matrixWorld.elements.some(n=>!Number.isFinite(n)))bad.push(o.name||o.type);});return bad;
      });assert.deepEqual(invalid,[],id+' has finite animated transforms');
      await page.locator('#previewStage').screenshot({path:path.join(output,id+'.png')});
      memory.push({role:id,...await frame().evaluate(()=>({...window.__killQA.renderer.info.memory}))});
      assert(!(await page.locator('#viewDescription').textContent()).includes('読み込めません'));
      console.log('PASS',id);
    }
    // The five public abilities animate inside the room, without opening the
    // victim's screen overlay for either the attacker or a nearby witness.
    for(const id of ['samurai','suicideBomber','waveCannon','slugger','penguin']){
      await role(id);
      for(const view of ['attacker','witness']){
        await page.locator('[data-view="'+view+'"]').click();await seek(.25);
        const state=await page.evaluate(()=>window.SpaceSuspectVictimPreview.getState());
        assert(state.publicRole&&state.publicEffects>0,id+' has an in-world animation');
        assert(!state.corpseVisible&&!state.worldVictimVisible,id+' replaces the target with its animated matching model first');
        assert.equal(await page.locator('#authoredStage iframe').evaluate(n=>n.style.visibility),'hidden');
        if(view==='witness')await page.locator('#previewStage').screenshot({path:path.join(output,id+'-witness.png')});
        await seek(1.5);assert((await page.evaluate(()=>window.SpaceSuspectVictimPreview.getState())).corpseVisible);
        await seek(.1);assert(!(await page.evaluate(()=>window.SpaceSuspectVictimPreview.getState())).corpseVisible,'Backward seeking replays public effects');
      }
    }
    await page.locator('[data-view="victim"]').click();await role('sheriff');
    await page.locator('#misfire').check();
    // A reflected knife kills the caster and leaves the selected civilian alive.
    await frame().waitForFunction(()=>window.__killQA?.role==='sheriff');await seek(1.85);
    assert(await frame().evaluate(()=>{const [a,b]=window.__killQA.controller.actors;return a.rig.rotation.x>.5&&Math.abs(b.rig.rotation.x)<.01;}));
    await page.locator('#previewStage').screenshot({path:path.join(output,'sheriff-misfire.png')});
    await role('vampire');await seek(.2);
    const close=await frame().evaluate(()=>window.__killQA.controller.actors[0].root.position.x);
    await seek(1.4);assert(await frame().evaluate(x=>window.__killQA.controller.actors[0].root.position.x<x-1,close));
    await seek(2.85);assert(await frame().evaluate(()=>window.__killQA.controller.actors[1].rig.rotation.x<-.5));
    await role('suicideBomber');await seek(1.8);
    assert(await frame().evaluate(()=>window.__killQA.controller.actors[0].rig.rotation.x>1),'Bomber itself dies in the clip');

    // Other roles preserve the immediate-corpse policy for ordinary viewers.
    await role('triggerHappy');
    for(const view of ['attacker','witness']){
      await page.locator('[data-view="'+view+'"]').click();
      await page.evaluate(()=>window.SpaceSuspectVictimPreview.seek(1.51));
      const state=await page.evaluate(()=>window.SpaceSuspectVictimPreview.getState());
      assert(state.corpseVisible&&!state.worldVictimVisible&&!state.ghostVisible);
      assert.equal(await page.locator('#authoredStage iframe').evaluate(n=>n.style.visibility),'hidden');
    }
    await page.locator('[data-view="victim"]').click();
    for(const viewport of [{width:844,height:390},{width:1024,height:768}]){
      await page.setViewportSize(viewport);await role('samurai');await seek(.8);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal mobile overflow');
      await page.locator('#previewStage').screenshot({path:path.join(output,'samurai-'+viewport.width+'.png')});
      const clipped=await frame().evaluate(()=>{
        const {camera,actors}=window.__killQA.controller;camera.updateMatrixWorld(true);
        return actors.slice(0,2).some(a=>{const p=a.root.position.clone();p.y+=1;return Math.abs(p.project(camera).x)>.96;});
      });assert(!clipped,'Both subjects fit on '+viewport.width+'px');
    }
    // Repeatedly switching scenes must free the old GPU allocations.
    await role('impostor');await seek(1.4);
    const before=await frame().evaluate(()=>({...window.__killQA.renderer.info.memory}));
    for(const id of ['arsonist','viper','rocket','impostor']){await role(id);await seek(id==='impostor'?1.4:.8);}
    const after=await frame().evaluate(()=>({...window.__killQA.renderer.info.memory}));
    assert(after.geometries<=before.geometries+3,'Scene switches do not accumulate geometry');
    assert(after.textures<=before.textures+2,'Scene switches do not accumulate textures');
    assert.deepEqual(errors,[],'No browser, shader, or WebGL errors');
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({roles,memory,before,after,errors},null,2));
    console.log('PASS: identity, alpha, shared renderer, finite poses, five public abilities, sheriff knife ricochet, vampire delayed collapse, self destruction, viewer separation, mobile framing, GPU cleanup');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
