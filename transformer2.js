import fs from 'fs';

let content = fs.readFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', 'utf8');

const compareStart = content.indexOf(`{activeTab === 'Compare' && (`);
const compareEnd = content.indexOf(`activeTab === 'Reports' && (`);

let before = content.slice(0, compareStart);
let compareStr = content.slice(compareStart, compareEnd);
let after = content.slice(compareEnd);

// Period Cards (horizontal row)
compareStr = compareStr.replace(/ gap-4 /g, ' gap-2 ');
compareStr = compareStr.replace(/min-w-\[280px\] rounded-3xl p-5 /g, 'min-w-[220px] rounded-[24px] p-2.5 ');
compareStr = compareStr.replace(/\$\{isCompact \? 'p-4' : 'p-5'\}/g, "${isCompact ? 'p-2' : 'p-2.5'}");
compareStr = compareStr.replace(/w-8 h-8 rounded-xl /g, 'w-6 h-6 rounded-xl ');
compareStr = compareStr.replace(/text-sm /g, 'text-xs ');
compareStr = compareStr.replace(/text-xs /g, 'text-[10px] ');
// Inputs
compareStr = compareStr.replace(/px-3 py-2 /g, 'px-2 py-1 ');
compareStr = compareStr.replace(/w-4 h-4 /g, 'w-3 h-3 ');

// Quick Month Picker
compareStr = compareStr.replace(/bg-white rounded-\[32px\] p-8 border/g, 'bg-white rounded-[24px] p-3 border');
compareStr = compareStr.replace(/gap-3 mb-6/g, 'gap-1 mb-6');

// Metrics Comparison Table & % Change Matrix
compareStr = compareStr.replace(/px-4 py-3/g, 'px-2.5 py-1.5');
compareStr = compareStr.replace(/px-3 py-2/g, 'px-2 py-1.5');
compareStr = compareStr.replace(/mb-4/g, 'mb-2');

// General
compareStr = compareStr.replace(/space-y-6/g, 'space-y-2.5');
compareStr = compareStr.replace(/space-y-4/g, 'space-y-2');
compareStr = compareStr.replace(/p-5 /g, 'p-3 ');

// Also height reduction
compareStr = compareStr.replace(/height=\{250\}/g, 'height={230}');
compareStr = compareStr.replace(/height=\{200\}/g, 'height={180}');


content = before + compareStr + after;

fs.writeFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', content);
