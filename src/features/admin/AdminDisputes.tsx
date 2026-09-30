import React from 'react';
import { Card } from '../../components/ui/Card';
import { AlertTriangle } from 'lucide-react';

// Disputes have no backend yet (no table, workflow or notifications), so nothing is shown
// instead of sample complaints.
export function AdminDisputesScreen() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dispute Resolution</h1>
        <p className="text-gray-500">Handle customer and helper complaints.</p>
      </div>

      <Card className="p-8 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-brand-orange shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Dispute handling is not available yet</h2>
            <p className="text-sm text-gray-600">
              Customers and helpers cannot file disputes in the app yet, so there is nothing to review here.
              Until this is built, handle complaints through support and check the booking in Jobs and the audit log.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
