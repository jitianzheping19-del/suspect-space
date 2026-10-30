export const GOLDEN_LEGEND_RARITY=5;
export const GACHA_RARITY_NAMES=Object.freeze(['RARE','SUPER RARE','HYPER RARE','ULTRA RARE','LEGEND RARE','ゴールデンレジェンドレア']);
export const GACHA_RARITY_COLORS=Object.freeze(['#64bed8','#8d99ff','#da84ff','#ffc369','#fff0ab','#ffd45e']);
export const GOLDEN_LEGEND_CHANCE=.20;
// Premium rates are per tier, not per item. Ownership never changes the 20%.
// Prefer an unowned item within the winning tier; a completed tier can repeat.
export function chooseGachaItem(pool,owned,premium,random){
 if(!pool.length)throw new Error('抽選対象がありません');
 let choices,roll;
 if(premium){
  const golden=random<GOLDEN_LEGEND_CHANCE;
  const tier=pool.filter(x=>(x.rarity===GOLDEN_LEGEND_RARITY)===golden);
  if(!tier.length)throw new Error('課金ガチャの提供割合を確認できません');
  const remaining=tier.filter(x=>!owned[x.number]);choices=remaining.length?remaining:tier;
  roll=golden?random/GOLDEN_LEGEND_CHANCE:(random-GOLDEN_LEGEND_CHANCE)/(1-GOLDEN_LEGEND_CHANCE);
  return choices[Math.min(choices.length-1,Math.floor(roll*choices.length))];
 }
 const remaining=pool.filter(x=>!owned[x.number]);choices=remaining.length?remaining:pool;
 const weights=[55,27,12,5,1];roll=random*choices.reduce((n,x)=>n+weights[x.rarity],0);
 return choices.find(x=>(roll-=weights[x.rarity])<0)||choices.at(-1);
}
