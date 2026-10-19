// Full rule coverage and real browser interaction coverage for the approved tasks.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
for (const script of ['check-frost-task-rules.mjs', 'check-frost-emergencies.cjs', 'check-frost-task-machines.cjs']) {
  execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
}
