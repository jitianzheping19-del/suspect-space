const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/premium-complete-2026-10-28');
const existing=fs.readFileSync(path.join(__dirname,'check-room-rejoin.cjs'),'utf8'),fakeDB=existing.split('const fakeDatabase=`')[1].split('`;')[0],fixture=fs.readFileSync(path.join(__dirname,'all-roles-probe.js'),'utf8');
(async()=>{
 const server=require('node:http').createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let body=fs.readFileSync(file,'utf8'),type=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html';
  if(file.endsWith('.css')&&req.headers['sec-fetch-dest']==='script'){type='application/javascript';body='const s=document.createElement("style");s.textContent='+JSON.stringify(body)+';document.head.append(s);';}
  if(file===path.join(root,'index.html'))body=body.replace('function showMeetingIntro(reason)',fixture+'\nfunction showMeetingIntro(reason)').replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}','').replace('setInterval(hostTick, 150);','');
  res.setHeader('Content-Type',type);res.end(body);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  fs.mkdirSync(out,{recursive:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text().slice(0,400));});
  await page.route('**/build/three.module.js',r=>r.fulfill({path:'/workspace/emergency-3d-revision/three.module.js',contentType:'application/javascript'}));
  await page.route('**/firebase-database.js',r=>r.fulfill({body:fakeDB,contentType:'application/javascript'}));
  await page.route('**/firebase-app.js',r=>r.fulfill({body:'export const initializeApp=()=>({});',contentType:'application/javascript'}));
  await page.route('**/firebase-auth.js',r=>r.fulfill({body:'export const getAuth=()=>({}),setPersistence=async()=>{},indexedDBLocalPersistence={},browserLocalPersistence={},signInAnonymously=async()=>({}),updateProfile=async()=>{},signOut=async()=>{},signInWithEmailAndPassword=async()=>({}),createUserWithEmailAndPassword=async()=>({});',contentType:'application/javascript'}));
  await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/,r=>r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__allRolesQA,{timeout:60000});
  const report=await page.evaluate(()=>window.__allRolesQA.all());report.errors=errors;fs.writeFileSync(path.join(out,'all-roles-report.json'),JSON.stringify(report,null,2));
  for(const row of report.rows)console.log(row.passed?'PASS':'FAIL',row.id,row.title,row.error||'',row.passed?'':JSON.stringify(row.result));
  assert.deepEqual(report.rows.filter(r=>!r.passed),[]);assert.deepEqual(errors,[]);console.log('PASS all '+report.roles.length+' selectable roles and '+report.rows.length+' checks against actual host commands and rule functions');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
