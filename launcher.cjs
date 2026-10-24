// Resolve the external SDK both inside HBLauncher/apps and from a standalone clone.
const fs = require('node:fs');
const path = require('node:path');
function root() {
  const directory = process.env.HBLAUNCHER_ROOT
    ? path.resolve(process.env.HBLAUNCHER_ROOT)
    : path.resolve(__dirname, '../..');
  if (!fs.existsSync(path.join(directory, 'sdk/build.cjs'))) {
    throw new Error('HBLauncher SDK not found. Install this folder under HBLauncher/apps/ '
      + 'or set HBLAUNCHER_ROOT to the absolute path of your HBLauncher checkout.');
  }
  return directory;
}
module.exports = {root};
