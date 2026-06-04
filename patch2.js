const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\app\\\\(dashboard)\\\\signals\\\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// fix imports
content = content.replace('type DateRangeKey, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta', 'type DateRangeKey, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta');

// fix toneStyles cast
content = content.replace(/toneStyles\[item\.tone\]/g, 'toneStyles[item.tone as Tone]');
// fix icons
content = content.replace('const Icon = item.icon;', 'const Icon = item.icon || Zap;');
// fix investigation queue
content = content.replace('item.badge === "Investigating" ?', 'item.badge === "Investigating" || item.badge === "open" ?');

fs.writeFileSync(file, content);
console.log('Fixed typings');