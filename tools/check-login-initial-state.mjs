import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const between=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+a.length);assert(start>=0&&end>start,a);return source.slice(start,end);};
function fixture({user=null,prepareError=null,pinError=null}={}){
 const nodes=new Map(),calls={authenticate:0,restored:0,mode:0,finished:0};
 const node=id=>{if(!nodes.has(id)){const hidden=new Set(id==='loginInlineError'?['hidden']:[]);nodes.set(id,{value:'',textContent:'',dataset:{},disabled:false,classList:{add:x=>hidden.add(x),remove:x=>hidden.delete(x),contains:x=>hidden.has(x)},focus(){}});}return nodes.get(id);};
 const auth={currentUser:user,authStateReady:async()=>{}};
 const c=vm.createContext({$:node,rolePracticeMode:false,loginMode:'login',app:null,auth:null,db:null,connected:false,uid:'',firebaseAuthPersistenceReady:null,firebaseConnectGeneration:0,stableNameAccount:false,
  firebaseProjects:{prepare:async()=>{if(prepareError)throw prepareError;return {app:{},auth,db:{}};},switching:false},
  navigator:{onLine:true},readStored:()=>'',saveStored:()=>{},activateDatabaseSession:()=>{},ref:(_,path)=>path,onValue:()=>{},
  show:(id,visible)=>{node(id).classList[visible?'remove':'add']('hidden');},renderFirebaseConnection:()=>{},finishRoomResume:()=>calls.finished++,
  setLoginMode:()=>{calls.mode++;node('loginInlineError').textContent='';node('loginInlineError').classList.add('hidden');node('setupMessage').textContent='4桁PINを入力してください。';},
  authenticatePin:async pin=>{calls.authenticate++;if(pinError)throw pinError;if(!/^\d{4}$/.test(pin))throw Error('テンキーで4桁の数字を入力してください。');return {user:{uid:'submitted'},isNameAccount:true};},
  get:async()=>({val:()=>({name:'保存済みクルー'})}),loadProfileFieldsFromFirebase:async()=>{},loadAccountCostume:async()=>{},
  startRoomCleanupLoop:()=>{},startRoomInviteWatch:()=>{},publishOnlinePresence:async()=>{},setSetupMode:()=>{},showAccountUpdateInfoOnce:()=>{},
  maybeAutoReconnect:async()=>{calls.restored++;},now:()=>1000,errorText:e=>e.message,console,Promise,
 });
 vm.runInContext(between('async function connectFirebase(','\nlet setupMode='),c);
 return{c,node,calls};
}
{
 const {c,node,calls}=fixture();await c.connectFirebase();
 assert.equal(calls.authenticate,0,'initial restore must not submit an empty PIN');
 assert.equal(node('loginInlineError').textContent,'');assert(node('loginInlineError').classList.contains('hidden'));
 assert(!node('nameGate').classList.contains('hidden'));assert.equal(node('setupMessage').textContent,'4桁PINを入力してください。');
 assert.equal(node('loginBtn').disabled,false);assert.equal(node('nameGate').dataset.busy,'false');assert.equal(c.firebaseConnectionPending,false);assert.equal(calls.finished,1);
}
{
 const {c,node,calls}=fixture({user:{uid:'restored',isAnonymous:false}});await c.connectFirebase();
 assert.equal(c.uid,'restored');assert.equal(calls.authenticate,0);assert(node('nameGate').classList.contains('hidden'));
 assert.equal(node('setup').dataset.auth,'ready');assert.equal(node('loginInlineError').textContent,'');
}
for(const options of [{prepareError:Error('通信できませんでした。')},{pinError:Error('4桁PINが違います。')}]){
 const {c,node}=fixture(options);if(options.pinError)node('loginPinInput').value='1234';await c.connectFirebase();
 assert(!node('loginInlineError').classList.contains('hidden'));assert.equal(node('loginInlineError').textContent,(options.prepareError||options.pinError).message);
 assert.equal(node('loginBtn').disabled,false);
}
{
 const {c,node}=fixture();let requests=0;c.document={querySelectorAll:()=>[]};c.connectFirebase=async()=>{requests++;};
 vm.runInContext(between('let pinSubmissionPending=false;','\nfunction loadProfileFields()'),c);
 for(const value of ['', '12']){node('loginPinInput').value=value;assert.equal(c.submitPinLogin(),false);assert.match(node('loginInlineError').textContent,/4桁/);assert(!node('loginInlineError').classList.contains('hidden'));}
 assert.equal(requests,0);node('loginPinInput').value='1234';assert.equal(c.submitPinLogin(),true);assert.equal(c.submitPinLogin(),false);await new Promise(resolve=>setImmediate(resolve));assert.equal(requests,1);
 c.loginMode='create';node('loginNameInput').value='';assert.equal(c.submitPinLogin(),false);assert.match(node('loginInlineError').textContent,/名前/);
}
console.log('PASS first visit has no validation error or empty PIN authentication; saved login resumes; real errors stay visible; incomplete manual submissions explain the input and do not contact authentication; duplicate submission blocked');
