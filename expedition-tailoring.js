// The design is drawn on the garment's own UVs, so its piping and emblems stay
// in place on the fitted coat in both crew rigs, including embedded lobby scenes.
const expeditionPatterns = {
 meteorpost:      ['jacket','#d3a669','M-17 -9H17V11H-17ZM-17 -9L0 4L17 -9M-16 10L-6 1M7 1L16 10'],
 reefdiver:       ['vest','#e98166','M0 15V-13M0 2L-9 -4V-11M-9 -4L-16 -8M0 7L9 0V-10M9 0L16 -5'],
 glacierguide:    ['parka','#dd8946','M-19 12L-7 -8L-2 -1L5 -15L20 12ZM-12 1L-7 -2L-4 2M0 -4L5 -9L10 -2'],
 sporekeeper:     ['mantle','#dfb09a','M-18 1Q-14 -13 0 -13Q14 -13 18 1Q0 8 -18 1ZM-3 4L-5 14Q0 17 5 14L3 4M-11 1L-7 -2M8 -4L11 -1'],
 nightconductor:  ['jacket','#a72f42','M-15 2H15L12 -6H-9L-12 -13H-16ZM-12 5H17M-11 9A3 3 0 1 0 -5 9A3 3 0 1 0 -11 9M6 9A3 3 0 1 0 12 9A3 3 0 1 0 6 9'],
 cloudsurveyor:   ['mantle','#d4bb84','M0 -18L5 -3L17 0L4 5L0 17L-4 4L-17 0L-4 -4ZM0 -12V0L8 0'],
 emberpotter:     ['apron','#b76e48','M-7 -13H7L5 -7Q19 -1 13 9L7 15H-7L-13 9Q-19 -1 -5 -7ZM-10 3Q0 -3 10 3'],
 polarradio:      ['parka','#8edbc7','M-13 -9Q-10 7 7 9L-13 -9ZM0 4L10 -8M-6 8L-9 15H6M7 -13Q15 -12 16 -5'],
 windmillwright:  ['apron','#daae65','M-2 0L-5 -16L2 -12L2 -2L16 -5L12 2L2 2L5 16L-2 12L-2 2L-16 5L-12 -2Z'],
 amberapiarist:   ['mantle','#d09c47','M-13 -7L-7 -11L-1 -7V0L-7 4L-13 0ZM0 -7L6 -11L12 -7V0L6 4L0 0ZM-7 5L-1 1L5 5V12L-1 16L-7 12Z'],
 auriclighthouse:['surcoat','#24668b','M-8 14L-5 -5H5L8 14ZM-8 -5H8V-12H-8ZM-10 -12L0 -18L10 -12M-18 -7L-12 -9M12 -9L18 -7'],
 gildedorgan:    ['brocade','#813859','M-16 10V-14H-11V10ZM-7 10V-6H-2V10ZM2 10V-6H7V10ZM11 10V-14H16V10ZM-17 14H17'],
 gildednautilus: ['wave','#49a79f','M0 1Q4 -6 8 0Q12 8 2 10Q-12 12 -13 0Q-14 -16 4 -16Q21 -16 19 2M-13 0L-18 3M-9 -10L-13 -15M4 -16L5 -20'],
 aurichourglass: ['brocade','#8e79bb','M-10 -15H10M-8 -12Q-9 -5 0 0Q9 6 8 12H-8Q-9 6 0 0Q9 -5 8 -12ZM-10 15H10M-5 10L0 5L5 10Z'],
 twingoldkoi:    ['wave','#b84b34','M-13 3Q-5 -14 9 -9Q14 1 0 7Q-7 10 -13 3ZM-13 3L-19 0L-17 9ZM5 -6L8 -5'],
 origamicrane:   ['surcoat','#a54244','M-19 -9L-2 -2L-6 -13L2 -6L9 -16L16 -14L10 -11L7 1L0 9L-4 3ZM-2 -2L0 9M2 -6L7 1'],
 dawngoldharp:   ['brocade','#589580','M-13 13V-12Q-6 -7 1 -12Q9 -18 14 -10L-6 13ZM-8 -8V9M-3 -8V5M2 -10V0M7 -12V-4'],
 auriclotus:     ['wave','#ad5790','M0 13Q-17 8 -18 -4Q-6 -4 0 13Q-9 -1 0 -15Q9 -1 0 13Q6 -4 18 -4Q17 8 0 13Z'],
 gildedskyship:  ['surcoat','#397596','M-17 7L17 5L10 13H-10ZM-5 3V-12L-15 3ZM0 2V-17L13 2Z'],
 aurickeywarden: ['brocade','#438583','M-9 2A7 7 0 1 1 -2 -5A7 7 0 0 1 -9 2ZM-4 0L12 15L17 10L14 7L11 10L8 7L10 5']
};

const expeditionClothMaps = new WeakMap();
function expeditionClothMap(T,spec,pattern,material){
 if(!globalThis.document || !globalThis.Path2D)return;
 let maps=expeditionClothMaps.get(T.CanvasTexture);
 if(!maps){maps=new Map();expeditionClothMaps.set(T.CanvasTexture,maps);}
 let entry=maps.get(spec.id);
 if(!entry){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d');if(!c)return;
  const [cut,contrast,mark]=pattern;
  const css=n=>'#'+n.toString(16).padStart(6,'0'),body=css(spec.color),gold=css(spec.trim);
  const metallic=spec.rarity===5;
  c.fillStyle=body;c.fillRect(0,0,512,256);
  // Seam at the spine. Each visible half includes its own side panel and lining.
  for(const side of [-1,1]){
   c.save();c.translate(256,0);c.scale(side,1);
   const panel=new Path2D(({jacket:'M0 0H93L58 82L28 119L12 205L0 193Z',vest:'M43 0H136L107 61L63 111L48 201H28L42 93Z',parka:'M0 0H160V39Q73 37 0 78Z',mantle:'M0 0H209V42L104 91L38 71L0 104Z',apron:'M8 207L17 54L39 0H65L42 69L70 204Z',surcoat:'M0 0H94L45 82L29 222L0 199Z',wave:'M0 47Q55 90 96 22Q119 1 173 0L169 34Q118 33 90 75Q50 134 0 87Z',brocade:'M31 0H88L56 66L47 228L20 209L26 66Z'})[cut]);
   c.fillStyle=contrast;c.fill(panel);c.strokeStyle=gold;c.lineWidth=metallic?3:2;c.stroke(panel);
   c.setLineDash([3,5]);c.lineWidth=1;c.strokeStyle='#ffe9ca';c.translate(3,0);c.stroke(panel);c.restore();
  }
  // Inlaid borders and the belt are wide enough to read after mipmapping.
  c.fillStyle=metallic?'#392d32':'#3b3130';c.fillRect(0,171,512,17);
  c.fillStyle=gold;c.fillRect(0,171,512,2);c.fillRect(0,186,512,2);
  c.fillStyle=contrast;c.fillRect(0,224,512,23);
  const emblem=new Path2D(mark);
  function stamp(x,y,scale,ink){
   c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=2.15;c.lineCap='round';c.lineJoin='round';c.strokeStyle=ink;c.stroke(emblem);c.restore();
  }
  for(let x=16;x<512;x+=32)stamp(x,236,.44,gold);
  for(const x of [0,256,512]){
   const width=x===256?26:43,y=x===256?116:99;
   c.save();c.translate(x,y);
   c.beginPath();c.moveTo(0,-width);c.quadraticCurveTo(width,-width*.6,width*.91,0);c.quadraticCurveTo(width*.64,width*.72,0,width);c.quadraticCurveTo(-width*.64,width*.72,-width*.91,0);c.quadraticCurveTo(-width,-width*.6,0,-width);c.closePath();
   c.fillStyle=body;c.fill();c.strokeStyle=gold;c.lineWidth=metallic?3:2;c.stroke();c.restore();
   stamp(x,y,width/25,metallic?'#ffedbb':'#fff0d8');
  }
  // Let the underlying PBR finish supply fine fabric grain and brushed highlights.
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=T.RepeatWrapping;tex.anisotropy=2;
  tex.name='Expedition tailoring / '+spec.id;entry={tex,users:0};maps.set(spec.id,entry);
 }
 material.color.setHex(0xffffff);material.map=entry.tex;entry.users++;
 const release=()=>{material.removeEventListener('dispose',release);if(--entry.users===0){entry.tex.dispose();maps.delete(spec.id);}};
 material.addEventListener('dispose',release);
}

export function addExpeditionCoat(T,spec,mobile,own,mat,mesh,parent){
 const pattern=expeditionPatterns[spec.id];
 const cut=pattern[0],metallic=spec.rarity===5;
 const cloth=mat(spec.color,metallic?.26:.065,metallic?.38:.78);
 cloth.userData.costumeFinish=metallic?'metal':'cloth';
 expeditionClothMap(T,spec,pattern,cloth);
 const circles=mobile?24:36,verts=[],uvs=[],indices=[];
 const mantle=cut==='mantle'||cut==='wave',long=cut==='surcoat'||cut==='brocade'||cut==='jacket';
 const rows=[[0,.458],[.04,.485],[.19,.486],[.40,.469],[.68,.473],[.87,mantle?.51:.477],[1,.447]];
 for(const [v,r] of rows){
  for(let j=0;j<=circles;j++){
   const u=j/circles,angle=(u-.5)*2*Math.PI,front=Math.cos(angle);
   const bottom=(long?.43:.53)+(long?.09:.036)*Math.cos(2*angle) + (cut==='apron'?-.105*Math.max(0,front):0);
   const top=1.13+.27*(1-front)/2;
   const flare=(long||mantle?.022:.010)*Math.cos(8*angle)*(1-v)**2;
   verts.push((r+flare)*Math.sin(angle),bottom+(top-bottom)*v,(r+flare)*front);
   uvs.push(u,v);
  }
 }
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<circles;j++){
  const a=i*(circles+1)+j,b=a+circles+1;indices.push(a,a+1,b,a+1,b+1,b);
 }
 const g=own(new T.BufferGeometry());g.setIndex(indices);g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();
 // Match the two copies of the rear seam so it catches one continuous highlight.
 const n=g.getAttribute('normal');
 for(let row=0;row<rows.length;row++){
  const a=row*(circles+1),b=a+circles,v=new T.Vector3().fromBufferAttribute(n,a).add(new T.Vector3().fromBufferAttribute(n,b)).normalize();
  n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);
 }
 cloth.side=T.DoubleSide;mesh(g,cloth,0,0,0,1,1,1,parent);
}

// Drape a short, lined cape from the shoulder clasps. Sample the rear emblem
// of the same textile, keeping it large across the width of the cape.
export function addExpeditionCape(T,spec,width,own,mat,mesh,pivot){
 const cloth=mat(spec.color,.12,.64);
 cloth.userData.costumeFinish='cloth';
 cloth.side=T.DoubleSide;
 expeditionClothMap(T,spec,expeditionPatterns[spec.id],cloth);
 const g=own(new T.PlaneGeometry(1,1,16,8));
 const positions=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<positions.count;i++){
  const side=positions.getX(i)*2,drop=1-uv.getY(i);
  const hem=.81+.09*(1-Math.abs(side));
  positions.setXYZ(i,side*width*(.30+.18*drop),
   -drop*hem+.038*side*side,
   -.13-.095*drop+.20*side*side+.031*Math.cos(side*Math.PI*3)*drop);
  uv.setX(i,-side*.19);
 }
 g.computeVertexNormals();
 mesh(g,cloth,0,0,0,1,1,1,pivot);
}
