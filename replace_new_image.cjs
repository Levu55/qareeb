const fs = require('fs');

const NEW_IMG_URL = "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop";

function updateFile(filename, replaceTarget, replaceWith) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(replaceTarget, replaceWith);
  fs.writeFileSync(filename, content);
}

// UserScreens.tsx
const userFile = 'src/features/user/UserScreens.tsx';
const userTarget = `<img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out hover:scale-105" alt="" />`;
const userReplace = `<img src="${NEW_IMG_URL}" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out hover:scale-105" alt="" />`;
updateFile(userFile, userTarget, userReplace);

// AuthScreens.tsx
const authFile = 'src/features/auth/AuthScreens.tsx';
const authTarget = `src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop"`;
const authReplace = `src="${NEW_IMG_URL}"`;
updateFile(authFile, authTarget, authReplace);

console.log('Replaced successfully.');
