const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\components\\\\layout\\\\Topbar.tsx';

let content = fs.readFileSync(file, 'utf8');

// remove date-fns
content = content.replace('import { formatDistanceToNow } from "date-fns";\\nimport { id as idLocale } from "date-fns/locale";', '');
content = content.replace('import { formatDistanceToNow } from "date-fns";\nimport { id as idLocale } from "date-fns/locale";', '');

// use standard JS for date
const formatDistanceReplacement = `
                        {new Intl.RelativeTimeFormat(language === "id" ? "id" : "en", { numeric: "auto" }).format(
                          Math.round((new Date(notification.createdAt).getTime() - Date.now()) / (1000 * 60 * 60)),
                          "hour"
                        )}
`;

content = content.replace(/\{formatDistanceToNow\([^}]+\)\}/, formatDistanceReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Removed date-fns');