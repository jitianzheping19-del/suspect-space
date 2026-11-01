const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{createServer}=require('http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/golden-legend-2026-10-30');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const stats=[];
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1100,height:800},hasTouch:mobile,isMobile:mobile}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
   await page.route(/https:\/\/cdn.jsdelivr.net\/npm\/three@[^/]+\/build\/three.module.js/,r=>r.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript'}));
   await page.goto(base+'/gift-skins-preview.html?skin=obsidianwyrm');await page.waitForFunction(()=>window.giftSkinPreview);
   const ids=await page.evaluate(async()=>{const {GOLDEN_GIFT_SKINS}=await import('./premium-golden-skins.js');return GOLDEN_GIFT_SKINS.map(s=>s.id);});
   assert.equal(await page.locator('#skin option').count(),48);
   for(const id of ids){
    await page.evaluate(id=>{giftSkinPreview.select(id);giftSkinPreview.renderAt(4.2,{pose:'walk',yaw:.28});},id);
    const s=await page.evaluate(()=>giftSkinPreview.stats());assert(s.finite,id);assert(s.meshes<=16,id+' draw budget');assert(s.triangles<6000,id+' geometry budget');stats.push({id,mobile,...s});
    await page.screenshot({path:path.join(out,(mobile?'phone-':'')+id+'.png')});
    await page.evaluate(()=>{giftSkinPreview.setContext('lobby');giftSkinPreview.renderAt(4.7,{pose:'jump',yaw:-.4});});assert((await page.evaluate(()=>giftSkinPreview.stats())).finite);await page.evaluate(()=>giftSkinPreview.setContext('game'));
   }
   await page.goto(base+'/gacha-preview.html');await page.waitForFunction(()=>window.gachaPreview);
   await page.evaluate(async()=>{gachaPreview.close();await gachaPreview.open('premium');});
   await page.locator('.gachaRates summary').click();assert((await page.locator('.gachaRates').innerText()).includes('20%'));await page.locator('.gachaRates summary').click();
   await page.locator('.gachaDraw').click();await page.waitForSelector('.gachaPlanetTap:not([hidden])');
   for(let i=0;i<6;i++){await page.locator('.gachaPlanetTap').click();await page.waitForTimeout(310);}
   assert.equal(await page.locator('.ssGacha').getAttribute('data-max-rank'),'5');
   await page.waitForSelector('.goldenLegendTitle:not([hidden])');
   await page.waitForTimeout(450);await page.screenshot({path:path.join(out,(mobile?'phone-':'')+'golden-gate.png')});
   await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,(mobile?'phone-':'')+'golden-hero.png')});
   await page.waitForSelector('.gachaResult:not([hidden])',{timeout:15000});assert.equal(await page.locator('.gachaResult>small').textContent(),'ゴールデンレジェンドレア');
   assert.equal(await page.locator('.gachaResult').getAttribute('data-rarity'),'5');
   await page.locator('.gachaClose').click();assert.equal(await page.locator('.goldenLegendTitle').count(),0,'closing destroys the effect');
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>gachaPreview.open('premium'));await page.locator('.gachaDraw').click();
   for(let i=0;i<6;i++){await page.locator('.gachaPlanetTap').click();await page.waitForTimeout(310);}await page.waitForSelector('.gachaResult:not([hidden])');
   assert.deepEqual(errors,[]);await page.close();console.log('PASS',mobile?'phone':'desktop','10 finite low-cost models in game/lobby, golden gates, sixth rarity, result, disposal and reduced motion');
  }
  fs.writeFileSync(path.join(out,'render-stats.json'),JSON.stringify(stats,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
