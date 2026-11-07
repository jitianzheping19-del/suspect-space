const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.join(__dirname,'check-all-roles.cjs');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("fs.readFileSync(path.join(__dirname,'all-roles-probe.js'),'utf8')","(fs.readFileSync(path.join(__dirname,'all-roles-probe.js'),'utf8')+fs.readFileSync(path.join(__dirname,'quality-flow-probe.js'),'utf8'))");
source=source.replace('window.__allRolesQA.all()','window.__qualityFlow()');
source=source.replace("'all-roles-report.json'","'three-rounds-report.json'");
const start=source.indexOf('  for(const row of report.rows)'),end=source.indexOf('\n }finally',start);
source=source.slice(0,start)+"  assert.equal(report.rounds.length,3);assert.deepEqual(errors,[]);console.log('PASS three consecutive matches: start, emergency command, all ballots, ejection, crew victory, lobby and retained settings',JSON.stringify(report.rounds));"+source.slice(end);
const adapted=fs.readFileSync(path.join(__dirname,'run-quality-browser.cjs'),'utf8')
 .replace('const name=process.argv[2];',"const name='check-all-roles.cjs';")
 .replace("let source=fs.readFileSync(filename,'utf8');",'let source='+JSON.stringify(source)+';');
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(adapted,filename);
