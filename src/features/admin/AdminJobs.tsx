import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MapPin, List, Eye } from 'lucide-react';

export function AdminJobsScreen() {
  const [view, setView] = useState<'table' | 'map'>('table');

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Jobs Management</h1>
          <p className="text-gray-500">Monitor all active and past jobs across the platform.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => setView('table')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             <List className="w-4 h-4 me-2" /> Table View
           </button>
           <button 
             onClick={() => setView('map')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${view === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             <MapPin className="w-4 h-4 me-2" /> Map View
           </button>
        </div>
      </div>

      {view === 'table' ? (
        <Card className="flex-1 overflow-auto rounded-2xl p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="p-4 text-sm font-semibold text-gray-600">Job ID</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Customer</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Helper</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Service</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((item) => (
                <tr key={item} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-4 font-mono text-sm">#JOB-{8040 + item}</td>
                  <td className="p-4 font-medium">Ahmed Khan</td>
                  <td className="p-4 text-gray-600">Kamran Ali</td>
                  <td className="p-4">Plumbing</td>
                  <td className="p-4 font-bold">Rs. 800</td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">In Progress</span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" className="h-8 px-2"><Eye className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="flex-1 bg-gray-100 rounded-2xl relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=31.5204,74.3587&zoom=13&size=1000x800&key=demo')] bg-cover bg-center opacity-70 grayscale"></div>
           <div className="absolute z-10 p-4 bg-white rounded-xl shadow-lg bottom-4 left-4">
             <h4 className="font-bold mb-2">Live Activity</h4>
             <div className="flex items-center gap-2 mb-1 text-sm"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> 12 Active Jobs</div>
             <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-brand-orange rounded-full"></div> 5 Pending Requests</div>
           </div>
        </div>
      )}
    </div>
  );
}
