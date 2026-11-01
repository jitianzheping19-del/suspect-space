import {chooseGachaItem} from './gacha-rarity.js';
import {GACHA_CATALOG as catalog} from './gacha-catalog.js';
export const GACHA_RELEASE='2026-10-27-gacha';
const validId=x=>/^[A-Za-z0-9_-]{16,80}$/.test(String(x||''));
const fail=message=>{const error=Error(message);error.definitive=true;throw error;};
export function createRealtimeGacha(api){
 const {ref,get,set,runTransaction}=api;
 const refFor=(unused,path)=>ref(api.db,path);
 const initial=admin=>({tickets:admin?999:0,premium:admin?999:0,owned:{},receipts:{},rewards:{}});
 async function transact(uid,id,work){const location=refFor(null,`economy/${uid}`);await get(location);const tx=await runTransaction(location,raw=>{const w=raw||initial(api.isAdmin());w.owned||={};w.receipts||={};w.rewards||={};if(id&&w.receipts[id])return w;const result=work(w);if(id)w.receipts[id]=result;return w;},{applyLocally:false});if(!tx.committed)fail('保存できませんでした。もう一度お試しください');const wallet=tx.snapshot.val();return{wallet,result:id?wallet.receipts[id]:null};}
 return async function request(action,p={}){const uid=api.uid();if(!uid)fail('ログインしてください');
 try{
 if(action==='wallet'||action==='launchBonus'){
 const seen=(await get(refFor(null,`profiles/${uid}/lastSeenUpdate`))).val()===GACHA_RELEASE;if(action==='launchBonus'&&!seen)fail('アップデート情報を確認してください');
 let credited=false;const response=await transact(uid,null,w=>{credited=seen&&!w.gachaLaunchBonus;if(credited){if(!api.isAdmin())w.tickets+=50;w.gachaLaunchBonus=true;}return null;});response.bonusGranted=credited&&!api.isAdmin();return response;}

 if(action==='matchReward'){
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(String(p.room||'')))fail('部屋が不正です');const g=(await get(refFor(null,`rooms/${p.room}/game`))).val();if(g?.phase!=='ended'||!g.players?.[uid]||g.players[uid].bot||g.players[uid].observer)fail('試合結果を確認できません');
 const humans=Object.entries(g.players).filter(([id,v])=>!id.startsWith('bot-')&&!v.bot&&!v.observer);const player=g.players[uid];const key=`${p.room}_${g.round}_${g.playStartsAt||g.countdownEndsAt||0}`;
 const draw=['draw','waveDraw'].includes(g.winner),won=g.winner==='mini-loss'?g.miniLoss===uid:g.winner==='jester'?g.jesterWinner===uid:g.winner==='waveSolo'?g.waveWinnerId===uid:g.winner==='waveTeam'?player.waveTeam===g.waveWinnerTeam:g.winner==='lovers'?!!player.lover:g.winner==='impostor'?player.role==='impostor'||['madmate','blackCat'].includes(player.subrole):player.role===g.winner;
 return await transact(uid,null,w=>{if(humans.length>=5&&!w.rewards[key]){const amount=draw?3:won?10:5;w.tickets+=amount;w.rewards[key]=amount;}return null;});}
 if(!validId(p.requestId))fail('リクエストIDが不正です');
 if(action==='gift'){
 if(!api.isAdmin())fail('管理者のみ送れます');const count=Number(p.count),target=String(p.target||'');if(!/^[A-Za-z0-9_-]{1,128}$/.test(target)||!Number.isInteger(count)||count<1||count>999)fail('送り先または枚数が不正です');if((await get(refFor(null,`onlineUsers/${target}`))).val()?.online!==true)fail('送り先はオフラインです');
 const location=refFor(null,`ticketGifts/${target}/${p.requestId}`),gift={count,kind:p.kind==='premium'?'premium':'normal',sender:uid,createdAt:Date.now()};
 // Admins have read access to this gift record, recipients to their own inbox.
 await get(location);await runTransaction(location,old=>old||gift,{applyLocally:false});return{sent:true};}
 if(action==='claim'){
 if(!validId(p.giftId))fail('ギフトIDが不正です');const gift=(await get(refFor(null,`ticketGifts/${uid}/${p.giftId}`))).val();if(!gift)fail('ギフトが見つかりません');return await transact(uid,'gift_'+p.giftId,w=>{w[gift.kind==='premium'?'premium':'tickets']+=gift.count;return{claimed:true,at:Date.now()};});}
 if(action==='draw'){
 const premium=p.kind==='premium',category=Number(p.category),count=p.count===undefined?1:Number(p.count);if((!premium&&(!Number.isInteger(category)||category<0||category>4))||![1,10].includes(count))fail('抽選内容が不正です');
 const pool=catalog.filter(x=>premium?x.category===5:x.category===category),randoms=new Uint32Array(count);crypto.getRandomValues(randoms);
 const {wallet,result}=await transact(uid,p.requestId,w=>{if(pool.every(x=>w.owned[x.number]))fail('このカテゴリはコンプリート済みです');const key=premium?'premium':'tickets';if(w[key]<count)fail('チケットが足りません');const numbers=[];for(let i=0;i<count;i++){const item=chooseGachaItem(pool,w.owned,premium,randoms[i]/4294967296);numbers.push(item.number);w.owned[item.number]=true;}w[key]-=count;return{items:numbers,at:Date.now()};});
 const items=(result.items||[result.item]).map(n=>catalog.find(x=>x.number===n));if(premium)try{await Promise.all([...new Set(items.map(x=>x.id))].map(id=>set(refFor(null,`premiumOwnership/${uid}/${id}`),`gacha:${p.requestId}`)));}catch(error){error.gachaCommitted=true;throw error;}return{wallet,item:items[0],items};}
 fail('不明な操作です');
 }catch(error){if(/permission.denied|permission_denied|PERMISSION_DENIED/i.test(String(error.code||error.message))){const denied=Error('ガチャの保存ルールを更新してください');denied.definitive=!error.gachaCommitted;throw denied;}throw error;}
 };
}
