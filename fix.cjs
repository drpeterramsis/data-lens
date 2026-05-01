const fs = require('fs');
const file = '/app/applet/src/tools/SalesAnalyzer/index.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\{\/\* Fullscreen Modal Implementation \*\/\}[\s\S]*?\}\)/, '');
content = content.replace(/<button \n\s*onClick={\(\) => setPerfFullscreen\(true\)}[\s\S]*?<\/button>/, '');
fs.writeFileSync(file, content);
