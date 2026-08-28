const fs = require('fs');
let userContent = fs.readFileSync('src/features/user/UserScreens.tsx', 'utf8');

const searchBtn = `<Button variant="outline" className="h-12 px-8 rounded-xl text-base border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-colors" onClick={() => navigate('/user/become-helper')}>
               Become a Helper
             </Button>`;

const replaceBtn = `<Button variant="outline" className="h-12 px-8 rounded-xl text-base border-2 border-white text-white hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-colors" onClick={() => navigate('/user/become-helper')}>
               Become a Helper
             </Button>`;

if (userContent.includes(searchBtn)) {
  userContent = userContent.replace(searchBtn, replaceBtn);
  fs.writeFileSync('src/features/user/UserScreens.tsx', userContent);
  console.log("Replaced");
} else {
  console.log("Not found");
}
