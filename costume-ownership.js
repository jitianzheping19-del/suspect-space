export function hasCostumeInventory(wallet,premiumOwned){return Object.values(wallet?.owned||{}).some(Boolean)||premiumOwned.size>0;}
export function shouldResetEmptyCostume({admin,wallet,premiumOwned,current}){return !admin&&!!wallet&&!wallet.unavailable&&!hasCostumeInventory(wallet,premiumOwned)&&!!current&&current!=='standard';}
