const fs = require('fs');

function updateFile(filename, replaceTarget, replaceWith) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(replaceTarget, replaceWith);
  fs.writeFileSync(filename, content);
}

// UserScreens.tsx
const userFile = 'src/features/user/UserScreens.tsx';
const userTarget = `<div className="flex-1 w-full max-w-md mx-auto md:mx-0">
             <div className="relative w-full aspect-[3/4] md:aspect-square lg:aspect-[4/5] bg-[#EAF5F5] rounded-[32px] shadow-2xl overflow-hidden border-[6px] border-white transition-all duration-500 ease-out hover:shadow-3xl hover:-translate-y-2">
               <img src={heroImg} className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out hover:scale-105" alt="Qareeb Helper" />`;

const userReplace = `<div className="flex-1 w-[85%] max-w-[340px] md:max-w-[400px] mx-auto md:ml-auto md:mr-4 lg:mr-8">
             <div className="relative w-full aspect-[3/4] md:aspect-square lg:aspect-[4/5] bg-[#EAF5F5] rounded-[32px] shadow-2xl overflow-hidden border-[6px] border-white transition-all duration-500 ease-out hover:shadow-3xl hover:-translate-y-2">
               <img src={heroImg} className="absolute inset-0 w-full h-full object-cover object-[70%_15%] transition-transform duration-700 ease-out hover:scale-105" alt="Qareeb Helper" />`;

updateFile(userFile, userTarget, userReplace);

// AuthScreens.tsx
const authFile = 'src/features/auth/AuthScreens.tsx';
const authTarget = `<div className="w-full lg:w-[45%] flex items-center justify-center relative z-10 mt-8 lg:mt-0 pb-12 lg:pb-0">
          <div className="relative w-full max-w-[500px] aspect-[4/5] bg-brand-teal/5 rounded-[32px] shadow-2xl overflow-hidden border-[6px] lg:border-[8px] border-white">
            <img 
              src={heroImg} 
              alt="Qareeb Helper" 
              className="absolute inset-0 w-full h-full object-cover object-top"
            />`;

const authReplace = `<div className="w-full lg:w-[45%] flex items-center justify-center relative z-10 mt-8 lg:mt-0 pb-12 lg:pb-0 px-4">
          <div className="relative w-[85%] max-w-[380px] md:max-w-[440px] aspect-[4/5] bg-brand-teal/5 rounded-[32px] shadow-2xl overflow-hidden border-[6px] lg:border-[8px] border-white">
            <img 
              src={heroImg} 
              alt="Qareeb Helper" 
              className="absolute inset-0 w-full h-full object-cover object-[70%_15%]"
            />`;

updateFile(authFile, authTarget, authReplace);
console.log('Fixed');
