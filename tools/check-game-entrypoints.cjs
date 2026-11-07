const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve('dist'),aliases=['space-suspect-complete.html','space-suspect.html','space-suspect-final.html'];
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const file of aliases){const text=fs.readFileSync(path.join(root,file),'utf8');assert(Buffer.byteLength(text)<1024);assert(!text.includes('EMBEDDED_ASSET_PAYLOAD'));}
 assert(!fs.readdirSync(path.join(root,'assets')).some(name=>/^space-suspect.*\.js$/.test(name)),'one published game bundle');
 assert(!fs.readdirSync(path.join(root,'assets')).some(name=>/^database\.rules-.*\.json$/.test(name)),'no duplicate rules download');
 const manifestPath=html.match(/href="([^"?]+\.webmanifest)/)[1],manifest=JSON.parse(fs.readFileSync(path.join(root,'assets',manifestPath.split('/assets/')[1]),'utf8'));
 assert.equal(manifest.id,'/suspect-space/space-suspect-complete.html','installed app identity stays stable');assert.equal(manifest.start_url,'/suspect-space/');
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),name=url.pathname.split('/').at(-1);res.setHeader('Content-Type','text/html');
  if(aliases.includes(name))res.end(fs.readFileSync(path.join(root,name)));
  else if(url.pathname==='/suspect-space/')res.end('<!doctype html><title>Canonical game entry</title><script>window.arrived=true</script>');
  else res.writeHead(404).end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/suspect-space/';
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.evaluate(()=>localStorage.setItem('entry-account-probe','preserved'));
  for(const file of aliases)for(const suffix of ['', '?room=5291&invite=a%2Bb&v=release#soccer', '?name=%E3%81%82&return=%2Froom#photo']){
   const expected=new URL(base+suffix);await page.goto(base+file+suffix);await page.waitForURL(expected.href);await page.waitForFunction(()=>window.arrived);
   assert.equal(await page.evaluate(()=>localStorage.getItem('entry-account-probe')),'preserved');
   assert.equal(new URL(page.url()).search,expected.search);assert.equal(new URL(page.url()).hash,expected.hash);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS all three old URLs preserve query, invitation data, fragment and local account storage; one game bundle and stable PWA identity');
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
