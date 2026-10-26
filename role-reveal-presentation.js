import './role-reveal-presentation.css';
const active=new WeakMap();
export function animateRoleReveal(stage,kind='role'){
 if(!stage)return;
 for(const animation of active.get(stage)||[])animation.cancel();
 stage.dataset.revealPhase=kind;
 let frame=stage.querySelector('.roleRevealFrame');
 if(!frame){frame=document.createElement('div');frame.className='roleRevealFrame';frame.setAttribute('aria-hidden','true');frame.innerHTML='<i class="revealArc left"></i><i class="revealArc right"></i><i class="revealCut"></i>';stage.prepend(frame);}
 const animations=[];active.set(stage,animations);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const play=(node,frames,duration,delay=0)=>{if(node?.animate)animations.push(node.animate(frames,{duration,delay,easing:'cubic-bezier(.16,.85,.25,1)',fill:'backwards'}));};
 play(stage.querySelector('.card'),[{opacity:0,transform:'translateY(18px) scale(.92)'},{opacity:1,transform:'translateY(0) scale(1)'}],620);
 play(stage.querySelector('#roleRevealTitle'),[{opacity:0,transform:'translateY(20px)',letterSpacing:'.32em'},{opacity:1,transform:'translateY(0)',letterSpacing:'.06em'}],640,120);
 play(stage.querySelector('#roleLineup'),[{opacity:0,transform:'translateY(26px) scale(.9)'},{opacity:1,transform:'translateY(0) scale(1)'}],650,200);
 play(frame.querySelector('.left'),[{opacity:0,transform:'translateX(-20%) rotate(-55deg)'},{opacity:.7,transform:'translateX(0) rotate(-18deg)'}],740);
 play(frame.querySelector('.right'),[{opacity:0,transform:'translateX(20%) rotate(55deg)'},{opacity:.7,transform:'translateX(0) rotate(18deg)'}],740);
 play(frame.querySelector('.revealCut'),[{opacity:0,transform:'scaleX(.1)'},{opacity:.8,transform:'scaleX(1)',offset:.35},{opacity:0,transform:'scaleX(1.15)'}],760);
}
