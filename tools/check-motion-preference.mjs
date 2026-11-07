import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createMotionPreference} from '../motion-preference.js';
function scene({stored='system',os=false,parent=null}={}){
 const handlers={},frames=[],query={matches:os,addEventListener(type,callback){this.change=callback;}},saved=new Map([['space-suspect-motion-v1',stored]]);
 const context=vm.createContext({matchMedia:()=>query,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},addEventListener:(type,callback)=>handlers[type]=callback,document:{documentElement:{dataset:{}},head:{append(){}},createElement:()=>({}),querySelectorAll:()=>frames,addEventListener:(type,callback)=>handlers['document:'+type]=callback}});
 vm.runInContext('window=globalThis;parent=globalThis;',context);if(parent)context.parent=parent;
 const preference=vm.runInContext('('+createMotionPreference.toString()+')()',context);
 return {context,preference,query,handlers,frames,saved};
}
const root=scene();assert(!root.preference.matches);let changes=0;const listener=()=>changes++;root.preference.addEventListener('change',listener);
root.query.matches=true;root.query.change();assert(root.preference.matches);root.query.matches=false;root.query.change();assert(!root.preference.matches);
root.preference.set('reduce');assert(root.preference.matches);assert.equal(root.saved.get('space-suspect-motion-v1'),'reduce');assert.equal(root.context.document.documentElement.dataset.reducedMotion,'true');
root.preference.set('invalid');assert.equal(root.preference.mode,'reduce');assert.equal(changes,3);root.preference.removeEventListener('change',listener);
let sent=[];const childWindow={postMessage:value=>sent.push(value)};root.frames.push({contentWindow:childWindow});root.preference.set('system');assert.equal(sent.at(-1).mode,'system');
sent=[];root.handlers.message({source:{},data:{type:'ss-motion-preference-request'}});assert.equal(sent.length,0);
root.handlers.message({source:childWindow,data:{type:'ss-motion-preference-request'}});assert.equal(sent.length,1);
const parentWindow={__spaceMotionPreference:{mode:'reduce'},postMessage(){}};const child=scene({parent:parentWindow});assert(child.preference.matches);
child.handlers.message({source:{},data:{type:'ss-motion-preference',mode:'system'}});assert(child.preference.matches);
child.handlers.message({source:parentWindow,data:{type:'ss-motion-preference',mode:'system'}});assert(!child.preference.matches);assert.equal(child.saved.get('space-suspect-motion-v1'),'system');
const denied=vm.createContext({});vm.runInContext('Object.defineProperty(globalThis,"localStorage",{get(){throw Error("blocked");}})',denied);assert.doesNotThrow(()=>vm.runInContext('('+createMotionPreference.toString()+')().set("reduce")',denied));
console.log('PASS OS changes, stored choice, live scene propagation, sender validation, invalid mode and blocked storage');
