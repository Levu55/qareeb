import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { TrendingUp, Users, DollarSign, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Navigate } from 'react-router-dom';
import { formatPKR } from '../../lib/utils';
import { getAdminStats, type AdminStats } from '../../lib/admin';

export function SuperAdminDashboard() {
  const role = useAppStore(state => state.role);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'superadmin') {
      getAdminStats().then(setStats).catch(err => setError(err?.message || 'Could not load statistics.'));
    }
  }, [role]);

  if (role !== 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  const show = (n: number | undefined, money = false) => (stats ? (money ? formatPKR(n || 0) : String(n ?? 0)) : '…');

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Founder Dashboard</h1>
        <p className="text-gray-500">System-wide overview.</p>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-brand-orange to-red-500 text-white border-0">
           <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
             <DollarSign className="w-6 h-6 text-white" />
           </div>
           <p className="text-white/80 font-medium text-sm mb-1">Job Value Completed Today</p>
           <h3 className="text-3xl font-bold">{show(stats?.job_value_completed_today, true)}</h3>
        </Card>
        <Card className="p-6">
           <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
             <TrendingUp className="w-6 h-6" />
           </div>
           <p className="text-gray-500 font-medium text-sm mb-1">Active Bookings</p>
           <h3 className="text-3xl font-bold text-gray-900">{show(stats?.bookings_active)}</h3>
        </Card>
        <Card className="p-6">
           <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
             <Users className="w-6 h-6" />
           </div>
           <p className="text-gray-500 font-medium text-sm mb-1">Verified Helpers</p>
           <h3 className="text-3xl font-bold text-gray-900">{show(stats?.helpers_approved)}</h3>
        </Card>
        <Card className="p-6">
           <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
             <ShieldAlert className="w-6 h-6" />
           </div>
           <p className="text-gray-500 font-medium text-sm mb-1">Helpers Pending Verification</p>
           <h3 className="text-3xl font-bold text-gray-900">{show(stats?.helpers_pending)}</h3>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
         <Card className="p-6">
           <h2 className="text-lg font-bold mb-2">Financial Controls</h2>
           <p className="text-sm text-gray-600">
             Platform commission and helper payouts are not configured yet: they depend on the online payment
             provider, which has not been integrated. Jobs are currently paid in cash directly to helpers.
           </p>
           <a href="/admin/settings" className="inline-block mt-3 text-sm font-bold text-brand-orange hover:underline">Platform settings →</a>
         </Card>
         <Card className="p-6">
           <h2 className="text-lg font-bold mb-2">System Logs</h2>
           <p className="text-sm text-gray-600">Approvals, role changes, admin overrides and setting changes are recorded in the audit log.</p>
           <a href="/admin/logs" className="inline-block mt-3 text-sm font-bold text-brand-orange hover:underline">Open audit log →</a>
         </Card>
      </div>
    </div>
  );
}
