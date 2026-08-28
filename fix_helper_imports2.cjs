const fs = require('fs');
let content = fs.readFileSync('src/features/helper/HelperScreens.tsx', 'utf8');

const importSearch = `import { MapPin, Navigation as NavIcon, Clock, CheckCircle2, AlertTriangle, Briefcase, Star, ArrowRight } from 'lucide-react';`;
const importReplace = `import { MapPin, Navigation as NavIcon, Clock, CheckCircle2, AlertTriangle, Briefcase, Star, ArrowRight, TrendingUp } from 'lucide-react';\nimport { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';`;

if (content.includes(importSearch)) {
  content = content.replace(importSearch, importReplace);
  fs.writeFileSync('src/features/helper/HelperScreens.tsx', content);
  console.log("Imports fixed");
} else {
  console.log("Still not found");
}
