const fs = require('fs');
let lines = fs.readFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', 'utf8').split('\n');
lines.splice(3429, 3481 - 3430 + 1);
fs.writeFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', lines.join('\n'));
