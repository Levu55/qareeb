import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTranslation } from '../../locales/useTranslation';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, CreditCard } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function WalletScreen() {
  const { t } = useTranslation();
  const role = useAppStore(state => state.role);
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pb-24 h-full relative overflow-hidden">
      <div className={`px-6 pt-12 pb-8 text-white rounded-b-[40px] shadow-lg relative ${role === 'helper' ? 'bg-gray-900' : 'bg-brand-orange'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <h1 className="text-xl font-bold mb-6 relative z-10">My Wallet</h1>
        
        {role === 'helper' ? (
          <div className="relative z-10">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
            <h2 className="text-4xl font-bold mb-6 text-white">Rs. 8,500</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                 <p className="text-white/60 text-[10px] uppercase font-bold mb-1">Pending</p>
                 <p className="font-bold text-lg text-white">Rs. 1,200</p>
               </div>
               <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                 <p className="text-white/60 text-[10px] uppercase font-bold mb-1">Total Earned</p>
                 <p className="font-bold text-lg text-white">Rs. 24,700</p>
               </div>
            </div>
            
            <Button className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white shadow-md shadow-brand-orange/20 border-none" onClick={() => setShowWithdraw(true)}>
              Withdraw Funds
            </Button>
          </div>
        ) : (
          <div className="relative z-10">
            <p className="text-white/80 text-sm mb-1">Available Balance</p>
            <h2 className="text-4xl font-bold mb-6">Rs. 4,500</h2>
            <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">Top Up</Button>
          </div>
        )}
      </div>

      <div className="p-6 relative z-10">
        <h3 className="font-bold text-gray-900 mb-4">Transaction History</h3>
        <div className="space-y-3">
          {role === 'helper' ? (
            <>
              <Card className="p-4 flex items-center justify-between border-l-4 border-l-brand-teal">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                     <CheckCircle2 className="w-5 h-5"/>
                   </div>
                   <div>
                     <p className="font-bold text-gray-900 text-sm">Plumbing Service</p>
                     <p className="text-[10px] text-gray-500">Today, 2:30 PM • Completed</p>
                   </div>
                 </div>
                 <div className="font-bold text-brand-teal">
                   + Rs. 800
                 </div>
              </Card>
              <Card className="p-4 flex items-center justify-between border-l-4 border-l-gray-300">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                     <ArrowUpRight className="w-5 h-5"/>
                   </div>
                   <div>
                     <p className="font-bold text-gray-900 text-sm">Withdrawal to JazzCash</p>
                     <p className="text-[10px] text-gray-500">Yesterday • Processing</p>
                   </div>
                 </div>
                 <div className="font-bold text-gray-900">
                   - Rs. 2,000
                 </div>
              </Card>
              <Card className="p-4 flex items-center justify-between border-l-4 border-l-brand-teal">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                     <CheckCircle2 className="w-5 h-5"/>
                   </div>
                   <div>
                     <p className="font-bold text-gray-900 text-sm">Electrical Repair</p>
                     <p className="text-[10px] text-gray-500">Aug 10 • Completed</p>
                   </div>
                 </div>
                 <div className="font-bold text-brand-teal">
                   + Rs. 550
                 </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                     <ArrowUpRight className="w-5 h-5"/>
                   </div>
                   <div>
                     <p className="font-bold text-gray-900 text-sm">Plumbing Service</p>
                     <p className="text-[10px] text-gray-500">Today, 2:30 PM</p>
                   </div>
                 </div>
                 <div className="font-bold text-gray-900">
                   - Rs. 800
                 </div>
              </Card>
              <Card className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                     <ArrowDownLeft className="w-5 h-5"/>
                   </div>
                   <div>
                     <p className="font-bold text-gray-900 text-sm">Top up via JazzCash</p>
                     <p className="text-[10px] text-gray-500">Yesterday</p>
                   </div>
                 </div>
                 <div className="font-bold text-green-600">
                   + Rs. 2,000
                 </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {showWithdraw && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end animate-in fade-in">
          <div className="bg-white rounded-t-3xl p-6 w-full animate-in slide-in-from-bottom-10">
             <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
             <h3 className="text-xl font-bold text-gray-900 mb-4">Withdraw Funds</h3>
             
             <div className="space-y-3 mb-6">
               <div className="border border-brand-orange bg-orange-50/50 rounded-2xl p-4 flex justify-between items-center cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 p-1">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/JazzCash_logo_%282025%29.png/500px-JazzCash_logo_%282025%29.png" alt="JazzCash" className="w-full h-full object-contain" />
                   </div>
                   <span className="font-bold text-gray-900 text-sm">JazzCash</span>
                 </div>
                 <div className="w-5 h-5 rounded-full border-4 border-brand-orange bg-white"></div>
               </div>
               
               <div className="border border-gray-200 rounded-2xl p-4 flex justify-between items-center cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 p-1">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Easypaisa_Digital_Bank_logo.png/500px-Easypaisa_Digital_Bank_logo.png" alt="Easypaisa" className="w-full h-full object-contain" />
                   </div>
                   <span className="font-bold text-gray-700 text-sm">Easypaisa</span>
                 </div>
                 <div className="w-5 h-5 rounded-full border border-gray-300"></div>
               </div>
               
               <div className="border border-gray-200 rounded-2xl p-4 flex justify-between items-center cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 border border-gray-100"><WalletIcon className="w-4 h-4"/></div>
                   <span className="font-bold text-gray-700 text-sm">Bank Transfer</span>
                 </div>
                 <div className="w-5 h-5 rounded-full border border-gray-300"></div>
               </div>

               <div className="border border-gray-200 rounded-2xl p-4 flex justify-between items-center cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 border border-gray-100"><CreditCard className="w-4 h-4"/></div>
                   <span className="font-bold text-gray-700 text-sm">Credit/Debit Card</span>
                 </div>
                 <div className="w-5 h-5 rounded-full border border-gray-300"></div>
               </div>
             </div>

             <div className="mb-6 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">Rs.</span>
               <input type="number" defaultValue="8500" className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 font-bold text-lg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" />
             </div>
             
             <div className="flex gap-3 pb-safe">
               <Button variant="outline" className="flex-1" onClick={() => setShowWithdraw(false)}>Cancel</Button>
               <Button className="flex-1 bg-brand-orange hover:bg-brand-orange-hover shadow-md" onClick={() => setShowWithdraw(false)}>Confirm</Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
