import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm,symlink} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {archiveRelease,verifyRelease} from './release-artifact.mjs';
const temp=await mkdtemp(path.join(os.tmpdir(),'space-release-'));
try{
 const source=path.join(temp,'dist'),archive=path.join(temp,'archive'),restored=path.join(temp,'restored');
 await mkdir(path.join(source,'assets'),{recursive:true});await writeFile(path.join(source,'index.html'),'<script src="assets/game.js"></script>');await writeFile(path.join(source,'assets/game.js'),'original');
 assert.equal((await archiveRelease(source,archive)).files,2);
 await cp(archive,restored,{recursive:true});assert.equal((await verifyRelease(restored)).files,2);
 await writeFile(path.join(restored,'site/assets/game.js'),'modified');await assert.rejects(verifyRelease(restored),/SHA-256/);
 await cp(path.join(archive,'site/assets/game.js'),path.join(restored,'site/assets/game.js'));await verifyRelease(restored);
 await writeFile(path.join(restored,'site/extra.js'),'unexpected');await assert.rejects(verifyRelease(restored),/SHA-256/);
 await rm(path.join(restored,'site/extra.js'));await rm(path.join(restored,'site/assets/game.js'));await assert.rejects(verifyRelease(restored),/SHA-256/);
 await symlink(path.join(archive,'site/assets/game.js'),path.join(restored,'site/assets/game.js'));await assert.rejects(verifyRelease(restored),/symbolic/);
 assert.equal(await readFile(path.join(archive,'site/assets/game.js'),'utf8'),'original');
 await assert.rejects(archiveRelease(source,archive),/empty/);
 console.log('PASS exact archive/restore, altered/missing/extra file and symlink rejection, original archive retained');
}finally{await rm(temp,{recursive:true,force:true});}
