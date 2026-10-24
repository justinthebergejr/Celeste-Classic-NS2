const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
async function main() {
  const launcher = require('./launcher.cjs').root();
  execFileSync('python3', [path.join(__dirname, 'assets.py')],
    {env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}, stdio: 'inherit'});
  const state = Buffer.alloc(1024);
  state.writeFloatLE(1, 960);
  await fs.writeFile(path.join(__dirname, 'assets/state.bin'), state);
  await require(path.join(launcher, 'sdk/build.cjs')).buildApp(__dirname);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
