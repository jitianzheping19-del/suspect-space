// Render the same library embedded in the game; no Firebase or production writes.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createServer}=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.COSTUME_QA_OUT||path.join(root,'tmp/costume-quality');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(root+'/index.html','utf8'),pattern=/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
const assets=JSON.parse(zlib.gunzipSync(Buffer.from(JSON.parse(source.match(pattern)[1]).join(''),'base64')));
const beforeFile=process.env.COSTUME_QA_BEFORE||'/workspace/backups/costume-library-before-oct22.js',before=fs.existsSync(beforeFile)?fs.readFileSync(beforeFile,'utf8'):assets.COSTUME_LIB_SRC;
const builderPattern=/function buildLightCostume\(THREE,code\)\{[\s\S]*?\n  return root;\n\}/;
const builder=source.match(builderPattern)[0];
for(const f of['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
 const s=fs.readFileSync(root+'/'+f,'utf8'),a=JSON.parse(zlib.gunzipSync(Buffer.from(JSON.parse(s.match(pattern)[1]).join(''),'base64')));
 assert.equal(s.match(builderPattern)[0],builder,'main builder '+f);assert.equal(a.COSTUME_LIB_SRC,assets.COSTUME_LIB_SRC,'shared costume library '+f);
 assert.equal(a.INTEGRATED_LOBBY_TEMPLATE,fs.readFileSync(root+'/assets-source/lobby-lounge.html','utf8'),'lobby library '+f);
}
const hats=['dragon','ufo','hbnd','hstr','hfed','hrib','hlea','hice','hmoo','hsta','hmsk','hpuf','hsus','hbut','hhrt','hpar','hcap2','hdev','hsan','hgld','hpen','hfrg'];
const bags=['pack','jet','satchel','medic','oxygen','radio','hiking','shield','aquarium','rocket','wings','treasure','solar','guitar','bbag','bdrm','bcam','bgym','bshp','bwtr','bpar','bcrd','bfish','bjus','btrv','bflag','bbal','bcat','bbee','bnin','bstr','bbox','bmap','bgsd','camera','battery','lantern','toolbox','book'];
const accessories=['bhrt','bstf','brbw','bflw','bwng','bhmr','brkt','bgtr','bsld','bcrn','aswd','aflg','aneo','alan','aglb','abal','apiz','aclk','arob','ajet','asng','abrd','agem','aumb','arbt','asnw','apal','asub','abok','abom'];
const motion=source.slice(source.indexOf('function animateCompanionGait('),source.indexOf('function advanceCompanionFollower('));
const html=`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#142533}#label{position:fixed;left:18px;top:14px;color:#e5e5dc;font:600 16px system-ui}</style><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js"}}</script></head><body><div id="label"></div><script type="module">
import * as THREE from 'three';
const build=new Function('THREE',${JSON.stringify(assets.COSTUME_LIB_SRC+';return buildLightCostume;')})(THREE);
const oldBuild=new Function('THREE',${JSON.stringify(before+';return buildLightCostume;')})(THREE);
${motion}
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#172a38');scene.add(new THREE.HemisphereLight('#e7f2fa','#566573',2.1));
for(const [x,y,z,c,i]of[[-3,5,5,'#fff1d7',3.2],[3,3,-5,'#b1e4f5',2.1],[-2,1,-3,'#f4d8b0',1]]){const l=new THREE.DirectionalLight(c,i);l.position.set(x,y,z);scene.add(l)}
const crew=new THREE.Group(),suit=new THREE.MeshStandardMaterial({color:'#b6c2b8',roughness:.72});scene.add(crew);
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.47,6,18),suit);body.position.y=1.01;crew.add(body);
const visor=new THREE.Mesh(new THREE.SphereGeometry(.35,18,12),new THREE.MeshStandardMaterial({color:'#a6ced8',roughness:.23,metalness:.14}));visor.position.set(0,1.18,.36);visor.scale.set(1,.66,.5);crew.add(visor);
for(const x of[-.23,.23]){const foot=new THREE.Mesh(new THREE.CapsuleGeometry(.165,.20,5,12),suit);foot.position.set(x,.29,0);crew.add(foot)}
const camera=new THREE.OrthographicCamera(-1.1,1.1,.825,-.825,.01,30);let gear,category,kind;
function dispose(o){const g=new Set(),m=new Set();o.traverse(n=>{if(n.geometry)g.add(n.geometry);if(n.material)m.add(n.material)});g.forEach(g=>g.dispose());m.forEach(m=>m.dispose());o.removeFromParent();}
function view(back=false){
 const y=category==='hat'?1.65:category==='bag'?1.22:category==='accessory'?1.3:.045;
 camera.position.set(category==='pet'?1.1:2.2,category==='pet'?.7:2.7,back?-4.5:4.5);camera.lookAt(0,y,category==='bag'?-.1:0);
 const zoom=category==='pet'?1.32:category==='accessory'?.76:1;camera.left=-1.1/zoom;camera.right=1.1/zoom;camera.top=.825/zoom;camera.bottom=-.825/zoom;camera.updateProjectionMatrix();scene.updateMatrixWorld(true);renderer.render(scene,camera);
}
window.__wearableQA={
 select(c,k,old=false){if(gear)dispose(gear);category=c;kind=k;const parts=['none','none','none','none','none','none'];parts[c==='hat'?0:c==='bag'?1:c==='accessory'?5:2]=k;gear=(old?oldBuild:build)(THREE,'custom-'+parts.join('-'));scene.add(gear);crew.visible=c!=='pet';if(c==='pet')gear.userData.pet.position.set(0,0,0);view(c==='bag');document.getElementById('label').textContent=(old?'BEFORE  ':'AFTER  ')+c+' / '+k;return this.stats();},
 stats(){let meshes=0,triangles=0,finite=true,detailed=false;gear.traverse(o=>{detailed||=!!(o.userData.detailedWearable||o.userData.detailedCompanion);if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;for(const x of o.geometry.attributes.position.array)finite&&=Number.isFinite(x);}});const b=new THREE.Box3().setFromObject(gear);return{meshes,triangles,finite,detailed,bounds:{min:b.min.toArray(),max:b.max.toArray()},gpuGeometries:renderer.info.memory.geometries};},
 flip(){view(category!=='bag');},
 animate(){const pet=gear.userData.pet,r=pet.userData.motionRig,parts=[...r.legs,...r.wheels,...r.wings,...r.tails],before=parts.map(p=>p.node.rotation[p.axis]);for(let i=0;i<120;i++)animateCompanionGait(pet,.013,1/60,true,i*1000/60);view();return{changed:parts.some((p,i)=>p.node.rotation[p.axis]!==before[i]),attached:parts.every(p=>{for(let n=p.node;n;n=n.parent)if(n===pet)return true;return false}),...this.stats()};},
 combined(){if(gear)dispose(gear);category='hat';gear=build(THREE,'custom-dragon-hiking-dragon-none-none-none');scene.add(gear);crew.visible=true;view();return this.stats();}
};
</script></body></html>`;
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:640,height:480}}),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__wearableQA,{},{timeout:90000});
  for(const [category,kinds]of[['hat',hats],['bag',bags],['accessory',accessories],['pet',['dragon','rover']]]){
   for(const kind of kinds){
    const stats=await page.evaluate(([c,k])=>window.__wearableQA.select(c,k),[category,kind]);
    assert(stats.detailed&&stats.finite,JSON.stringify({category,kind,stats}));assert(stats.meshes<=30,'draw calls '+category+'/'+kind+' '+stats.meshes);assert(stats.triangles<19000,'triangle budget '+category+'/'+kind+' '+stats.triangles);
    assert(stats.bounds.max[0]-stats.bounds.min[0]>.15,'missing silhouette '+kind);assert(stats.bounds.max[1]<3.05,'head bounds '+kind);if(category==='accessory')assert(stats.bounds.min[1]>=-.03,'detached accessory pieces below the crew: '+kind);
    await page.screenshot({path:out+'/'+category+'-'+kind+'.png'});
    if(category==='pet'){const a=await page.evaluate(()=>window.__wearableQA.animate());assert(a.changed&&a.attached&&a.finite,JSON.stringify({kind,a}));}
    if(category==='accessory'||['dragon','ufo','hfrg','hsus','pack','jet','aquarium','guitar','treasure','bcat','hdev','bgsd','bnin','rover'].includes(kind)){
     await page.evaluate(()=>window.__wearableQA.flip());await page.screenshot({path:out+'/'+category+'-'+kind+'-reverse.png'});
     await page.evaluate(([c,k])=>window.__wearableQA.select(c,k,true),[category,kind]);await page.screenshot({path:out+'/'+category+'-'+kind+'-before.png'});
    }
    rows.push({category,kind,...stats});console.log('PASS',category,kind,stats.meshes,stats.triangles);
   }
  }
  const memory=[];for(let i=0;i<12;i++)memory.push((await page.evaluate(()=>window.__wearableQA.select('hat','dragon'))).gpuGeometries);assert(memory.at(-1)<=memory[1]+1,'costume replacement GPU resource leak: '+memory.join(','));
  await page.evaluate(()=>window.__wearableQA.combined());await page.screenshot({path:out+'/combined-outfit.png'});
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({items:rows,replacementGeometryCounts:memory},null,2));console.log('PASS',rows.length,'sculpts, shared libraries, finite geometry, motion pivots and resource disposal');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
