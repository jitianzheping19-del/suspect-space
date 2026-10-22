// Produce the independent, voice-free Apps Script edition from the live source.
// No game scripts, CSS, map JSON, or SkyWay token endpoint are fetched at runtime.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';

const root=process.cwd(),out=resolve(process.argv[2]||'/workspace/artifacts/gas-oct22');
await mkdir(out,{recursive:true});
let html=await readFile('space-suspect-complete.html','utf8');
html=html.replace(/^const RULES=await fetch\(new URL\("\.\/database\.rules\.json",import\.meta\.url\)[^\n]*$/m,
  'const RULES='+JSON.stringify(JSON.parse(await readFile('database.rules.json','utf8')))+';');
// Optional, isolated browser fixtures are never included in delivered documents.
if(process.env.GAS_QA_PROBE_FILE){
  const probe=await readFile(process.env.GAS_QA_PROBE_FILE,'utf8');
  html=html.replace('function showMeetingIntro(reason)',()=>probe+'\nfunction showMeetingIntro(reason)')
    .replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}','');
}
const plugins=[{
  name:'standalone-gas',setup(api){
    api.onResolve({filter:/^(?:three(?:\/.*)?|https?:\/\/.*)$/},args=>({path:args.path,external:true}));
    api.onResolve({filter:/^(?:@skyway-sdk\/room|skyway-ai-noise-canceller)$/},args=>({path:args.path,namespace:'gas-no-voice'}));
    api.onLoad({filter:/.*/,namespace:'gas-no-voice'},()=>({contents:'export const SkyWayContext={},SkyWayRoom={};export class LocalAudioStream{};export class SkyWayNoiseCanceller{}',loader:'js'}));
    api.onLoad({filter:/[/\\]frost-map\.js$/},async args=>{
      let source=await readFile(args.path,'utf8');
      const start=source.indexOf('const response = await fetch('),end=source.indexOf('const data = await response.json();')+'const data = await response.json();'.length;
      if(start<0||end<start)throw new Error('Frost data loader changed; update the standalone export');
      const data=await readFile(resolve(root,'frost-map-data.json'),'utf8');
      source=source.slice(0,start)+'const data = '+JSON.stringify(JSON.parse(data))+';'+source.slice(end);
      return{contents:source,loader:'js',resolveDir:dirname(args.path)};
    });
  }
}];

// Preserve classic-script order and bundle each module at its original location.
const scriptPattern=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const scripts=[...html.matchAll(scriptPattern)],replacements=[];
for(const match of scripts){
  const [original,attrs,source]=match;
  if(!/\btype\s*=\s*["']module["']/i.test(attrs))continue;
  const src=attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if(src&&/^https?:/.test(src))continue;
  const entry=src?resolve(root,src):null;
  const result=await build({
    ...(entry?{entryPoints:[entry]}:{stdin:{contents:source,resolveDir:root,sourcefile:'gas-game-entry.js',loader:'js'}}),
    bundle:true,write:false,format:'esm',platform:'browser',target:'esnext',minify:false,
    charset:'utf8',legalComments:'none',plugins,define:{'import.meta.env.BASE_URL':'"./"'},
  });
  replacements.push({index:match.index,length:original.length,text:'<script type="module">\n'+result.outputFiles[0].text+'\n</script>'});
}
for(const item of replacements.reverse())html=html.slice(0,item.index)+item.text+html.slice(item.index+item.length);
// Read local stylesheet links before replacing them (there are no CSS imports).
async function inlineAssets(source){
  for(const match of [...source.matchAll(/<link\b[^>]*>/gi)]){
    const tag=match[0],href=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1],rel=tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1];
    if(!href||/^(?:https?:|data:)/.test(href))continue;
    const file=resolve(root,href.split('?')[0]);
    if(rel==='stylesheet'){
      const css=await readFile(file,'utf8');
      source=source.replace(tag,()=>'<style>\n'+css+'\n</style>');
    }
    else if(rel==='manifest')source=source.replace(tag,'');
    else if(rel?.includes('icon')){
      const mime=extname(file)==='.png'?'image/png':'image/x-icon',bytes=await readFile(file);
      source=source.replace(tag,()=>tag.replace(href,'data:'+mime+';base64,'+bytes.toString('base64')));
    }
  }
  return source;
}
html=await inlineAssets(html);
html=html.replace('</head>','<script>window.SPACE_SUSPECT_GAS=true;</script>\n<style>#voiceToggleBtn,#voicePermissionPanel,#voiceRoomEnabled{display:none!important}</style>\n</head>');
const code=`function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SPACE SUSPECT')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getUrl() {
  return ScriptApp.getService().getUrl();
}
`;
await writeFile(resolve(out,'index.html'),html);await writeFile(resolve(out,'code.js'),code);
if(!process.env.GAS_QA_PROBE_FILE)execFileSync('python',['tools/export-gas-docx.py',out],{stdio:'inherit'});
console.log(JSON.stringify({directory:out,htmlBytes:Buffer.byteLength(html),serverBytes:Buffer.byteLength(code)}));
