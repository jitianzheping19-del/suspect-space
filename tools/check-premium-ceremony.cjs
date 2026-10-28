const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out='/workspace/artifacts/premium-complete-2026-10-28';
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',r=>r.fulfill({path:'/workspace/emergency-3d-revision/three.module.js',contentType:'text/javascript'}));
  for(const [width,height]of[[390,844],[844,390],[1024,768],[1366,768]]){
   await page.setViewportSize({width,height});await page.goto('http://localhost:4173/suspect-space/gacha-preview.html');await page.waitForSelector('.gachaDraw:not(:disabled)');await page.locator('.gachaClose').click();await page.evaluate(()=>window.gachaPreview.open('premium'));await page.waitForSelector('.gachaDraw:not(:disabled)');
   const close=await page.locator('.gachaClose').boundingBox(),draw=await page.locator('.gachaDraw').boundingBox(),ten=await page.locator('.gachaPullTen').boundingBox();for(const b of[close,draw,ten])assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,JSON.stringify(b));
   await page.screenshot({path:`${out}/premium-idle-${width}.png`});await page.locator('.gachaDraw').click();await page.waitForSelector('.gachaPlanetTap:not([hidden])');
   for(let i=0;i<4;i++){await page.locator('.gachaPlanetTap').click();await page.waitForTimeout(300);}await page.screenshot({path:`${out}/premium-charge-${width}.png`});await page.locator('.gachaPlanetTap').click();await page.waitForTimeout(1650);await page.screenshot({path:`${out}/premium-break-${width}.png`});await page.waitForTimeout(850);await page.screenshot({path:`${out}/premium-reveal-${width}.png`});await page.waitForSelector('.gachaResult:not([hidden])');
   // An account reset during a second reveal cancels its promise and releases WebGL resources.
   await page.locator('.gachaClose').click();await page.evaluate(()=>window.gachaPreview.open('premium'));await page.waitForSelector('.gachaDraw:not(:disabled)');await page.locator('.gachaDraw').click();await page.waitForSelector('.gachaPlanetTap:not([hidden])');await page.evaluate(()=>window.gachaPreview.reset());await page.evaluate(()=>window.gachaPreview.open('normal'));await page.waitForSelector('.gachaDraw:not(:disabled)');assert.equal(await page.locator('.gachaStage>canvas').evaluate(c=>c.getContext('webgl2').isContextLost()),false);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForSelector('.gachaDraw:not(:disabled)');await page.locator('.gachaDraw').click();await page.waitForSelector('.gachaPlanetTap:not([hidden])');await page.locator('.gachaPlanetTap').click();await page.waitForSelector('.gachaResult:not([hidden])',{timeout:4000});
  // Instanced aura buffers require explicit Mesh.dispose, beyond geometry/material cleanup.
  await page.goto('http://localhost:4173/suspect-space/gift-skins-preview.html?collection=tailored');await page.waitForFunction(()=>window.giftSkinPreview);
  const disposal=await page.evaluate(()=>{const p=window.giftSkinPreview;let expected=0,actual=0;for(const option of document.querySelectorAll('#skin option')){p.select(option.value);p.active.group.traverse(o=>{if(o.isInstancedMesh){expected++;o.addEventListener('dispose',()=>actual++);}});}p.select('abyssdiver');return{expected,actual};});assert.equal(disposal.expected,20);assert.equal(disposal.actual,20);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/ceremony-report.json',JSON.stringify({sizes:[390,844,1024,1366],reducedMotion:true,resetDuringReveal:true,instancedDisposal:disposal,errors},null,2));console.log('PASS premium charge/break/reveal at four viewports, controls fit, account reset during reveal/reopen, reduced motion and all twenty instanced aura disposals');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
