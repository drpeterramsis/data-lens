const fs = require('fs');

let content = fs.readFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', 'utf8');

const regex = /\}\)\}\s*<div className="h-full"[^>]*>[\s\S]*?\)\}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}\)/g;
content = content.replace(regex, '})}\n');

fs.writeFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', content);
