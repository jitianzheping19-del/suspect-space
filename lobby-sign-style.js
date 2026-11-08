// Shared facility signs use the same readable hierarchy in every lobby area.
export function paintLobbySign(ctx,text,width=1024,height=240){
 const raw=String(text),parts=raw.split(/\s*[·｜]\s*/),title=parts[0];
 const kind=/フットサル|サッカー/.test(title)?'ball':/鬼ごっこ/.test(title)?'tag':/床|サバイバル/.test(title)?'tiles':/練習|タスク/.test(title)?'book':/カスタマイズ/.test(title)?'shirt':/写真|撮影|カメラ/.test(title)?'camera':/ガチャ/.test(title)?'capsule':'info';
 const accent={ball:'#75dfce',tag:'#ffbe74',tiles:'#a7afff',book:'#91c7ff',shirt:'#e5c992',camera:'#e6b9ed',capsule:/特別/.test(title)?'#c5b0ff':'#edcf88',info:'#a9d5e0'}[kind];
 const subtitle=parts.slice(1).join(' · ')||({ball:'チームでゴールを決めよう',tag:'追いかけてタッチ',tiles:'最後まで生き残ろう',book:'タスク / 役職能力',shirt:'衣装を着替える',camera:/ライブラリ|カメラ/.test(title)?'撮影 / 写真を見る':'みんなで記念撮影',capsule:/特別/.test(title)?'特別チケットで抽選':'通常チケットで抽選',info:'最新の追加・改善・修正'}[kind]);
 ctx.save();ctx.clearRect(0,0,width,height);ctx.scale(width/1024,height/240);
 const bg=ctx.createLinearGradient(0,0,1024,240);bg.addColorStop(0,'#142533');bg.addColorStop(1,'#0b151f');ctx.fillStyle=bg;ctx.strokeStyle='#93afbf55';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(4,4,1016,232,28);ctx.fill();ctx.stroke();
 if(!/フットサル|サッカー|鬼ごっこ|サバイバル|カスタマイズ|練習|タスク|写真|撮影|カメラ|ガチャ|アプデ|アップデート/.test(title)){let size=raw.length<3?150:82;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+size+'px sans-serif';while(ctx.measureText(raw).width>940&&size>32)ctx.font='700 '+(--size)+'px sans-serif';ctx.fillStyle='#edf5fa';ctx.fillText(raw,512,120,940);ctx.restore();return;}
 ctx.fillStyle=accent;ctx.beginPath();ctx.roundRect(5,33,6,174,3);ctx.fill();ctx.fillStyle=accent+'18';ctx.beginPath();ctx.roundRect(35,34,172,172,24);ctx.fill();
 ctx.save();ctx.translate(121,120);ctx.strokeStyle=accent;ctx.fillStyle=accent;ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';const line=(points,close=false)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(close)ctx.closePath();ctx.stroke();};const circle=(x,y,r,fill=false)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);fill?ctx.fill():ctx.stroke();};
 if(kind==='ball'){circle(0,0,52);line([[0,-23],[23,-7],[15,21],[-15,21],[-23,-7]],true);for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;line([[Math.cos(a)*25,Math.sin(a)*25],[Math.cos(a)*50,Math.sin(a)*50]]);}}
 else if(kind==='tag'){circle(16,-43,12,true);line([[8,-20],[-12,8],[15,24],[37,52]]);line([[-12,8],[-26,39],[-53,47]]);line([[-10,-11],[-35,3],[-50,-10]]);line([[8,-20],[33,2],[52,-7]]);}
 else if(kind==='tiles'){for(const [x,y]of[[-47,-47],[7,-47],[-47,7]]){ctx.strokeRect(x,y,40,40);}ctx.setLineDash([8,8]);ctx.strokeRect(7,7,40,40);}
 else if(kind==='book'){line([[0,-39],[-25,-49],[-55,-40],[-55,42],[-25,34],[0,44],[25,34],[55,42],[55,-40],[25,-49],[0,-39],[0,44]]);line([[-42,-18],[-20,-22]]);line([[20,-22],[42,-18]]);line([[-42,2],[-20,-2]]);line([[20,-2],[42,2]]);}
 else if(kind==='shirt'){line([[-19,-48],[-48,-29],[-66,-3],[-39,14],[-28,-4],[-28,50],[28,50],[28,-4],[39,14],[66,-3],[48,-29],[19,-48]],true);ctx.beginPath();ctx.arc(0,-48,19,0,Math.PI);ctx.stroke();}
 else if(kind==='camera'){ctx.beginPath();ctx.roundRect(-59,-31,118,78,14);ctx.stroke();line([[-30,-32],[-18,-51],[18,-51],[30,-32]]);circle(0,7,26);circle(42,-14,4,true);}
 else if(kind==='capsule'){ctx.save();ctx.rotate(-.55);ctx.beginPath();ctx.roundRect(-35,-60,70,120,35);ctx.stroke();line([[-34,0],[34,0]]);ctx.restore();circle(43,-47,5,true);circle(-48,42,5,true);}
 else{ctx.beginPath();ctx.roundRect(-43,-54,86,108,10);ctx.stroke();line([[-23,-27],[23,-27]]);line([[-23,-3],[23,-3]]);line([[-23,21],[10,21]]);}
 ctx.restore();ctx.textAlign='left';ctx.textBaseline='middle';let size=68;ctx.font='700 '+size+'px "Hiragino Sans","Noto Sans JP",sans-serif';while(ctx.measureText(title).width>735&&size>42)ctx.font='700 '+(--size)+'px "Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillStyle='#f1f5f8';ctx.fillText(title,244,94,735);ctx.font='500 36px "Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillStyle='#bdccd6';ctx.fillText(subtitle,247,166,730);ctx.restore();
}
