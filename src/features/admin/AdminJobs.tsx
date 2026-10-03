import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { getJobs, type AdminJob } from '../../lib/admin';
import { categoryName, formatPrice } from '../../lib/marketplace';

const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Accepted: 'bg-blue-100 text-blue-700',
  'On-the-way': 'bg-blue-100 text-blue-700',
  Arrived: 'bg-blue-100 text-blue-700',
  'In-progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

const PAYMENT_LABEL: Record<string, string> = {
  Due: 'Due',
  'Awaiting-confirmation': 'Cash, unconfirmed',
  Paid: 'Paid',
  Failed: 'Failed',
};

export function AdminJobsScreen() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch(err => setError(err?.message || 'Could not load jobs.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Jobs Management</h1>
        <p className="text-gray-500">All bookings across the platform (latest 200).</p>
      </div>

      <Card className="flex-1 overflow-auto rounded-2xl p-0">
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 text-sm font-semibold text-gray-600">Job</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Customer</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Helper</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Service</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Amount</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Payment</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-4 text-sm text-gray-500" colSpan={8}>Loading…</td></tr>}
            {!isLoading && !error && jobs.length === 0 && <tr><td className="p-4 text-sm text-gray-500" colSpan={8}>No bookings yet.</td></tr>}
            {jobs.map(job => (
              <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="p-4">
                  <p className="font-medium text-gray-900">{job.title}</p>
                  <p className="font-mono text-xs text-gray-400">{job.id.slice(0, 8)}</p>
                </td>
                <td className="p-4 font-medium">{job.customer || '—'}</td>
                <td className="p-4 text-gray-600">{job.helper || '—'}</td>
                <td className="p-4">{categoryName(job.category) || '—'}</td>
                <td className="p-4 font-bold">{formatPrice(job.price)}</td>
                <td className="p-4">
                  <span className={cn('px-2 py-1 rounded text-xs font-bold', STATUS_STYLE[job.status] || 'bg-gray-100 text-gray-600')}>{job.status.replace(/-/g, ' ')}</span>
                </td>
                <td className="p-4 text-sm text-gray-600">{job.payment ? PAYMENT_LABEL[job.payment] || job.payment : '—'}</td>
                <td className="p-4 text-sm text-gray-600">{new Date(job.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
