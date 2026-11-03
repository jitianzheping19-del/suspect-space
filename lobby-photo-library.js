// A short-lived album local to this page. Never upload images to room state.
export function createLobbyPhotoLibrary({limit=12,clock=Date.now}={}){
 const memory=new Map();
 function current(owner){const rows=(memory.get(owner)||[]).filter(photo=>clock()<photo.expiresAt).sort((a,b)=>b.at-a.at).slice(0,limit);if(rows.length)memory.set(owner,rows);else memory.delete(owner);return rows;}
 return{prune(){for(const owner of memory.keys())current(owner);},async list(owner){return current(owner);},async add(owner,photo){if(!owner||clock()>=photo.expiresAt)return false;memory.set(owner,[{...photo,owner},...current(owner).filter(row=>row.id!==photo.id)].slice(0,limit));return true;},clear(){memory.clear();}};
}
