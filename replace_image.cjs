const fs = require('fs');

const OLD_IMG_URL = "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop";
const NEW_IMG_URL = "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop";

function updateFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(new RegExp(OLD_IMG_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_IMG_URL);
  
  // also handle the case where they used a different version of the old image url
  content = content.replace(/https:\/\/images\.unsplash\.com\/photo-[0-9a-zA-Z\-]+\?q=80&w=800&auto=format&fit=crop/g, NEW_IMG_URL);
  
  fs.writeFileSync(filename, content);
}

updateFile('src/features/auth/AuthScreens.tsx');
updateFile('src/features/user/UserScreens.tsx');
console.log('Images replaced successfully.');
