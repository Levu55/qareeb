import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatPKR, cn } from '../../lib/utils';
import { Users, Briefcase, AlertTriangle, Wallet, CheckCircle, XCircle, UserCheck, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function AdminDashboard() {
  const role = useAppStore(state => state.role);
  
  const stats = [
    { name: 'Active Users', value: '1,204', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Jobs in Progress', value: '45', icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: 'Unresolved Disputes', value: '3', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { name: "Today's Revenue", value: formatPKR(25400), icon: Wallet, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome back, {role === 'superadmin' ? 'Founder' : 'Admin'}</p>
        </div>
        {role === 'superadmin' && (
          <Button variant="danger" className="h-10 text-sm bg-red-600 hover:bg-red-700">
             Emergency Lockdown
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center p-6">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center me-4", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="col-span-2 p-6 h-[400px]">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Live Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-orange-light text-brand-orange rounded-full flex items-center justify-center font-bold me-4">
                    {i === 1 || i === 3 ? 'J' : 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {i === 1 ? 'Job #4592 Completed' : i === 2 ? 'New User Registered' : i === 3 ? 'Helper Accepted Job' : 'Payment Disputed'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">2 minutes ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Required */}
        <Card className="col-span-1 p-6 h-[400px]">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Action Required</h2>
          <div className="space-y-3">
             <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start">
               <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 me-3 flex-shrink-0" />
               <div>
                 <p className="font-semibold text-orange-900 text-sm">CNIC Verification</p>
                 <p className="text-xs text-orange-700 mt-1">12 helpers waiting for identity verification.</p>
                 <a href="/admin/cnic" className="inline-block mt-2 text-xs font-bold text-brand-orange hover:underline">Review Now →</a>
               </div>
             </div>
             
             <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start">
               <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 me-3 flex-shrink-0" />
               <div>
                 <p className="font-semibold text-red-900 text-sm">Active Disputes</p>
                 <p className="text-xs text-red-700 mt-1">3 jobs currently disputed by users.</p>
                 <a href="/admin/disputes" className="inline-block mt-2 text-xs font-bold text-red-600 hover:underline">Resolve Now →</a>
               </div>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function UserManagementScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'helpers'>('users');

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">User & Helper Management</h1>
          <p className="text-gray-500">Manage platform users, view their status, and take administrative actions.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('users')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${activeTab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             <Users className="w-4 h-4 me-2" /> Users
           </button>
           <button 
             onClick={() => setActiveTab('helpers')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${activeTab === 'helpers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             <UserCheck className="w-4 h-4 me-2" /> Helpers
           </button>
        </div>
      </div>

      <Card className="flex-1 overflow-auto rounded-2xl p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 text-sm font-semibold text-gray-600">ID</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Contact</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Join Date</th>
              {activeTab === 'helpers' && <th className="p-4 text-sm font-semibold text-gray-600">Rating</th>}
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((item) => (
              <tr key={item} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="p-4 font-mono text-sm">#{activeTab === 'users' ? 'USR' : 'HLP'}-{9000 + item}</td>
                <td className="p-4 font-medium flex items-center gap-3">
                  <img src={`https://ui-avatars.com/api/?name=User+${item}&background=f3f4f6`} className="w-8 h-8 rounded-full" />
                  {activeTab === 'users' ? 'Ahmed Khan' : 'Kamran Ali'}
                </td>
                <td className="p-4 text-gray-600">0300 123456{item}</td>
                <td className="p-4 text-gray-600">Aug {item}, 2026</td>
                {activeTab === 'helpers' && <td className="p-4 font-medium flex items-center"><Star className="w-4 h-4 text-yellow-400 fill-current me-1" /> 4.{9 - item}</td>}
                <td className="p-4">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>
                </td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" className="h-8 px-2">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminCNICQueue() {
  const [selected, setSelected] = useState<number | null>(1);
  
  return (
    <div className="h-full max-w-6xl mx-auto flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CNIC Verification Queue</h1>
        <p className="text-gray-500 mt-1">Review helper identity documents carefully.</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        {/* Queue List */}
        <Card className="col-span-1 p-0 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700">
            Pending Review (12)
          </div>
          <div className="flex-1 overflow-y-auto">
             {[1, 2, 3, 4, 5].map((item) => (
               <div 
                 key={item} 
                 onClick={() => setSelected(item)}
                 className={cn(
                   "p-4 border-b border-gray-100 cursor-pointer transition-colors",
                   selected === item ? "bg-brand-orange-light border-l-4 border-brand-orange border-l-brand-orange" : "hover:bg-gray-50"
                 )}
               >
                 <p className="font-semibold text-gray-900">Applicant #{1024 + item}</p>
                 <p className="text-sm text-gray-500 mt-1">Submitted 2 hours ago</p>
               </div>
             ))}
          </div>
        </Card>

        {/* Review Detail */}
        {selected ? (
          <Card className="col-span-2 p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Applicant #1025</h2>
                <p className="text-gray-500">Name: Usman Ali • Phone: 0300 1234567</p>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">Pending Review</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">CNIC Front</p>
                <div className="bg-gray-100 rounded-2xl h-48 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1620311497914-f06b64bfa9be?w=400&q=80" alt="CNIC Front" className="w-full h-full object-cover opacity-80" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">CNIC Back</p>
                <div className="bg-gray-100 rounded-2xl h-48 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1620311497914-f06b64bfa9be?w=400&q=80" alt="CNIC Back" className="w-full h-full object-cover opacity-40 grayscale" />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-2">Live Selfie Match</p>
              <div className="flex items-center p-4 bg-green-50 border border-green-100 rounded-2xl">
                 <div className="w-16 h-16 rounded-full overflow-hidden me-4 border-2 border-green-500">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Usman" alt="Selfie" className="w-full h-full bg-white" />
                 </div>
                 <div>
                   <p className="font-semibold text-green-900">Auto-check Confidence: 94%</p>
                   <p className="text-sm text-green-700">Face matches CNIC photo.</p>
                 </div>
              </div>
            </div>

            <div className="mt-auto flex justify-end space-x-4 border-t border-gray-100 pt-6">
               <Button variant="danger" className="w-32 bg-white text-red-600 border-2 border-red-200 hover:bg-red-50">Reject</Button>
               <Button className="w-40 bg-brand-teal hover:bg-brand-teal-hover"><CheckCircle className="w-5 h-5 me-2" /> Approve</Button>
            </div>
          </Card>
        ) : (
          <div className="col-span-2 flex items-center justify-center text-gray-400">
            Select an application to review
          </div>
        )}
      </div>
    </div>
  );
}
