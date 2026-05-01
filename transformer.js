import fs from 'fs';

let content = fs.readFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', 'utf8');

// 1. Period Cards
content = content.replace(/<div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">/, '<div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">');
const regexCard = /min-w-\[280px\] rounded-3xl p-5 border relative group animate-in zoom-in-95 duration-200 transition-all/g;
content = content.replace(regexCard, 'min-w-[220px] rounded-[24px] border relative group animate-in zoom-in-95 duration-200 transition-all');
const regexP5 = /\$\{isCompact \? 'p-4' : 'p-5'\}/g;
content = content.replace(regexP5, "${isCompact ? 'min-w-[140px] p-2' : 'p-2.5'}");

// Update input py-1.5 -> py-1, w-4 h-4 -> w-3 h-3, etc. This requires regex replacement inside the period card map block.
// Let's replace fonts
content = content.replace(/w-8 h-8 rounded-xl flex items-center/g, 'w-6 h-6 rounded-lg flex items-center');
content = content.replace(/className="bg-transparent border-none font-black text-gray-900 uppercase tracking-tight text-sm focus:outline-none w-32"/g, 'className="bg-transparent border-none font-black text-gray-900 uppercase tracking-tight text-[10px] focus:outline-none w-24"');

// 2. Metrics Table reductions
content = content.replace(/px-4 py-3/g, 'px-2.5 py-1.5');
content = content.replace(/text-sm/g, 'text-xs');

// 3. Quick Month Picker reductions
content = content.replace(/rounded-\[32px\] p-8 border/g, 'rounded-[24px] p-3 border');
content = content.replace(/px-3 py-2 rounded-xl text-xs font-black uppercase/g, 'px-2 py-1 rounded-xl text-[10px] font-black uppercase');
content = content.replace(/grid grid-cols-4 md:grid-cols-6 gap-3 mb-6/g, 'grid grid-cols-4 md:grid-cols-6 gap-1 mb-6');

// 4. Charts reductions
// Default height: 250 -> 230
content = content.replace(/<ResponsiveContainer height=\{250\}>/g, '<ResponsiveContainer height={230}>');
content = content.replace(/<ResponsiveContainer height=\{200\}>/g, '<ResponsiveContainer height={180}>');

// 5. Performance analysis modifications
content = content.replace(/px-4 py-2 rounded-xl text-\[10px\] font-black uppercase transition-all \$\{perfDimension === d \? /g, 'px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${perfDimension === d ? ');
content = content.replace(/px-6 py-3 rounded-2xl text-xs/g, 'px-4 py-2 rounded-xl text-xs');
// Table padding
content = content.replace(/px-8 py-6/g, 'px-2 py-1.5');

// 6. Section spacings
content = content.replace(/<div className="space-y-6">/g, '<div className="space-y-2.5">');

fs.writeFileSync('/app/applet/src/tools/SalesAnalyzer/index.jsx', content);
