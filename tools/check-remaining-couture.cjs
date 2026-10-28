const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out='/workspace/artifacts/premium-couture-remaining';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname).replace(/^\/suspect-space\//,'/');if(relative==='/favicon.ico')return res.writeHead(204).end();const file=path.resolve(root,'.'+relative);if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});const reports=[],errors=[];
 try{
  for(const mobile of[false,true]){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1024,height:768},hasTouch:mobile,isMobile:mobile});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',r=>r.fulfill({path:'/workspace/emergency-3d-revision/three.module.js',contentType:'text/javascript'}));
   await page.goto(`http://127.0.0.1:${server.address().port}/suspect-space/gift-skins-preview.html?collection=remaining`);await page.waitForFunction(()=>window.giftSkinPreview);
   const ids=await page.locator('#skin option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.equal(ids.length,15);
   for(const rig of['game','lobby'])for(const id of ids){
    await page.evaluate(({id,rig})=>{const p=window.giftSkinPreview;p.setContext(rig);p.select(id);p.renderAt(2.7,{pose:'walk',yaw:.38});},{id,rig});
    const state=await page.evaluate(()=>{const p=window.giftSkinPreview,s=p.stats();let instances=0,animatedFinite=true;const materialIds=new Set();p.active.group.traverse(n=>{if(n.isInstancedMesh){instances+=n.count;for(const x of n.instanceMatrix.array)if(!Number.isFinite(x))animatedFinite=false;}for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)materialIds.add(m.uuid);});return{...s,instances,animatedFinite,materials:materialIds.size,finish:p.active.group.getObjectByName('tailored-sculpt').userData.coutureFinish,floor:!!p.active.group.getObjectByName('couture-aura-floor-'+p.active.spec.id)};});
    assert(state.finite&&state.animatedFinite,id);assert.equal(state.finish,1);assert(state.floor,id+' missing signature aura');assert.equal(state.bindings.length,4);assert(state.bindings.every(b=>b.error<1e-6&&b.rotationError<1e-6),id+' limb drift');assert(state.meshes<=70,id+' excessive draw calls: '+state.meshes);assert(state.triangles<70000,id+' geometry budget: '+state.triangles);
    const timings=await page.evaluate(()=>{const p=window.giftSkinPreview,g=p.active.group.getObjectByName('tailored-signature-'+p.active.spec.id),material=p.active.group.getObjectByName('couture-aura-floor-'+p.active.spec.id).material;const before=Array.from(g.instanceMatrix.array);p.renderAt(3.1,{pose:'jump',yaw:0});return{changed:before.some((n,i)=>n!==g.instanceMatrix.array[i]),time:material.uniforms.time.value};});assert(timings.changed);assert.equal(timings.time,3.1);
    const face=await page.evaluate(async()=>{const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'),p=window.giftSkinPreview;p.renderAt(4.2,{pose:'idle',yaw:0});const ray=new T.Raycaster(),glass=p.character.userData.visor;return[[0,glass.position.y],[-.19,glass.position.y],[.19,glass.position.y],[0,glass.position.y+.13]].map(([x,y])=>{ray.set(new T.Vector3(x,y,4),new T.Vector3(0,0,-1));const hit=ray.intersectObject(p.character,true).find(h=>h.object.material?.transparent!==true);return hit?.object===glass||hit?.object.material?.color?.getHex()===0xe4faff;});});assert(face.every(Boolean),id+' face obstructed');
    const faded=await page.evaluate(()=>{const p=window.giftSkinPreview,shaders=[];p.active.group.traverse(n=>{const m=n.material;if(m?.uniforms?.coutureOpacity){const old=m.opacity;m.opacity=.23;shaders.push({m,old});}});p.renderAt(4.3,{pose:'idle',yaw:0});const correct=shaders.length>0&&shaders.every(({m})=>m.uniforms.coutureOpacity.value===.23);for(const{m,old}of shaders)m.opacity=old;return correct;});assert(faded,id+' ghost opacity');
    if(!mobile&&rig==='game'){
     const clean=await page.addStyleTag({content:'header,aside,nav,.views,.dragHint{display:none!important}'});
     for(const[view,yaw]of[['quarter',.45],['front',0],['back',Math.PI]]){await page.evaluate(yaw=>window.giftSkinPreview.renderAt(4.2,{pose:'idle',yaw}),yaw);await page.screenshot({path:`${out}/${id}-${view}.png`});}
     await clean.evaluate(node=>node.remove());
    }
    reports.push({id,rig,mobile,...state});
   }
   // Repeat the same outfit after switching through the whole collection.
   await page.evaluate(()=>{const p=window.giftSkinPreview;p.select('streetdj');p.renderAt(6);});const baseline=await page.evaluate(()=>window.giftSkinPreview.stats());
   for(const id of ids)await page.evaluate(id=>{const p=window.giftSkinPreview;p.select(id);p.renderAt(6.1);},id);
   await page.evaluate(()=>{const p=window.giftSkinPreview;p.select('streetdj');p.renderAt(6.2);});const after=await page.evaluate(()=>window.giftSkinPreview.stats());assert.equal(after.textures,baseline.textures);assert.equal(after.geometries,baseline.geometries);assert.equal(await page.evaluate(()=>window.giftSkinPreview.character.getObjectsByProperty('name','signature-aura').length),1);
   await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));console.log('PASS 15 couture skins × game/lobby × desktop/mobile: original visor, bound limbs, animated auras, budgets and switch disposal');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
