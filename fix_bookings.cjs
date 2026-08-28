const fs = require('fs');
let content = fs.readFileSync('src/features/shared/Bookings.tsx', 'utf8');

const search = `                   <div className={\`text-xs font-bold px-2 py-1 rounded-md mb-2 inline-flex items-center gap-1.5 \${booking.statusColor}\`}>
                     {(booking.status === 'In Progress' || booking.status === 'Scheduled' || booking.status === 'Pending') && (
                       <span className="relative flex h-2 w-2">
                         <span className={\`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 \${booking.statusColor.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}\`}></span>
                         <span className={\`relative inline-flex rounded-full h-2 w-2 \${booking.statusColor.split(' ')[1].replace('text-', 'bg-')}\`}></span>
                       </span>
                     )}
                     {booking.status}
                   </div>`;

const replace = `                   <div className={\`text-xs font-bold px-2.5 py-1 rounded-full mb-2 inline-flex items-center gap-2 shadow-sm transition-all hover:scale-105 \${booking.statusColor}\`}>
                     {(booking.status === 'In Progress' || booking.status === 'Scheduled' || booking.status === 'Pending') && (
                       <span className="relative flex h-2.5 w-2.5">
                         <span className={\`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 \${booking.statusColor.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}\`}></span>
                         <span className={\`relative inline-flex rounded-full h-2.5 w-2.5 \${booking.statusColor.split(' ')[1].replace('text-', 'bg-')}\`}></span>
                       </span>
                     )}
                     {booking.status}
                   </div>`;

content = content.replace(search, replace);
fs.writeFileSync('src/features/shared/Bookings.tsx', content);
