const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const out='/workspace/artifacts/premium-complete-2026-10-28/skins';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',r=>r.fulfill({path:'/workspace/emergency-3d-revision/three.module.js',contentType:'text/javascript'}));
  await page.goto('http://localhost:4173/suspect-space/gift-skins-preview.html?collection=tailored');await page.waitForFunction(()=>window.giftSkinPreview);
  assert.equal(await page.locator('#skin option').count(),20);
  const ids=await page.locator('#skin option').evaluateAll(o=>o.map(x=>x.value)),rows=[];
  for(const context of['game','lobby'])for(const id of ids){
   await page.evaluate(({id,context})=>{const p=window.giftSkinPreview;p.setContext(context);p.select(id);p.renderAt(2.6,{pose:'walk',yaw:.38});},{id,context});
   const stats=await page.evaluate(()=>window.giftSkinPreview.stats());assert(stats.finite,id);assert.equal(stats.tailored,3);assert.equal(stats.bindings.length,4,id+' limb bindings');assert(stats.bindings.every(b=>b.attached&&b.error<1e-6&&b.rotationError<1e-6),id+' fitted pose');assert(stats.meshes<65,id+' draw budget '+stats.meshes);assert(stats.triangles<65000,id+' triangle budget '+stats.triangles);
   for(const [view,yaw]of[['front',0],['quarter',.45],['back',Math.PI]]){await page.evaluate(yaw=>window.giftSkinPreview.renderAt(4.2,{pose:'idle',yaw}),yaw);await page.screenshot({path:`${out}/${id}-${context}-${view}.png`});}
   const face=await page.evaluate(async()=>{const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'),p=window.giftSkinPreview;p.renderAt(4.2,{pose:'idle',yaw:0});const ray=new T.Raycaster(),glass=p.character.userData.visor,results=[];for(const [x,y]of[[0,glass.position.y],[-.19,glass.position.y],[.19,glass.position.y],[0,glass.position.y+.13]]){ray.set(new T.Vector3(x,y,4),new T.Vector3(0,0,-1));const hits=ray.intersectObject(p.character,true).filter(h=>h.object.material?.transparent!==true);results.push(hits[0]?.object===glass||hits[0]?.object.material?.color?.getHex()===0xe4faff);}return results;});assert(face.every(Boolean),id+' visor occluded '+face);rows.push({id,context,...stats});
  }
  for(const [width,height]of[[390,844],[844,390],[1366,768]]){await page.setViewportSize({width,height});await page.evaluate(()=>window.giftSkinPreview.renderAt(4.2,{pose:'idle',yaw:.38}));await page.screenshot({path:`${out}/preview-${width}.png`});const canvas=await page.locator('canvas').boundingBox();assert.equal(canvas.width,width);assert.equal(canvas.height,height);}
  // Subsequent outfits must not retain the previous aura, pose bindings or GPU textures.
  await page.evaluate(()=>{const p=window.giftSkinPreview;p.select('abyssdiver');p.renderAt(5);});const before=await page.evaluate(()=>window.giftSkinPreview.stats());
  for(let i=0;i<40;i++)await page.evaluate(id=>{const p=window.giftSkinPreview;p.select(id);p.renderAt(5.1);},ids[i%20]);
  await page.evaluate(()=>{const p=window.giftSkinPreview;p.select('abyssdiver');p.renderAt(5.2);});const after=await page.evaluate(()=>window.giftSkinPreview.stats());assert.equal(after.textures,before.textures);assert.equal(after.geometries,before.geometries);assert.equal(await page.evaluate(()=>window.giftSkinPreview.character.getObjectsByProperty('name','signature-aura').length),1);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify(rows,null,2));fs.writeFileSync(out+'/checks.json',JSON.stringify(rows,null,2));console.log('PASS twenty fitted premium skins: 2 real avatar sizes, visible visor, bound limbs, 3 views, phone/desktop and switch disposal');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
