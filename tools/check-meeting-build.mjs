// The iframe is a separate JS realm. Minified factory names must not escape
// into it as references to bindings that only exist in the parent bundle.
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
const output=await build({entryPoints:['meeting-scene-ejections.js'],bundle:true,write:false,format:'esm',platform:'browser',minify:true});
const {patchMeetingRuntime}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const source=await readFile('index.html','utf8'),match=source.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/),assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64'))),html=patchMeetingRuntime(assets.MEETING_3D_SRCDOC);
const start=html.indexOf('const createEjectionStaging='),end=html.indexOf('let liveMeetingEjections=null;',start),factories=html.slice(start,end);
class Group{constructor(){this.children=[];}add(child){this.children.push(child);}}
const context={THREE:{Group},scene:new Group(),camera:{}};vm.createContext(context);
vm.runInContext(factories+'\ncreateMeetingEjections({THREE,scene,camera,createExtendedEjectionEffects,createEjectionStaging});',context);
console.log('PASS minified meeting factories initialize in an isolated iframe realm');
