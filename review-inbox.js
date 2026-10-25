import './records-ui.css';
export async function showReviewInbox({api,host,body,setBadge}){
 const account=api.context();if(!account.admin)return;
 host.hidden=false;host.setAttribute('aria-label','メッセージ');body.replaceChildren();
 const title=document.createElement('h2');title.textContent='メッセージ';body.append(title);
 const loading=document.createElement('p');loading.textContent='読み込み中…';body.append(loading);
 try{
  const entries=await api.readAll();if(api.context().uid!==account.uid||!api.context().admin)return;
  loading.remove();
  const tools=document.createElement('div');tools.className='reviewTools';
  const search=document.createElement('input');search.type='search';search.placeholder='名前・メッセージを検索';search.setAttribute('aria-label',search.placeholder);
  const filter=document.createElement('select');filter.setAttribute('aria-label','対応状況');for(const [value,text]of[['','すべて'],['new','未対応'],['planned','対応予定'],['done','対応済み']]){const o=document.createElement('option');o.value=value;o.textContent=text;filter.append(o);}tools.append(search,filter);body.append(tools);
  const list=document.createElement('div');list.className='reviewEntries';body.append(list);
  const rows=[];let latest=0;
  for(const row of entries.sort((a,b)=>Number(b.createdAt)-Number(a.createdAt))){
   latest=Math.max(latest,Number(row.createdAt)||0);
   const article=document.createElement('article');article.className='reviewEntry';
   const header=document.createElement('header'),name=document.createElement('strong'),date=document.createElement('time'),stars=document.createElement('div'),message=document.createElement('p'),state=document.createElement('select');
   name.textContent=row.name||'クルー';date.textContent=new Date(row.createdAt).toLocaleString('ja-JP');
   const rating=Math.max(0,Math.min(5,Number(row.rating)||0));stars.className='reviewRating';stars.textContent=rating?'★'.repeat(rating)+'☆'.repeat(5-rating):'評価なし';message.textContent=row.message||'メッセージなし';
   state.setAttribute('aria-label',name.textContent+'への対応状況');for(const [value,text]of[['new','未対応'],['planned','対応予定'],['done','対応済み']]){const o=document.createElement('option');o.value=value;o.textContent=text;state.append(o);}
   const key='space-review-triage:'+account.uid+':'+row.createdAt+':'+row.name;try{state.value=localStorage.getItem(key)||'new';}catch{}
   state.onchange=()=>{try{localStorage.setItem(key,state.value);}catch{}refresh();};
   header.append(name,date);article.append(header,stars,message,state);list.append(article);rows.push({article,state,text:(name.textContent+' '+message.textContent).toLocaleLowerCase()});
  }
  const empty=document.createElement('p');empty.className='reviewEmpty';empty.textContent='該当するメッセージはありません';body.append(empty);
  function refresh(){const q=search.value.toLocaleLowerCase().trim();let shown=0;for(const row of rows){row.article.hidden=!!(q&&!row.text.includes(q)||filter.value&&row.state.value!==filter.value);if(!row.article.hidden)shown++;}empty.hidden=shown>0;}
  search.oninput=refresh;filter.onchange=refresh;refresh();
  if(latest&&api.context().uid===account.uid){try{await api.markRead(latest);setBadge(0);}catch(error){console.warn("レビューの既読保存は次回に再試行します",error);}}
 }catch(error){
  console.error('Review inbox read failed',error);
  if(!loading.isConnected)body.append(loading);
  loading.textContent=/permission|denied/i.test(String(error?.code||error?.message))?'Firebase側でメッセージの閲覧が拒否されています。管理者用のデータベースルールを反映してください。':'メッセージを取得できませんでした。接続を確認して再試行してください。';
  const retry=document.createElement('button');retry.type='button';retry.className='reviewSend';retry.textContent='再試行';retry.onclick=()=>showReviewInbox({api,host,body,setBadge});body.append(retry);
 }
 host.querySelector('.reviewClose')?.focus();
}
