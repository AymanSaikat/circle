const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove border-t and border-b patterns from className strings
      const patterns = [
        /border-[tb]\s+border-zinc-[12]00\s+dark:border-zinc-[89]00\/?\d*/g,
        /border-[lr]\s+border-zinc-[12]00\s+dark:border-zinc-[89]00\/?\d*/g,
        /border-[tb]\s+border-zinc-[12]00\/[0-9]+\s+dark:border-zinc-[89]00\/?\d*/g,
        /border-[tb]\s+border-white\/?\d*\s+dark:border-zinc-[89]00\/?\d*/g,
        /border-[tb]\s+border-transparent/g,
        /border-[lr]\s+border-zinc-[12]00\/[0-9]+\s+dark:border-zinc-[89]00\/?\d*/g,
      ];
      
      let changed = false;
      patterns.forEach(regex => {
        if (regex.test(content)) {
          content = content.replace(regex, '');
          changed = true;
        }
      });
      
      if (changed) {
        // Clean up any double spaces or leading/trailing spaces created by replacement inside classNames
        content = content.replace(/className=" /g, 'className="');
        content = content.replace(/  +/g, ' ');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Removed lines in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
