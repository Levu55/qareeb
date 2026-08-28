const fs = require('fs');
let msgContent = fs.readFileSync('src/features/shared/Messages.tsx', 'utf8');

const search = `<div key={idx} className={\`flex \${msg.isSender ? 'justify-end' : 'justify-start'}\`}>`;
const replace = `<div key={idx} className={\`flex \${msg.isSender ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300\`}>`;

msgContent = msgContent.replace(search, replace);
fs.writeFileSync('src/features/shared/Messages.tsx', msgContent);
