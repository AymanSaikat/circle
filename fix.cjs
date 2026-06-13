const fs = require('fs');
let code = fs.readFileSync('src/pages/Feed.tsx', 'utf8');
code = code.replace('// Issue follow notification', 'setSuggestedUsers(prev => prev.filter(u => u.uid !== targetUid));\n      // Issue follow notification');
fs.writeFileSync('src/pages/Feed.tsx', code);
