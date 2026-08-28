const fs = require('fs');
let content = fs.readFileSync('src/features/user/UserScreens.tsx', 'utf8');

const search = `  const user = useAppStore(state => state.user);`;
content = content.replace(search, '');
fs.writeFileSync('src/features/user/UserScreens.tsx', content);
