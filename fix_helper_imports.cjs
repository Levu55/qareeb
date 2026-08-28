const fs = require('fs');
let content = fs.readFileSync('src/features/helper/HelperScreens.tsx', 'utf8');

const importSearch = `import { MapPin, ArrowRight, AlertTriangle, Phone, Star, Clock, CheckCircle2, ShieldAlert, X } from 'lucide-react';`;
const importReplace = `import { MapPin, ArrowRight, AlertTriangle, Phone, Star, Clock, CheckCircle2, ShieldAlert, X, TrendingUp } from 'lucide-react';\nimport { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';`;

if (content.includes(importSearch)) {
  content = content.replace(importSearch, importReplace);
  fs.writeFileSync('src/features/helper/HelperScreens.tsx', content);
  console.log("Imports fixed");
} else {
  console.log("Could not find imports to replace");
}
