const fs = require('fs');
let content = fs.readFileSync('src/layouts/MobileShell.tsx', 'utf8');

// Remove lg:max-w-screen-2xl from the main wrapper
content = content.replace('lg:max-w-screen-2xl ', '');
// If they wanted the content to also be full width, maybe remove max-w-7xl too?
// "expand this div to full screen according to desktop mode" - if it was the main wrapper.

fs.writeFileSync('src/layouts/MobileShell.tsx', content);
