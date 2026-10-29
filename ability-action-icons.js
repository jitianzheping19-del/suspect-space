// The shared HUD owns these models, materials and geometry. No separate canvas.
export const ROLE_ABILITY_ICONS=Object.freeze({
 engineer:'repair',scientist:'vitals',tracker:'radar',detective:'investigate',medic:'medicalShield',guardianAngel:'angel',
 shapeshifter:'masks',morphing:'scanMask',doorer:'door',phantom:'ghost',viper:'venom',photographer:'camera',
 lightkeeper:'bulb',navigator:'compass',cupid:'heartBow',camouflager:'camouflage',cleaner:'broom',
 teleportJackal:'portal',teleporter:'portal',vampire:'fangs',hawk:'eye',niceHawk:'eye',
 waveCannon:'cannon',waveCannonJackal:'cannon',jackalWaveCannon:'cannon',sage:'shield',matryoshka:'doll',
 triggerHappy:'twinGuns',conjurer:'summon',mirage:'fakeBody',arsonist:'oil',vulture:'scavenge',speedBooster:'speed',
 revenant:'curse',penguin:'capture',samurai:'katana',suicideBomber:'blast',slugger:'bat',rocket:'cage',necromancer:'revive',
 santa:'gift',chief:'badge',jumpDancer:'dance',lighter:'flashlight',ubiquitous:'drone',
 overloader:'overload',cracker:'crack',missionary:'scripture',bodyguard:'guard',sandworm:'worm',eater:'mouth',freezer:'freeze',
 fencer:'parry',bait:'report',evolver:'claws',carrier:'carry',bomber:'bomb',boxer:'glove',
 jackal:'recruit',jackalSidekick:'recruit',vampireDependent:'fangs'
});
export function abilityIconKind(p,g={},stamp=Date.now()){
 const role=p?.subrole||p?.role;
 if(role==='carrier'&&p.carrierBodyId)return 'dropBody';
 if(role==='fencer'&&Number(p.fencerCounterUntil)>stamp)return 'riposte';
 if(role==='bomber'&&p.bomberBomb)return 'timerBomb';
 if(role==='boxer'&&p.boxerCharge)return 'punch';
 if(role==='evolver'&&p.evolverMeal)return 'consume';
 if(role==='engineer'&&(!g.sabotage||p.remoteRepairUsed))return 'vent';
 if(role==='arsonist'){
  const others=Object.entries(g.players||{}).filter(([,q])=>q!==p&&q?.alive&&!q.observer&&!q.disconnected);
  if(others.length&&others.every(([id])=>p.dousedTargets?.[id]))return 'flame';
 }
 if(role==='penguin'&&p.penguinTargetId)return 'knife';
 if(role==='ubiquitous'&&p.drone?.active)return 'droneReturn';
 return ROLE_ABILITY_ICONS[role]||'ability';
}
export function syncAbilityButtonIcons(root,p,g,stamp,color='#72e7cf'){
 const specs={abilityBtn:[abilityIconKind(p,g,stamp),color],killSecondBtn:['doubleKnife','#ff7984'],rocketLaunchBtn:['rocket','#ffac72'],waveHawkBtn:['eye','#8fe8f7'],jackalSidekickBtn:[p?.subrole==='vampire'?'bloodRecruit':'recruit',p?.subrole==='vampire'?'#d64b68':'#84e2c0']};
 for(const[id,[kind,tint]]of Object.entries(specs)){const b=root.querySelector('#'+id);if(!b)continue;if(b.dataset.actionIcon!==kind)b.dataset.actionIcon=kind;if(b.dataset.actionColor!==tint)b.dataset.actionColor=tint;}
}

const models=new Set([...Object.values(ROLE_ABILITY_ICONS),'dropBody','riposte','timerBomb','punch','consume','flame','droneReturn','doubleKnife','bloodRecruit','admin','security','medical'].filter(k=>!['door','vent','eye','report','knife'].includes(k)));
export function buildAbilityActionIcon({THREE:T,kind,accent,geometry,material,basic,polygon,mesh,cube}){
 if(!models.has(kind))return null;
 const root=new T.Group(),steel=material(0xdbeaf3,{metalness:.72,roughness:.25}),ink=material(0x162c40),tint=material(accent,{emissive:accent,emissiveIntensity:.3}),white=basic(0xf5faff);
 const box=(p,m,x,y,z,w,h,d)=>mesh(p,cube,m,x,y,z,[w,h,d]);
 const orbGeo=geometry('ability-orb',()=>new T.SphereGeometry(1,12,8));
 const orb=(p,m,x,y,z,a,b=a,c=a)=>mesh(p,orbGeo,m,x,y,z,[a,b,c]);
 const ringGeo=geometry('ability-torus',()=>new T.TorusGeometry(1,.055,6,32));
 const ring=(p,m,x,y,z,r)=>mesh(p,ringGeo,m,x,y,z,[r,r,r]);
 const line=(p,m,x,y,xx,yy,z=.2,width=.08)=>{const o=box(p,m,(x+xx)/2,(y+yy)/2,z,width,Math.hypot(xx-x,yy-y),.1);o.rotation.z=-Math.atan2(xx-x,yy-y);return o;};
 const shape=(p,m,points,z=0)=>mesh(p,polygon(points,.12),m,0,0,z);
 const cross=(p,x=0,y=0,z=.2,s=.45)=>{box(p,white,x,y,z,s,.13,.08);box(p,white,x,y,z,.13,s,.08);};
 const shield=(p,m=tint)=>{shape(p,m,[[-.53,.52],[0,.7],[.53,.52],[.43,-.25],[0,-.69],[-.43,-.25]]);shape(p,ink,[[-.35,.39],[0,.5],[.35,.39],[.27,-.17],[0,-.45],[-.27,-.17]],.16);};
 const blade=(p,x=0,angle=-.5)=>{const g=new T.Group();g.position.x=x;g.rotation.z=angle;p.add(g);shape(g,steel,[[-.065,-.22],[-.065,.55],[0,.82],[.065,.55],[.065,-.22]]);box(g,tint,0,-.44,.04,.14,.42,.18);box(g,steel,0,-.23,.04,.48,.09,.2);return g;};
 const body=(p,ghost=false)=>{orb(p,ghost?tint:steel,0,.08,.03,.36,.48,.25);orb(p,ink,.04,.2,.26,.28,.17,.1);if(!ghost)for(const side of[-1,1])box(p,steel,side*.2,-.47,.05,.22,.24,.25);};
 const corpse=p=>{const b=new T.Group();p.add(b);b.rotation.z=Math.PI/2;body(b);return b;};
 const star=(p,m,r=.65)=>shape(p,m,Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,s=i%2?r*.46:r;return[Math.cos(a)*s,Math.sin(a)*s];}));
 const bomb=(p)=>{orb(p,ink,0,-.08,0,.5);ring(p,steel,0,-.08,.44,.37);line(p,tint,.1,.4,.25,.7);for(let i=0;i<3;i++){const a=i*Math.PI/3;line(p,tint,.2+Math.sin(a)*.1,.7+Math.cos(a)*.1,.2-Math.sin(a)*.1,.7-Math.cos(a)*.1,.2,.05);}};
 const glove=p=>{orb(p,tint,-.03,.07,0,.47,.48,.28);orb(p,tint,.4,-.1,.06,.2,.28,.25);box(p,ink,-.04,-.5,.03,.64,.24,.4);for(let i=0;i<3;i++)line(p,steel,-.23+i*.18,.28,-.23+i*.18,.45,.27,.035);box(p,steel,-.04,-.51,.26,.3,.08,.06);};
 switch(kind){
 case 'admin':box(root,ink,0,0,0,1.4,1.08,.18);for(let i=0;i<3;i++){const p=box(root,tint,(i-1)*.39,0,.14,.35,.85,.07);p.rotation.y=i===1?-.2:.2;}for(const [x,y]of[[-.35,.15],[.07,-.17],[.36,.22]]){orb(root,white,x,y,.25,.07);box(root,white,x,y-.14,.25,.13,.17,.04);}break;
 case 'security':{const c=new T.Group();root.add(c);c.rotation.z=-.14;box(c,steel,-.06,.15,0,.93,.51,.4);box(c,tint,-.08,.42,.03,1.18,.11,.54);ring(c,ink,.28,.15,.3,.2);orb(c,tint,.28,.15,.34,.13,.13,.06);line(root,steel,-.08,-.08,-.23,-.48,.03,.13);box(root,ink,-.23,-.58,.03,.65,.14,.24);orb(c,white,-.36,.22,.23,.045);break;}
 case 'medical':box(root,ink,0,.05,0,1.2,.88,.2);box(root,tint,0,.05,.14,1,.65,.05);cross(root,0,.06,.24,.49);box(root,steel,0,-.52,.02,.16,.28,.15);box(root,steel,0,-.65,.02,.64,.12,.27);break;
 case 'parry':shield(root);root.scale.setScalar(.86);blade(root,.38,-.52);break;
 case 'riposte':case 'katana':case 'doubleKnife':blade(root,-.24,-.65);blade(root,.24,.65);if(kind==='katana')root.remove(root.children[1]);break;
 case 'claws':case 'consume':{
  box(root,ink,0,-.36,.02,.8,.35,.28);for(let i=0;i<3;i++)shape(root,steel,[[-.31+i*.25,-.2],[-.28+i*.25,.55],[-.17+i*.25,.78],[-.15+i*.25,-.2]]);if(kind==='consume')ring(root,tint,0,.12,.2,.64);else for(const x of[-.25,0,.25])box(root,tint,x,-.35,.2,.08,.18,.06);break;}
 case 'carry':case 'dropBody':{
  const c=corpse(root);c.position.y=.12;c.scale.setScalar(.8);for(const side of[-1,1]){line(root,tint,side*.64,-.55,side*.48,-.14,.28,.18);line(root,tint,side*.48,-.14,side*.24,-.25,.28,.18);}if(kind==='dropBody'){line(root,steel,0,-.36,0,-.73,.35);line(root,steel,0,-.73,-.14,-.57,.35);line(root,steel,0,-.73,.14,-.57,.35);}break;}
 case 'bomb':case 'blast':case 'timerBomb':bomb(root);if(kind==='timerBomb'){const dial=ring(root,tint,.31,.27,.56,.29);line(root,white,.31,.27,.31,.45,.64,.045);line(root,white,.31,.27,.44,.23,.64,.045);}if(kind==='blast')for(let i=0;i<6;i++){const a=i*Math.PI/3;line(root,tint,Math.cos(a)*.6,Math.sin(a)*.6,Math.cos(a)*.78,Math.sin(a)*.78,.1,.06);}break;
 case 'glove':case 'punch':glove(root);if(kind==='punch')for(let i=0;i<3;i++)line(root,steel,-.7,.32-i*.25,-.46,.32-i*.25,.1,.05);break;
 case 'freeze':{
  for(let i=0;i<6;i++){const g=new T.Group();root.add(g);g.rotation.z=i*Math.PI/3;line(g,tint,0,0,0,.72);line(g,steel,0,.43,-.18,.59,.23,.06);line(g,steel,0,.43,.18,.59,.23,.06);}orb(root,white,0,0,.18,.13);break;}
 case 'overload':ring(root,steel,0,0,0,.61);for(let i=0;i<4;i++)box(root,ink,(i%2?1:-1)*.5,i<2?.3:-.3,-.03,.22,.35,.24);shape(root,tint,[[.03,.65],[-.34,-.04],[-.02,-.04],[-.11,-.66],[.38,.14],[.06,.14]],.18);break;
 case 'crack':box(root,ink,0,0,0,1.15,1.12,.16);for(const s of[-1,1])for(let i=0;i<3;i++)line(root,steel,s*.23,(i-1)*.3,s*.56,(i-1)*.3,.15,.06);line(root,tint,.1,.55,-.15,.08,.24,.1);line(root,tint,-.15,.08,.17,-.1,.24,.1);line(root,tint,.17,-.1,-.12,-.55,.24,.1);break;
 case 'scripture':for(const s of[-1,1]){const leaf=box(root,steel,s*.3,0,0,.55,1.05,.18);leaf.rotation.y=s*.22;}box(root,tint,0,0,.17,.1,1.1,.12);cross(root,.3,.1,.2,.37);for(let i=0;i<3;i++)box(root,ink,-.3,.22-i*.18,.19,.32,.035,.03);break;
 case 'guard':case 'medicalShield':case 'shield':case 'angel':shield(root);if(kind==='medicalShield')cross(root,0,0,.38);else if(kind==='guard')star(root,steel,.29).position.z=.25;else if(kind==='angel'){ring(root,steel,0,.72,.05,.26);for(const s of[-1,1])shape(root,steel,[[s*.42,.34],[s*.82,.6],[s*.67,-.22],[s*.4,-.32]]);}else line(root,steel,-.23,.04,-.04,-.17,.3,.09),line(root,steel,-.04,-.17,.3,.24,.3,.09);break;
 case 'worm':for(let i=0;i<5;i++){const a=i*.5-.7;orb(root,i%2?steel:tint,Math.sin(a)*.35,-.5+i*.2,0,.28-i*.015);}orb(root,ink,.15,.48,.17,.29,.23,.12);for(const s of[-1,1])shape(root,steel,[[s*.06,.53],[s*.21,.51],[s*.11,.32]],.27);break;
 case 'mouth':ring(root,tint,0,0,0,.57);orb(root,ink,0,0,.03,.53,.51,.1);for(const side of[-1,1])for(let i=0;i<3;i++){const x=(i-1)*.28;shape(root,steel,[[x-.1,side*.4],[x+.1,side*.4],[x,side*.15]],.2);}break;
 case 'fangs':case 'venom':ring(root,ink,0,0,0,.51);for(const s of[-1,1])shape(root,steel,[[s*.16,.37],[s*.43,.35],[s*.29,-.42]],.15);orb(root,tint,0,-.48,.1,.12,.19,.08);if(kind==='venom')orb(root,tint,0,.39,.13,.18);break;
 case 'repair':{const g=new T.Group();root.add(g);g.rotation.z=-.6;box(g,tint,0,-.2,0,.2,.95,.18);orb(g,steel,0,.39,0,.33);box(g,ink,0,.56,.15,.25,.38,.28);ring(g,steel,0,-.61,.13,.1);break;}
 case 'vitals':box(root,ink,0,0,0,1.3,.96,.2);box(root,tint,0,0,.13,1.1,.72,.05);const pulse=[[-.5,0],[-.25,0],[-.12,.3],[.05,-.3],[.23,.1],[.5,.1]];for(let i=1;i<pulse.length;i++)line(root,white,...pulse[i-1],...pulse[i],.23,.055);break;
 case 'radar':case 'compass':ring(root,steel,0,0,0,.65);ring(root,ink,0,0,.06,.39);if(kind==='radar'){line(root,tint,0,0,.4,.47,.2);orb(root,tint,-.28,.2,.2,.1);orb(root,tint,.24,-.34,.2,.075);}else{shape(root,tint,[[.05,.58],[-.23,-.22],[.19,-.06]]);shape(root,steel,[[-.05,-.58],[.23,.22],[-.19,.06]],.14);}break;
 case 'investigate':ring(root,steel,-.12,.16,0,.43);line(root,tint,.19,-.18,.58,-.63,.08,.2);orb(root,tint,-.12,.16,.04,.25,.25,.04);break;
 case 'masks':case 'scanMask':case 'camouflage':{
  for(const s of[-1,1]){const p=new T.Group();root.add(p);p.position.set(s*.22,s*.13,s*.12);shape(p,s<0?steel:tint,[[-.35,.46],[.35,.46],[.29,-.18],[0,-.47],[-.29,-.18]]);for(const x of[-.15,.15])orb(p,ink,x,.15,.18,.085,.1,.035);}if(kind==='scanMask')for(const y of[-.46,0,.46])box(root,white,0,y,.42,1.1,.035,.035);if(kind==='camouflage')for(let i=0;i<3;i++)box(root,ink,(i-1)*.27,-.14+i*.16,.45,.22,.18,.07);break;}
 case 'ghost':case 'curse':body(root,true);for(const s of[-1,1])orb(root,white,s*.13,.18,.3,.07,.1,.03);if(kind==='curse')for(const s of[-1,1])line(root,tint,s*.46,-.45,s*.65,.48,.1,.06);break;
 case 'camera':box(root,ink,0,-.06,0,1.2,.8,.35);box(root,tint,-.29,.41,.03,.37,.19,.26);ring(root,steel,.05,-.06,.27,.34);orb(root,tint,.05,-.06,.3,.24,.24,.1);box(root,white,.42,.17,.23,.16,.12,.06);break;
 case 'bulb':case 'flashlight':if(kind==='bulb'){orb(root,tint,0,.24,0,.42);box(root,steel,0,-.35,0,.35,.38,.22);for(const y of[-.25,-.38])box(root,ink,0,y,.13,.38,.05,.06);for(let i=0;i<5;i++){const a=i*Math.PI/4;line(root,steel,Math.cos(a)*.58,.24+Math.sin(a)*.58,Math.cos(a)*.73,.24+Math.sin(a)*.73,.1,.05);}}else{const g=new T.Group();g.rotation.z=-.5;root.add(g);box(g,ink,0,-.17,0,.4,.85,.3);shape(g,steel,[[-.2,.15],[-.38,.52],[.38,.52],[.2,.15]]);box(g,tint,0,.53,.1,.7,.1,.3);box(g,tint,0,-.1,.18,.13,.23,.05);}break;
 case 'heartBow':{shape(root,tint,[[0,-.47],[-.48,.04],[-.43,.34],[-.19,.46],[0,.24],[.19,.46],[.43,.34],[.48,.04]],.1);line(root,steel,-.7,-.5,.64,.53,.28,.065);shape(root,steel,[[.39,.56],[.72,.64],[.64,.3]],.28);break;}
 case 'broom':line(root,steel,.38,.69,-.15,-.22,.1,.11);shape(root,tint,[[-.27,-.1],[.09,-.3],[-.16,-.72],[-.65,-.47]]);for(let i=0;i<4;i++)line(root,ink,-.28+i*.09,-.3,-.56+i*.12,-.55,.16,.035);break;
 case 'portal':for(const s of[-1,1]){const r=ring(root,s<0?steel:tint,s*.34,0,s*.1,.43);r.scale.x*=.55;}line(root,tint,-.23,0,.29,0,.3);line(root,tint,.29,0,.09,.18,.3);break;
 case 'cannon':box(root,ink,0,-.45,0,.8,.25,.3);box(root,steel,0,-.1,0,.48,.65,.38);box(root,tint,0,.4,0,.9,.44,.4);for(const x of[-.27,0,.27])box(root,ink,x,.4,.24,.13,.28,.08);ring(root,white,0,.4,.3,.12);break;
 case 'doll':orb(root,steel,0,-.18,0,.44,.5,.28);orb(root,tint,0,.4,0,.27,.3,.23);orb(root,ink,0,.41,.22,.15,.17,.06);ring(root,tint,0,-.18,.29,.23);break;
 case 'twinGuns':for(const s of[-1,1]){const p=new T.Group();root.add(p);p.position.x=s*.3;p.rotation.z=-s*.3;box(p,steel,0,.3,0,.35,.73,.25);box(p,ink,0,-.3,0,.22,.43,.22);box(p,tint,0,.12,.18,.17,.14,.08);}break;
 case 'summon':shape(root,tint,[[0,.68],[-.65,-.5],[.65,-.5]]);shape(root,ink,[[0,.4],[-.39,-.34],[.39,-.34]],.16);orb(root,white,0,-.04,.24,.12);break;
 case 'fakeBody':case 'scavenge':{const p=corpse(root);p.scale.setScalar(.88);if(kind==='fakeBody'){ring(root,tint,0,0,.3,.66);line(root,tint,-.52,-.5,.5,.52,.35,.08);}else for(const s of[-1,1])shape(root,tint,[[s*.2,.6],[s*.7,.18],[s*.32,.11]],.28);break;}
 case 'oil':box(root,tint,0,-.08,0,.7,.95,.34);ring(root,steel,-.15,.56,.03,.18);box(root,steel,.36,.4,.03,.42,.17,.23);shape(root,ink,[[0,.2],[-.17,-.12],[0,-.31],[.17,-.12]],.22);break;
 case 'flame':shape(root,tint,[[0,.78],[-.16,.22],[-.36,.47],[-.54,-.12],[-.32,-.57],[0,-.7],[.4,-.5],[.52,-.04],[.27,.3],[.19,-.08]]);shape(root,steel,[[0,.21],[-.23,-.22],[-.1,-.51],[.21,-.47],[.26,-.18]],.16);break;
 case 'speed':for(let i=0;i<2;i++)shape(root,i?tint:steel,[[-.6+i*.55,.58],[-.1+i*.55,0],[-.6+i*.55,-.58],[-.31+i*.55,-.58],[.19+i*.55,0],[-.31+i*.55,.58]]);break;
 case 'capture':case 'cage':body(root);if(kind==='capture'){ring(root,tint,0,.02,.31,.62);box(root,tint,0,-.5,.31,.8,.13,.15);}else{box(root,tint,0,.68,.32,1.1,.12,.18);box(root,tint,0,-.65,.32,1.1,.12,.18);for(const x of[-.49,-.17,.17,.49])box(root,tint,x,0,.34,.065,1.3,.09);}break;
 case 'revive':body(root,true);cross(root,.38,.41,.38,.55);ring(root,tint,0,-.56,0,.53).scale.y=.4;break;
 case 'gift':box(root,tint,0,-.1,0,1,.85,.55);box(root,steel,0,-.1,.33,.16,.85,.08);box(root,steel,0,.08,.33,1,.13,.08);box(root,tint,0,.38,.02,1.1,.16,.6);for(const s of[-1,1]){const bow=ring(root,steel,s*.19,.57,.1,.2);bow.scale.y=.65;bow.rotation.z=s*.4;}break;
 case 'badge':star(root,tint);orb(root,steel,0,0,.18,.24,.24,.08);break;
 case 'dance':for(const s of[-1,1]){box(root,tint,s*.34,.08,0,.08,.94,.1);orb(root,steel,s*.34,-.41,.04,.2,.14,.1);}line(root,tint,-.34,.55,.34,.4);break;
 case 'drone':case 'droneReturn':box(root,tint,0,0,0,.55,.38,.3);for(const x of[-.48,.48])for(const y of[-.42,.42]){line(root,steel,0,0,x,y,.02,.07);ring(root,tint,x,y,.1,.23);}orb(root,white,0,0,.22,.1);if(kind==='droneReturn'){line(root,white,-.28,-.63,.28,-.63,.23,.06);line(root,white,-.28,-.63,-.08,-.45,.23,.06);}break;
 case 'recruit':case 'bloodRecruit':{const b=new T.Group();root.add(b);b.position.x=-.22;b.scale.setScalar(.75);body(b,kind==='bloodRecruit');cross(root,.39,-.14,.35,.53);if(kind==='bloodRecruit')for(const s of[-1,1])shape(root,tint,[[s*.1,.54],[s*.67,.54],[s*.43,.12]],-.12);break;}
 default:return null;
 }
 return root;
}
