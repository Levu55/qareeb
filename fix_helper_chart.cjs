const fs = require('fs');
let content = fs.readFileSync('src/features/helper/HelperScreens.tsx', 'utf8');

const importSearch = `import { MapPin, ArrowRight, AlertTriangle, Phone, Star, Clock, CheckCircle2, ShieldAlert, X } from 'lucide-react';\nimport React, { useState } from 'react';`;
const importReplace = `import { MapPin, ArrowRight, AlertTriangle, Phone, Star, Clock, CheckCircle2, ShieldAlert, X, TrendingUp } from 'lucide-react';\nimport React, { useState } from 'react';\nimport { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';`;

content = content.replace(importSearch, importReplace);

const dataString = `
const earningsData = [
  { day: 'Mon', amount: 1200 },
  { day: 'Tue', amount: 800 },
  { day: 'Wed', amount: 1500 },
  { day: 'Thu', amount: 2000 },
  { day: 'Fri', amount: 4500 },
  { day: 'Sat', amount: 3200 },
  { day: 'Sun', amount: 0 },
];
`;

const exportSearch = `export function HelperHome() {`;
content = content.replace(exportSearch, dataString + exportSearch);

const chartUI = `        <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-teal" /> Weekly Earnings</h2>
        <Card className="p-4 mb-4 hover:shadow-md transition-shadow">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [\`Rs. \${value}\`, 'Earnings']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {
                    earningsData.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.amount > 2000 ? '#00C4B6' : '#94A3B8'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
`;

const servicesSearch = `        <h2 id="services" className="text-lg font-bold text-gray-900 mb-4 mt-8 scroll-mt-24">Your Service Categories</h2>`;
content = content.replace(servicesSearch, chartUI + servicesSearch);

fs.writeFileSync('src/features/helper/HelperScreens.tsx', content);
