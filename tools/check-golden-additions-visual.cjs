const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/golden-additions');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});const stats=[];let specs=[];
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:620,height:640},hasTouch:mobile,isMobile:mobile}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
   await page.route(/https:\/\/cdn.jsdelivr.net\/npm\/three@[^/]+\/build\/three.module.js/,r=>r.fulfill({path:path.join(root,'node_modules/three/build/three.module.js'),contentType:'application/javascript'}));
   await page.goto(base+'/gift-skins-preview.html?skin=auroraphoenix');await page.waitForFunction(()=>window.giftSkinPreview);
   specs=await page.evaluate(async()=>{const {GOLDEN_GIFT_SKINS}=await import('./premium-golden-skins.js');return GOLDEN_GIFT_SKINS.slice(-10).map(s=>({id:s.id,name:s.name}));});
   assert.equal(await page.locator('#skin option').count(),98);
   let warm;
   for(let round=0;round<2;round++){
    for(const {id}of specs){
     await page.evaluate(id=>{giftSkinPreview.select(id);giftSkinPreview.renderAt(2.2,{pose:'walk',yaw:.24});},id);
     const result=await page.evaluate(()=>giftSkinPreview.stats());assert(result.finite);assert(result.meshes<=22&&result.triangles<14000,JSON.stringify({id,...result}));
     assert.equal(await page.locator('#skin').inputValue(),id);assert.equal(await page.locator('.edition').innerText(),'GOLDEN LEGEND RARE');
     if(round===0){stats.push({id,mobile,...result});const clean=await page.addStyleTag({content:'header,aside,nav,.views,.dragHint{display:none!important}'});await page.screenshot({path:path.join(out,(mobile?'mobile-':'')+id+'.png')});await clean.evaluate(n=>n.remove());}
     await page.evaluate(()=>{giftSkinPreview.setContext('lobby');giftSkinPreview.renderAt(3.2,{pose:'jump',yaw:-.35});});assert((await page.evaluate(()=>giftSkinPreview.stats())).finite);await page.evaluate(()=>giftSkinPreview.setContext('game'));
    }
    const memory=await page.evaluate(()=>giftSkinPreview.stats());if(round===0)warm=memory;else{assert.equal(memory.textures,warm.textures);assert.equal(memory.geometries,warm.geometries,'repeated switches release old geometry');}
   }
   await page.emulateMedia({reducedMotion:'reduce'});
   for(const {id}of specs){const still=await page.evaluate(id=>{giftSkinPreview.select(id);const sample=t=>{giftSkinPreview.renderAt(t,{pose:'idle',yaw:0});const values=[];giftSkinPreview.active.group.traverse(n=>values.push(...n.matrixWorld.elements));return values;};return JSON.stringify(sample(0))===JSON.stringify(sample(5));},id);assert(still,id+' honors reduced motion');}
   assert.deepEqual(errors,[]);await page.close();console.log('PASS',mobile?'mobile':'desktop','all 10 selections, walk/jump in game/lobby, switch cleanup and reduced motion');
  }
  fs.writeFileSync(path.join(out,'stats.json'),JSON.stringify(stats,null,2));
  const page=await browser.newPage({viewport:{width:1500,height:800}});
  await page.setContent('<body style="margin:0;background:#070c16;display:grid;grid-template-columns:repeat(5,300px);font:15px system-ui;color:#ffe4a5">'+specs.map(s=>`<figure style="margin:0;position:relative;height:400px;overflow:hidden"><img src="${base}/verification/golden-additions/${s.id}.png" style="width:360px;height:372px;position:absolute;left:-30px;top:0;object-fit:cover"><figcaption style="position:absolute;bottom:0;left:0;right:0;padding:14px 2px;background:#070c16;text-align:center">${s.name}</figcaption></figure>`).join('')+'</body>');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:path.join(out,'collection.png')});await page.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
