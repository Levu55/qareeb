import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertOctagon, TrendingUp, Users, DollarSign, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Navigate } from 'react-router-dom';

export function SuperAdminDashboard() {
  const role = useAppStore(state => state.role);

  if (role !== 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Founder Dashboard</h1>
          <p className="text-gray-500">System-wide overview and master controls.</p>
        </div>
        <Button variant="danger" className="animate-pulse shadow-lg shadow-red-500/30">
          <AlertOctagon className="w-5 h-5 me-2" />
          Emergency Lockdown
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-brand-orange to-red-500 text-white border-0">
           <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
             <DollarSign className="w-6 h-6 text-white" />
           </div>
           <p className="text-white/80 font-medium text-sm mb-1">Total Revenue</p>
           <h3 className="text-3xl font-bold">Rs. 2.4M</h3>
        </Card>
        <Card className="p-6">
           <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
             <TrendingUp className="w-6 h-6" />
           </div>
           <p className="text-gray-500 font-medium text-sm mb-1">Active Jobs (Today)</p>
           <h3 className="text-3xl font-bold text-gray-900">142</h3>
        </Card>
        <Card className="p-6">
           <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
             <Users className="w-6 h-6" />
           </div>
           <p className="text-gray-500 font-medium text-sm mb-1">Total Verified Helpers</p>
           <h3 className="text-3xl font-bold text-gray-900">850</h3>
        </Card>
        <Card className="p-6">
           <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
             <ShieldAlert className="w-6 h-6" />
           </div>
           <p className="text-gray-500 font-medium text-sm mb-1">Pending CNIC Reviews</p>
           <h3 className="text-3xl font-bold text-gray-900">24</h3>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1">
         <Card className="p-6">
           <h2 className="text-lg font-bold mb-4">Financial Controls</h2>
           <div className="space-y-4">
             <div className="flex justify-between items-center p-4 border border-gray-100 rounded-xl">
               <div>
                 <p className="font-bold text-gray-900">Platform Commission Rate</p>
                 <p className="text-sm text-gray-500">Percentage taken from each job</p>
               </div>
               <div className="flex items-center gap-2">
                 <input type="number" defaultValue={10} className="w-16 border border-gray-300 rounded px-2 py-1 text-center font-bold" /> %
                 <Button size="sm">Update</Button>
               </div>
             </div>
             <div className="flex justify-between items-center p-4 border border-gray-100 rounded-xl">
               <div>
                 <p className="font-bold text-gray-900">Helper Minimum Withdrawal</p>
                 <p className="text-sm text-gray-500">Threshold for payouts</p>
               </div>
               <div className="flex items-center gap-2">
                 Rs. <input type="number" defaultValue={1000} className="w-20 border border-gray-300 rounded px-2 py-1 text-center font-bold" />
                 <Button size="sm">Update</Button>
               </div>
             </div>
           </div>
         </Card>
         <Card className="p-6">
           <h2 className="text-lg font-bold mb-4">Recent System Logs</h2>
           <div className="space-y-3 font-mono text-sm">
             <div className="text-gray-600 border-b border-gray-50 pb-2">[10:42:01] Admin 'Zain' approved helper #882</div>
             <div className="text-gray-600 border-b border-gray-50 pb-2">[10:35:12] High load warning: 50+ simultaneous bookings</div>
             <div className="text-red-500 border-b border-gray-50 pb-2">[10:15:00] Payment Gateway timeout detected</div>
             <div className="text-gray-600 border-b border-gray-50 pb-2">[09:59:44] Admin 'Zain' updated category pricing</div>
           </div>
         </Card>
      </div>
    </div>
  );
}
