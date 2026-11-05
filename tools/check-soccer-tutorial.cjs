const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const {SOCCER_GUIDE}=await import('../lobby-soccer-guide.js');
 for(const [id]of SOCCER_GUIDE){
  const relative='tutorial/soccer/'+id+'.mp4',source=fs.readFileSync('public/'+relative),built=fs.readFileSync('dist/'+relative);assert(source.equals(built),id+' is current in build');
  const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json','dist/'+relative],{encoding:'utf8'}));
  assert.equal(meta.streams[0].codec_name,'h264');assert.equal(meta.streams[0].pix_fmt,'yuv420p');assert(+meta.format.duration>=3);
 }
 const bundle=await build({entryPoints:['lobby-soccer-guide.js'],bundle:true,write:false,format:'iife',globalName:'Guide'});
 const server=http.createServer((req,res)=>{const file=path.join(process.cwd(),'dist',decodeURIComponent(req.url).replace(/^\/suspect-space\//,''));if(req.url.startsWith('/suspect-space/tutorial/soccer/')&&fs.existsSync(file)){res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':fs.statSync(file).size});fs.createReadStream(file).pipe(res);}else{res.writeHead(200,{'Content-Type':'text/html'});res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><body>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/suspect-space/');await page.addStyleTag({content:fs.readFileSync('lobby-soccer-match.css','utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(()=>{window.guide=Guide.createSoccerGuide({document,window});guide.update(true);});await page.locator('#soccerTutorialBtn').tap();
  for(const [id,category]of SOCCER_GUIDE){await page.getByRole('tab',{name:category,exact:true}).click();await page.locator('[data-clip="'+id+'"]').click();await page.waitForFunction(id=>{const v=document.querySelector('video');return v.src.endsWith('/'+id+'.mp4')&&v.readyState>=2;},id);assert.equal(await page.locator('video').evaluate(v=>v.paused),false,'muted video autoplays');await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.locator('video').evaluate(v=>v.pause());assert.equal(await page.locator('.soccerGuideVideoError').isVisible(),false,id);}
  await page.getByRole('tab',{name:'空中のボール',exact:true}).click();await page.locator('[data-clip="heelOverhead"]').click();await page.waitForFunction(()=>document.querySelector('video').readyState>=2);await page.locator('video').evaluate(v=>v.currentTime=1.65);await page.waitForFunction(()=>!document.querySelector('video').seeking);fs.mkdirSync('verification/soccer-expansion',{recursive:true});await page.screenshot({path:'verification/soccer-expansion/tutorial-mobile.png'});
  const bounds=await page.locator('#soccerTutorial').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=391);await page.getByRole('button',{name:'チュートリアルを閉じる'}).click();assert.equal(await page.locator('#soccerTutorial').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS all '+SOCCER_GUIDE.length+' built H264 tutorial videos load/play through mobile tabs on Pages subpath; close and viewport bounds');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
