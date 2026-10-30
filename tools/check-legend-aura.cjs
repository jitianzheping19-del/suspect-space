const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{createServer}=require('http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/legend-aura-2026-10-30');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),stats=[];
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1100,height:800},hasTouch:mobile,isMobile:mobile}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
  await page.route(/https:\/\/cdn.jsdelivr.net\/npm\/three@[^/]+\/build\/three.module.js/,r=>r.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/gift-skins-preview.html?collection=legend-aura');await page.waitForFunction(()=>window.giftSkinPreview);
  const ids=await page.locator('#skin option').evaluateAll(options=>options.map(o=>o.value));assert.equal(ids.length,10);assert.equal(new Set(ids).size,10);
  for(const id of ids){
   await page.evaluate(id=>{giftSkinPreview.select(id);giftSkinPreview.renderAt(4.2,{pose:'walk',yaw:.28});},id);
   const s=await page.evaluate(()=>{
    const p=giftSkinPreview,aura=p.active.group.getObjectByName('signature-aura'),particles=aura.children.find(o=>o.isPoints);
    const read=()=>{const gl=p.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
    p.setAura(false);const off=read();p.setAura(true);const on=read();let auraPixels=0;for(let i=0;i<off.length;i+=4)if(Math.abs(off[i]-on[i])+Math.abs(off[i+1]-on[i+1])+Math.abs(off[i+2]-on[i+2])>20)auraPixels++;
    const m=particles.material;m.opacity=.25;p.renderAt(4.2);const fade=m.uniforms.fade.value;m.opacity=1;p.renderAt(4.2);
    return{...p.stats(),id:p.active.spec.id,rarity:p.active.spec.rarity,variant:aura.userData.variant,particleCount:particles.geometry.attributes.seed.count,auraPixels,fade};
   });
   assert.equal(s.id,id);assert.equal(s.rarity,4);assert(s.finite,id);assert(s.meshes<=24,id+' draw budget '+s.meshes);assert(s.triangles<10000,id+' geometry budget');assert.equal(s.particleCount,mobile?18:30);assert(s.auraPixels>40,id+' aura must be visible');assert.equal(s.fade,.25,'aura respects ghost/fade opacity');stats.push({mobile,...s});
   await page.screenshot({path:path.join(out,(mobile?'phone-':'')+id+'.png')});
   await page.evaluate(()=>{giftSkinPreview.setContext('lobby');giftSkinPreview.renderAt(4.7,{pose:'jump',yaw:-.4});});assert((await page.evaluate(()=>giftSkinPreview.stats())).finite);await page.evaluate(()=>giftSkinPreview.setContext('game'));
  }
  const memory=await page.evaluate(ids=>{const p=giftSkinPreview;p.select(ids[0]);p.renderAt(4);const before=p.stats();for(const id of [...ids,...ids]){p.select(id);p.renderAt(4);}p.select(ids[0]);p.renderAt(4);const after=p.stats();return{before,after};},ids);
  assert.equal(memory.after.geometries,memory.before.geometries,'switching must release old geometries');assert.equal(memory.after.textures,memory.before.textures,'switching must release textures');
  await page.emulateMedia({reducedMotion:'reduce'});const stable=await page.evaluate(()=>{giftSkinPreview.select('infernophoenix');giftSkinPreview.renderAt(2,{pose:'idle'});const aura=giftSkinPreview.active.group.getObjectByName('signature-aura');giftSkinPreview.renderAt(6);return aura.children[0].material.uniforms.time.value;});assert.equal(stable,0);
  await page.goto('http://127.0.0.1:'+server.address().port+'/gacha-preview.html');await page.waitForFunction(()=>window.gachaPreview);await page.evaluate(async()=>{gachaPreview.close();await gachaPreview.open('premium');});await page.locator('.gachaRates summary').click();const rates=await page.locator('.gachaRateCounts').innerText();assert(rates.includes('20%（18種類）'));assert(rates.includes('80%（30種類）'));
  assert.deepEqual(errors,[]);await page.close();console.log('PASS',mobile?'phone':'desktop','10 distinct legend models, visible themed auras, movement, ghost fade, bounded geometry, disposal, reduced motion and 20/80 rates');
 }
 fs.writeFileSync(path.join(out,'render-stats.json'),JSON.stringify(stats,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
