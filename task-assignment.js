// Balance station usage and room variety without changing task counts or IDs.
export function selectBalancedTasks(tasks,required,count,usage,start,random=Math.random){
 const selected=tasks.filter(t=>required.includes(t.id)),rooms=new Set(selected.map(t=>t.room));
 const pool=tasks.filter(t=>!required.includes(t.id));
 while(selected.length<Math.min(count,tasks.length)&&pool.length){
  const scored=pool.map(t=>{const route=Math.hypot(t.x-start.x,t.z-start.z);return{t,score:(usage.get(t.id)||0)*4+(rooms.has(t.room)?3:0)+route*.012+random()*2};}).sort((a,b)=>a.score-b.score);
  const next=scored[0].t;selected.push(next);rooms.add(next.room);pool.splice(pool.indexOf(next),1);
 }
 for(const task of selected)usage.set(task.id,(usage.get(task.id)||0)+1);
 return selected.map(t=>t.id);
}
