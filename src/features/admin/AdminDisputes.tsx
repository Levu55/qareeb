import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertTriangle, MessageSquare } from 'lucide-react';

export function AdminDisputesScreen() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dispute Resolution</h1>
        <p className="text-gray-500">Handle customer and helper complaints.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
           {[1, 2, 3].map(i => (
             <Card key={i} className={`p-4 cursor-pointer hover:border-brand-orange transition-colors ${i===1 ? 'border-brand-orange ring-1 ring-brand-orange' : ''}`}>
               <div className="flex justify-between mb-2">
                 <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded">High Priority</span>
                 <span className="text-xs text-gray-400">2 hrs ago</span>
               </div>
               <h3 className="font-bold text-gray-900">Job #8042 - Payment Issue</h3>
               <p className="text-sm text-gray-500 mt-1 line-clamp-2">Customer claims helper charged extra for materials not used.</p>
             </Card>
           ))}
        </div>
        
        <div className="col-span-2">
          <Card className="h-full flex flex-col p-6">
             <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
               <div>
                 <h2 className="text-xl font-bold">Dispute #8042</h2>
                 <p className="text-sm text-gray-500">Filed by: Ahmed Khan (Customer)</p>
               </div>
               <Button variant="danger" size="sm">Issue Refund</Button>
             </div>

             <div className="flex-1 overflow-auto bg-gray-50 rounded-xl p-4 mb-4 space-y-4">
                <div className="bg-white p-3 rounded-lg shadow-sm w-3/4">
                  <p className="text-xs font-bold text-gray-900 mb-1">Ahmed Khan</p>
                  <p className="text-sm text-gray-600">The plumber asked for Rs. 500 extra for parts, but he used my parts.</p>
                </div>
                <div className="bg-brand-teal-light p-3 rounded-lg shadow-sm w-3/4 ml-auto">
                  <p className="text-xs font-bold text-brand-teal mb-1">Kamran (Helper)</p>
                  <p className="text-sm text-gray-700">I used the teflon tape and sealants from my own kit.</p>
                </div>
             </div>

             <div className="flex gap-2">
                <Button className="flex-1 bg-gray-900 text-white hover:bg-gray-800"><MessageSquare className="w-4 h-4 me-2"/> Message Parties</Button>
                <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50"><AlertTriangle className="w-4 h-4 me-2"/> Strike Helper</Button>
                <Button className="flex-1 bg-brand-teal hover:bg-brand-teal-hover">Resolve & Close</Button>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
