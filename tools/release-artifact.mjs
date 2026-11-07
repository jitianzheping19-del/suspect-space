// Preserve exactly the checked build, including a complete SHA-256 inventory.
import {cp,mkdir,readdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
async function inventory(root,relative=''){
 const files=[];
 for(const name of (await readdir(path.join(root,relative))).sort()){
  const rel=relative?relative+'/'+name:name,entry=path.join(root,rel),stat=await lstat(entry);
  if(stat.isSymbolicLink())throw Error('Release must not contain symbolic links: '+rel);
  if(stat.isDirectory())files.push(...await inventory(root,rel));
  else if(stat.isFile())files.push({path:rel,bytes:stat.size,sha256:createHash('sha256').update(await readFile(entry)).digest('hex')});
  else throw Error('Unsupported release entry: '+rel);
 }
 return files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
export async function archiveRelease(source,destination){
 await mkdir(destination,{recursive:true});
 if((await readdir(destination)).length)throw Error('Archive destination must be empty');
 const files=await inventory(source);if(!files.some(file=>file.path==='index.html'))throw Error('Missing index.html');
 await cp(source,path.join(destination,'site'),{recursive:true,errorOnExist:true,force:false});
 let sourceCommit=null,dirty=null;try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();dirty=!!execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim();}catch{}
 const manifest={schema:1,createdAt:new Date().toISOString(),sourceCommit,dirty,files};
 await writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return verifyRelease(destination);
}
export async function verifyRelease(directory){
 const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
 if(manifest.schema!==1||!Array.isArray(manifest.files)||!manifest.files.some(file=>file.path==='index.html'))throw Error('Invalid release manifest');
 const actual=await inventory(path.join(directory,'site'));
 if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Release files do not match their saved SHA-256 inventory');
 return {files:actual.length,sourceCommit:manifest.sourceCommit};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [operation,first,second]=process.argv.slice(2);
 if(operation==='create'&&first&&second)console.log(await archiveRelease(first,second));
 else if(operation==='verify'&&first)console.log(await verifyRelease(first));
 else throw Error('Usage: release-artifact.mjs create DIST ARCHIVE | verify ARCHIVE');
}
