const fs = require('fs');
const path = require('path');

const replacements = {
  'zinc-150': 'zinc-200',
  'zinc-250': 'zinc-300',
  'zinc-350': 'zinc-400',
  'zinc-450': 'zinc-400',
  'zinc-505': 'zinc-500',
  'zinc-510': 'zinc-500',
  'zinc-550': 'zinc-500',
  'zinc-650': 'zinc-600',
  'zinc-750': 'zinc-700',
  'zinc-805': 'zinc-800',
  'zinc-850': 'zinc-800',
  'zinc-905': 'zinc-900',
  'red-650': 'red-600',
  'red-655': 'red-600',
  'text-zinc-105': 'text-zinc-100',
};

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [invalid, valid] of Object.entries(replacements)) {
        if (content.includes(invalid)) {
          content = content.split(invalid).join(valid);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
