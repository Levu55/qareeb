const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
console.log(content.split('\n').filter(l => l.includes('Route ')).join('\n'));
