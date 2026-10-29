// Composited behind the existing transparent cinematic canvas. No extra renderer.
export function createKillCinematicBackground(){
 const backdrop=document.createElement('div');
 backdrop.className='ssx-kill-background';backdrop.setAttribute('aria-hidden','true');
 backdrop.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;visibility:hidden;isolation:isolate';
 const sparks=Array.from({length:20},(_,i)=>`<i style="--x:${(i*43+7)%100}%;--y:${(i*29+11)%100}%;--delay:${-i*.31}s;--drift:${i%2?1:-1};--size:${i%4?2:3}px"></i>`).join('');
 backdrop.innerHTML=`<style>
 .ssx-kill-background{--ssx-kill-accent:#ff7589;background:#030813;contain:layout paint}
 .ssx-kill-depth{position:absolute;inset:0;background:radial-gradient(ellipse at 52% 46%,#132b42 0%,#0a1729 40%,#030813 82%)}
 .ssx-kill-nebula{position:absolute;inset:-15%;background:radial-gradient(ellipse at 23% 42%,color-mix(in srgb,var(--ssx-kill-accent) 23%,transparent),transparent 42%),radial-gradient(ellipse at 80% 65%,#216ca333,transparent 35%);transform:rotate(-18deg)}
 .ssx-kill-stars{position:absolute;inset:0;background-image:radial-gradient(circle,#bedaf177 0 1px,transparent 1.5px),radial-gradient(circle,#7bb1d744 0 1px,transparent 1.5px);background-size:113px 127px,181px 173px;background-position:9px 23px,58px 91px;mask-image:radial-gradient(ellipse,transparent 15%,#000 80%);opacity:.65}
 .ssx-kill-halo{position:absolute;left:50%;top:49%;width:min(76vw,112vh);aspect-ratio:1;transform:translate(-50%,-50%);color:var(--ssx-kill-accent);opacity:.7}
 .ssx-kill-halo::before{content:'';position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,transparent 54%,color-mix(in srgb,var(--ssx-kill-accent) 13%,transparent) 66%,transparent 73%)}
 .ssx-kill-halo svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
 .ssx-kill-halo .outer{filter:drop-shadow(0 0 5px color-mix(in srgb,var(--ssx-kill-accent) 45%,transparent))}
 .ssx-kill-horizon{position:absolute;inset:71% -30% -50%;background:linear-gradient(transparent 0 96%,#6babc629 97% 100%),linear-gradient(90deg,transparent 0 96%,#6babc622 97% 100%);background-size:70px 46px;transform:perspective(300px) rotateX(62deg);transform-origin:50% 0;mask-image:linear-gradient(transparent,#000 25%,transparent 80%)}
 .ssx-kill-horizon::after{content:'';position:absolute;left:0;right:0;top:8%;height:2px;background:linear-gradient(90deg,transparent,var(--ssx-kill-accent),transparent);box-shadow:0 0 20px var(--ssx-kill-accent);opacity:.35}
 .ssx-kill-beam{position:absolute;left:-25%;top:50%;width:150%;height:22%;transform:rotate(-12deg);background:linear-gradient(transparent,color-mix(in srgb,var(--ssx-kill-accent) 7%,transparent),transparent);border-top:1px solid color-mix(in srgb,var(--ssx-kill-accent) 25%,transparent);border-bottom:1px solid color-mix(in srgb,var(--ssx-kill-accent) 12%,transparent);mask-image:linear-gradient(90deg,transparent,#000 23% 77%,transparent)}
 .ssx-kill-frame{position:absolute;inset:0;width:100%;height:100%;color:var(--ssx-kill-accent)}
 .ssx-kill-frame .armor{fill:#08121ee6;stroke:#7094ac44;stroke-width:1}
 .ssx-kill-frame .edge{fill:none;stroke:currentColor;stroke-width:2;opacity:.65;filter:drop-shadow(0 0 4px currentColor)}
 .ssx-kill-frame .detail{fill:none;stroke:#a4c3d9;stroke-width:1;opacity:.3}
 .ssx-kill-sparks{position:absolute;inset:5% 0}
 .ssx-kill-sparks i{position:absolute;left:var(--x);top:var(--y);width:var(--size);height:var(--size);border-radius:50%;background:var(--ssx-kill-accent);box-shadow:0 0 8px var(--ssx-kill-accent);opacity:.6}
 .ssx-kill-vignette{position:absolute;inset:0;background:radial-gradient(ellipse,transparent 35%,#01040c88 100%);box-shadow:inset 0 0 80px #01040c77}
 .ssx-kill-entry{position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 35%,color-mix(in srgb,var(--ssx-kill-accent) 30%,transparent) 49%,#e6f6ff77 50%,transparent 51%);opacity:0}
 @keyframes ssx-kill-orbit{to{transform:rotate(360deg)}}
 @keyframes ssx-kill-cloud{from{transform:rotate(-18deg) translateX(-3%)}to{transform:rotate(-12deg) translateX(3%)}}
 @keyframes ssx-kill-spark{0%{transform:translate(0,20px);opacity:0}20%{opacity:.7}80%{opacity:.35}100%{transform:translate(calc(var(--drift)*35px),-60px);opacity:0}}
 @keyframes ssx-kill-enter{0%{opacity:0;transform:translateX(-65%)}25%{opacity:.6}100%{opacity:0;transform:translateX(65%)}}
 .ssx-kill-nebula{animation:ssx-kill-cloud 6s ease-in-out infinite alternate}
 .ssx-kill-halo .outer{animation:ssx-kill-orbit 32s linear infinite;transform-origin:50% 50%}
 .ssx-kill-halo .inner{animation:ssx-kill-orbit 46s linear infinite reverse;transform-origin:50% 50%}
 .ssx-kill-sparks i{animation:ssx-kill-spark 3.5s linear var(--delay) infinite}
 .ssx-kill-background:not(.ssx-kill-slash-on) *{animation-play-state:paused}
 .ssx-kill-slash-on .ssx-kill-entry{animation:ssx-kill-enter .65s cubic-bezier(.15,.6,.3,1) both}
 @media(max-width:600px){.ssx-kill-halo{width:120vw}.ssx-kill-frame{opacity:.7}.ssx-kill-sparks i:nth-child(even){display:none}}
 @media(prefers-reduced-motion:reduce){.ssx-kill-background *{animation:none!important}.ssx-kill-entry{display:none}}
 </style>
 <div class="ssx-kill-depth"></div><div class="ssx-kill-nebula"></div><div class="ssx-kill-stars"></div>
 <div class="ssx-kill-halo"><svg viewBox="0 0 600 600" fill="none" stroke="currentColor">
 <g class="outer"><circle cx="300" cy="300" r="270" stroke-width="1" opacity=".3"/><circle cx="300" cy="300" r="260" stroke-width="3" stroke-dasharray="110 24 3 15 3 24" opacity=".75"/><circle cx="300" cy="300" r="246" stroke-width="8" stroke-dasharray="1 23" opacity=".45"/></g>
 <g class="inner"><circle cx="300" cy="300" r="230" stroke-width="1" opacity=".35"/><circle cx="300" cy="300" r="221" stroke-width="2" stroke-dasharray="160 300" opacity=".5"/><path d="M300 65l7 12h-14z M300 535l7-12h-14z M65 300l12-7v14z M535 300l-12-7v14z" fill="currentColor" opacity=".65"/></g>
 </svg></div><div class="ssx-kill-horizon"></div><div class="ssx-kill-beam"></div>
 <svg class="ssx-kill-frame" viewBox="0 0 1200 700" preserveAspectRatio="none">
 <path class="armor" d="M0 0h435l-60 28H130l-38 40H0z M1200 0H765l60 28h245l38 40h92z M0 700h360l-58-28H120l-44-42H0z M1200 700H840l58-28h182l44-42h76z M0 130l24 28v105l-13 18v137l13 18v105L0 570z M1200 130l-24 28v105l13 18v137l-13 18v105l24 29z"/>
 <path class="edge" d="M0 77h87l37-40h165 M1200 77h-87l-37-40H911 M0 621h73l44 42h120 M1200 621h-73l-44 42H963 M12 192v45 M1188 192v45 M12 465v45 M1188 465v45"/>
 <path class="detail" d="M170 15h80m8 0h12m8 0h12 M1030 15h-80m-8 0h-12m-8 0h-12 M156 685h60m8 0h10 M1044 685h-60m-8 0h-10 M36 315v70m1128-70v70"/>
 </svg><div class="ssx-kill-sparks">${sparks}</div><div class="ssx-kill-vignette"></div><div class="ssx-kill-entry"></div>`;
 return backdrop;
}
