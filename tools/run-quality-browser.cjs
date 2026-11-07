// Compatibility adapter for older browser checks after CSS imports and the
// database-session wrapper moved into modules. Assertions stay in each check.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const name=process.argv[2];
if(!/^check-[a-z0-9-]+\.cjs$/.test(name||''))throw Error('Expected a browser check filename');
const filename=path.join(__dirname,name),root=path.resolve(__dirname,'..');
let source=fs.readFileSync(filename,'utf8');
const out=path.join(root,'tmp/quality-continued',name.replace('.cjs',''));fs.mkdirSync(out,{recursive:true});
source=source.replace("path.resolve(root,'../artifacts/premium-complete-2026-10-28')",JSON.stringify(out))
 .replace("'/workspace/artifacts/oct22-batch/voice-results.json'",JSON.stringify(path.join(out,'voice-results.json')))
 .replaceAll("'/workspace/emergency-3d-revision/three.module.js'",JSON.stringify(path.join(root,'node_modules/three/build/three.module.js')));
source=source.replace(/await (page|p)\.route\('\*\*\/firebase-database\.js'/g,(match,page)=>{
 const db=name==='check-all-roles.cjs'?'fakeDB':'fakeDatabase';
 return `
 await ${page}.route('**/firebase-database-session.js',r=>r.fulfill({contentType:'application/javascript',body:${db}+'\nexport const activateDatabaseSession=()=>{},blockDatabaseSession=()=>{},closeDatabaseSession=async()=>{};'}));
 await ${page}.route('**/*.css',r=>{if(r.request().resourceType()!=='script')return r.continue();const css=fs.readFileSync(path.join(root,new URL(r.request().url()).pathname),'utf8');return r.fulfill({contentType:'application/javascript',body:'const s=document.createElement("style");s.textContent='+JSON.stringify(css)+';document.head.append(s);'});});
 await ${page}.route(/https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@0.164.1\//,r=>r.fulfill({path:path.join(root,'node_modules/three',r.request().url().split('three@0.164.1/')[1]),contentType:'application/javascript'}));
 `+match;
});
// Source snippets above are compiled as JS; retain literal escapes in them.
source=source.replace(/body:(fakeDB|fakeDatabase)\+'\nexport/g,"body:$1+'\\nexport");
source=source.replaceAll('route(/https://(cdn.jsdelivr.net/npm|unpkg.com)/three@0.164.1//,','route(new RegExp("https://(cdn.jsdelivr.net/npm|unpkg.com)/three@0.164.1/"),');
source=source.replace(/(page|p)\.on\('pageerror',e=>errors\.push\(e\.message\)\)/g,"$1.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);})");
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
