import React from 'react';
export function QareebLogo({ className = "w-32 h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5 C25 5, 15 30, 15 45 C15 75, 50 95, 50 95 C50 95, 85 75, 85 45 C85 30, 75 5, 50 5 Z" fill="#01B9C1" />
      <path fill="#ffffff" d="M60.1,38.9c-1.3-1.6-3.6-1.8-5.2-0.5c-0.1,0.1-0.2,0.2-0.3,0.3v-5.2c0-2-1.6-3.6-3.6-3.6 c-2,0-3.6,1.6-3.6,3.6V33c0-2-1.6-3.6-3.6-3.6s-3.6,1.6-3.6,3.6v0.6c-0.3-0.1-0.6-0.2-1-0.2c-2,0-3.6,1.6-3.6,3.6v12.7 c0,0,0,0.1,0,0.1l-3.3-3.9c-1.3-1.5-3.6-1.7-5.1-0.4c-1.5,1.3-1.7,3.6-0.4,5.1l11.1,13.2c2.2,2.6,5.5,4.1,8.9,4.1h3.3 c4.9,0,8.9-4,8.9-8.9V43.2C62.4,41.4,61.5,39.9,60.1,38.9z"/>
      <circle cx="80" cy="85" r="9" fill="#01B9C1" />
      <text x="50" y="118" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="26" fontWeight="bold" letterSpacing="-0.05em" fill="#01B9C1" textAnchor="middle">qareeb</text>
      <text x="50" y="132" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="8" fontWeight="500" letterSpacing="0.02em" fill="#01B9C1" textAnchor="middle">Help is always near</text>
    </svg>
  );
}
