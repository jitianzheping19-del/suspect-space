const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const {SOCCER_GUIDE,soccerGuidePhotos}=await import('../lobby-soccer-guide.js');
 for(const [id]of SOCCER_GUIDE)for(const photo of soccerGuidePhotos(id)){const bytes=fs.readFileSync('public/'+photo.src);assert(bytes.length>3000);assert.equal(bytes.readUInt16BE(0),0xffd8,'valid JPEG');}
 const bundle=await build({entryPoints:['lobby-soccer-guide.js'],bundle:true,write:false,format:'iife',globalName:'Guide'});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local').pathname;const file=path.join(process.cwd(),'public',url.replace(/^\/suspect-space\//,''));if(url.startsWith('/suspect-space/tutorial/soccer/')&&fs.existsSync(file)){res.writeHead(200,{'Content-Type':file.endsWith('.jpg')?'image/jpeg':'video/mp4'});fs.createReadStream(file).pipe(res);}else{res.writeHead(200,{'Content-Type':'text/html'});res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><body>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
   const page=await browser.newPage({viewport,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/suspect-space/');await page.addStyleTag({content:fs.readFileSync('lobby-soccer-match.css','utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});
   await page.evaluate(()=>{
    window.actualPlay=HTMLMediaElement.prototype.play;window.playMode='reject';window.pending=[];window.notices=[];window.mediaEvents=[];
    HTMLMediaElement.prototype.play=function(){if(playMode==='reject')return Promise.reject(new DOMException('Playback unavailable','NotAllowedError'));if(playMode==='stall')return new Promise(()=>{});if(playMode==='deferred')return new Promise((resolve,reject)=>pending.push({resolve,reject}));return actualPlay.call(this).catch(e=>{mediaEvents.push([e.name,e.message]);throw e;});};
    window.guide=Guide.createSoccerGuide({document,window,onOpen:open=>notices.push(open)});guide.update(true);
   });
   await page.locator('#soccerTutorialBtn').tap();await page.waitForSelector('.soccerGuidePhotos:not([hidden])');
   assert.equal(await page.locator('video').isVisible(),false);assert((await page.locator('.soccerGuideVideoError').innerText()).includes('写真'));
   for(const [id,category]of SOCCER_GUIDE){await page.getByRole('tab',{name:category,exact:true}).tap();await page.locator('[data-clip="'+id+'"]').tap();await page.waitForFunction(id=>[...document.querySelectorAll('.soccerGuidePhotos img')].length===3&&[...document.querySelectorAll('.soccerGuidePhotos img')].every(i=>i.complete&&i.naturalWidth===640&&i.src.includes('/'+id+'-')),id);assert.equal(await page.locator('.soccerGuidePhotoError').isVisible(),false);}
   const bounds=await page.locator('#soccerTutorial').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);
   assert(await page.locator('#soccerTutorial').evaluate(d=>d.scrollWidth<=d.clientWidth+1),'photos do not cause horizontal overflow');
   await page.getByRole('tab',{name:'パス・シュート',exact:true}).tap();await page.locator('[data-clip="pass"]').tap();
   await page.evaluate(()=>{playMode='real';});await page.locator('[data-retry-video]').tap();await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.hidden&&v.currentTime>.1;},null,{timeout:8000}).catch(async e=>{console.error(await page.evaluate(()=>({events:mediaEvents,video:{hidden:document.querySelector('video').hidden,src:document.querySelector('video').src,ready:document.querySelector('video').readyState,error:document.querySelector('video').error?.message},notice:document.querySelector('.soccerGuideVideoError').textContent})));throw e;});
   assert.equal(await page.locator('.soccerGuidePhotos').isVisible(),false);assert.equal(await page.locator('.soccerGuideVideoError').isVisible(),false);
   await page.locator('[data-photos]').tap();assert.equal(await page.locator('.soccerGuidePhotos').isVisible(),true);assert.equal(await page.locator('.soccerGuideVideoError').isVisible(),false,'manual photos are not an error');
   if(viewport.width===390){
    // A stalled load is bounded, and closing cancels a pending fallback.
    const stalled=route=>{};await page.route('**/*.mp4',stalled);await page.evaluate(()=>playMode='stall');await page.locator('[data-retry-video]').tap();await page.waitForSelector('.soccerGuidePhotos:not([hidden])',{timeout:9000});
    await page.locator('[data-retry-video]').tap();await page.getByRole('button',{name:'チュートリアルを閉じる'}).tap();await page.waitForTimeout(6100);assert.equal(await page.locator('#soccerTutorial').isVisible(),false);
    await page.unroute('**/*.mp4',stalled);await page.evaluate(()=>playMode='deferred');await page.locator('#soccerTutorialBtn').tap();await page.locator('[data-clip="shot"]').tap();await page.evaluate(()=>pending[0].reject(new DOMException('Old clip rejected','NotAllowedError')));assert.equal(await page.locator('video').isVisible(),true,'late rejection from previous clip is ignored');
    await page.evaluate(()=>document.querySelector('video').dispatchEvent(new Event('error')));await page.waitForSelector('.soccerGuidePhotos:not([hidden])');
    await page.evaluate(()=>document.querySelector('.soccerGuidePhotos img').dispatchEvent(new Event('error')));assert.equal(await page.locator('.soccerGuidePhotoError').isVisible(),true);assert((await page.locator('[role=tabpanel]>p').first().innerText()).length>10);
   }
   fs.mkdirSync('verification/tutorial-photos',{recursive:true});await page.locator('[role=tabpanel] h3').scrollIntoViewIfNeeded();await page.screenshot({path:'verification/tutorial-photos/'+viewport.width+'.png'});
   await page.evaluate(()=>guide.update(false));assert.equal(await page.locator('#soccerTutorial').isVisible(),false);assert.equal(await page.locator('#soccerTutorialBtn').isVisible(),false);assert.equal(await page.evaluate(()=>notices.at(-1)),false);assert.deepEqual(errors,[]);await page.close();
   console.log('PASS '+viewport.width+': all 20 three-photo guides, rejected playback fallback, real retry, manual photos, Pages subpath, close and layout');
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
