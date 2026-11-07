// Standalone source editions remain available to the GAS exporter. Pages ships
// one game bundle; existing bookmarks and installed app URLs resolve to it.
export const legacyGameEntries=['space-suspect-complete.html','space-suspect.html','space-suspect-final.html'];

export function gameEntryRedirect(){
 return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SPACE SUSPECT</title><link rel="canonical" href="./">
<script>const target=new URL('./',location.href);target.search=location.search;target.hash=location.hash;location.replace(target.href);</script>
</head><body><a href="./">ゲームを開く</a></body></html>\n`;
}

export function canonicalGameEntryPlugin(){
 return {name:'canonical-game-entry',generateBundle(){
  for(const fileName of legacyGameEntries)this.emitFile({type:'asset',fileName,source:gameEntryRedirect()});
 }};
}
