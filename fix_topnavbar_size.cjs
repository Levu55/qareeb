const fs = require('fs');
let content = fs.readFileSync('src/components/TopNavbar.tsx', 'utf8');
content = content.replace('<QareebLogo className="h-10 w-auto" />', '<QareebLogo className="w-28 sm:w-32 lg:w-40 h-auto" />');
fs.writeFileSync('src/components/TopNavbar.tsx', content);
console.log("TopNavbar fixed");
