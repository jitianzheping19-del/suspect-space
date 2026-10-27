import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {onRequest} from 'firebase-functions/v2/https';
import {onValueWritten} from 'firebase-functions/v2/database';
import {randomInt,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
initializeApp();
const catalog=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url))),admins=new Set(['dUAYnvjlbvTUluFXyQkTsAFMs1c2','Lv0aTXfHM7M3CItek3dNwjjd0si1']);
const initial=uid=>({tickets:admins.has(uid)?999:50,premium:admins.has(uid)?999:0,owned:{},receipts:{},rewards:{}});
function choose(pool){const weights=[55,27,12,5,1],total=pool.reduce((n,x)=>n+weights[x.rarity],0);let roll=randomInt(total);return pool.find(x=>(roll-=weights[x.rarity])<0);}
async function mutate(uid,operation,work){let result;const tx=await getDatabase().ref(`economy/${uid}`).transaction(raw=>{const w=raw||initial(uid);w.owned||={};w.receipts||={};w.rewards||={};if(w.receipts[operation]){result=w.receipts[operation];return w;}result=work(w);w.receipts[operation]=result;return w;});if(!tx.committed)throw Error('処理を確定できませんでした');return {wallet:tx.snapshot.val(),result};}
export const gachaApi=onRequest({region:'us-central1',cors:true,maxInstances:5},async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 try{const token=String(req.headers.authorization||'').replace(/^Bearer /,'');const {uid}=await getAuth().verifyIdToken(token);const p=req.body||{},action=p.action;
 if(action==='wallet'){const ref=getDatabase().ref(`economy/${uid}`);const tx=await ref.transaction(w=>w||initial(uid));const w=tx.snapshot.val();return res.json({wallet:{tickets:w.tickets,premium:w.premium,owned:w.owned||{}}});}
 const operation=String(p.requestId||'');if(!/^[a-zA-Z0-9_-]{16,80}$/.test(operation))throw Error('リクエストIDが不正です');
 if(action==='draw'){
 const premium=p.kind==='premium',category=Number(p.category);if(!premium&&(!Number.isInteger(category)||category<0||category>4))throw Error('カテゴリが不正です');
 const pool=catalog.filter(x=>premium?x.category===5:x.category===category),choice=choose(pool);
 const {wallet,result}=await mutate(uid,operation,w=>{const remaining=pool.filter(x=>!w.owned[x.number]);if(!remaining.length)throw Error('このカテゴリはコンプリート済みです');const key=premium?'premium':'tickets';if(w[key]<1)throw Error('チケットが足りません');const item=remaining.some(x=>x.number===choice.number)?choice:choose(remaining);w[key]--;w.owned[item.number]=true;return {item:item.number,at:Date.now()};});
 const item=catalog.find(x=>x.number===result.item);if(item?.category===5)await getDatabase().ref(`premiumOwnership/${uid}/${item.id}`).set(`gacha:${operation}`);
 return res.json({wallet:{tickets:wallet.tickets,premium:wallet.premium,owned:wallet.owned},item});}
 if(action==='gift'){
 if(!admins.has(uid))return res.status(403).json({error:'管理者のみ送れます'});const target=String(p.target||''),count=Number(p.count);if(!/^[A-Za-z0-9_-]{1,128}$/.test(target)||!Number.isInteger(count)||count<1||count>999)throw Error('送り先または枚数が不正です');
 const online=(await getDatabase().ref(`onlineUsers/${target}`).get()).val();if(online?.online!==true)throw Error('送り先はオフラインです');
 await getDatabase().ref(`ticketGifts/${target}/${operation}`).transaction(old=>old||{count,kind:p.kind==='premium'?'premium':'normal',sender:uid,createdAt:Date.now()});return res.json({sent:true});}
 if(action==='claim'){
 const giftId=String(p.giftId||'');if(!/^[a-zA-Z0-9_-]{16,80}$/.test(giftId))throw Error('ギフトIDが不正です');const gift=(await getDatabase().ref(`ticketGifts/${uid}/${giftId}`).get()).val();if(!gift)throw Error('ギフトが見つかりません');
 const {wallet}=await mutate(uid,'gift_'+giftId,w=>{w[gift.kind==='premium'?'premium':'tickets']+=gift.count;return {at:Date.now(),claimed:true};});return res.json({wallet:{tickets:wallet.tickets,premium:wallet.premium,owned:wallet.owned}});}
 throw Error('不明な操作です');
 }catch(error){res.status(error.code?.startsWith('auth/')?401:400).json({error:error.message||'処理に失敗しました'});}
});
// Rewards use the existing host-authoritative round result, never a client-provided winner.
export const awardMatchTickets=onValueWritten({ref:'rooms/{room}/game/phase',region:'us-central1'},async event=>{
 if(event.data.after.val()!=='ended'||event.data.before.val()==='ended')return;
 const g=(await getDatabase().ref(`rooms/${event.params.room}/game`).get()).val();if(g?.phase!=='ended')return;
 const humans=Object.entries(g.players||{}).filter(([id,p])=>!id.startsWith('bot-')&&!p.bot&&!p.observer);if(humans.length<5)return;
 const key=createHash('sha256').update(`${event.params.room}:${g.round}:${g.playStartsAt||g.countdownEndsAt||event.id}`).digest('hex');
 for(const [uid,p] of humans){const draw=g.winner==='waveDraw'||g.winner==='draw';const won=g.winner==='mini-loss'?g.miniLoss===uid:g.winner==='jester'?g.jesterWinner===uid:g.winner==='waveSolo'?g.waveWinnerId===uid:g.winner==='waveTeam'?p.waveTeam===g.waveWinnerTeam:g.winner==='lovers'?!!p.lover:g.winner==='impostor'?p.role==='impostor'||['madmate','blackCat'].includes(p.subrole):p.role===g.winner;
 await getDatabase().ref(`economy/${uid}`).transaction(raw=>{const w=raw||initial(uid);w.rewards||={};if(w.rewards[key])return;const amount=draw?3:won?10:5;w.tickets+=amount;w.rewards[key]=amount;return w;});}
});
