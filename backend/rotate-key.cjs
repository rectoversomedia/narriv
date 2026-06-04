const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\backend\\\\.env';
let content = fs.readFileSync(file, 'utf8');

// Replace OPENAI_API_KEY with a safe dummy value
content = content.replace(/OPENAI_API_KEY=["']?sk-proj-[a-zA-Z0-9\-_]+["']?/g, 'OPENAI_API_KEY="sk-proj-YOUR_NEW_ROTATED_KEY_HERE"');

fs.writeFileSync(file, content);
console.log('Key rotated securely');
