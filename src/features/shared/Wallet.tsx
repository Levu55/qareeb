import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  getMyWallet, getMyTransactions, getMyPayments, getMyBookings, confirmCashReceived, formatPrice,
  type PaymentRecord, type TransactionRecord, type WalletRecord,
} from '../../lib/marketplace';

// Real wallet, payment and transaction records. Online payments, top-ups and withdrawals
// need a payment provider, which is not integrated yet, so those actions are shown as unavailable.

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  Due: 'Payment due',
  'Awaiting-confirmation': 'Cash, awaiting confirmation',
  Paid: 'Paid',
  Failed: 'Failed',
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }) : '';
}

export function WalletScreen() {
  const role = useAppStore(state => state.role);
  const userId: string | undefined = useAppStore(state => state.user?.id);
  const addToast = useAppStore(state => state.addToast);
  const [wallet, setWallet] = useState<WalletRecord | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const isHelper = role === 'helper';

  const load = async () => {
    try {
      const [w, tx, pays, bookings] = await Promise.all([getMyWallet(), getMyTransactions(), getMyPayments(), getMyBookings()]);
      setWallet(w);
      setTransactions(tx);
      setPayments(pays);
      setTitles(Object.fromEntries(bookings.map(b => [b.booking_id, b.title || 'Task'])));
    } catch (err: any) {
      addToast(err?.message || 'Could not load your wallet.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Helper mode shows money received for jobs; user mode shows what this account paid
  const mine = payments.filter(p => (isHelper ? p['Payee-id'] === userId : p['Payer-id'] === userId));
  const paidTotal = mine.filter(p => p.Status === 'Paid').reduce((sum, p) => sum + Number(p.Amount), 0);
  const openPayments = mine.filter(p => p.Status === 'Due' || p.Status === 'Awaiting-confirmation');
  const openTotal = openPayments.reduce((sum, p) => sum + Number(p.Amount), 0);

  const handleConfirm = async (payment: PaymentRecord) => {
    setConfirmingId(payment.ID);
    try {
      await confirmCashReceived(payment['Booking-id']);
      addToast('Cash payment confirmed.', 'success');
      await load();
    } catch (err: any) {
      addToast(err?.message || 'Could not confirm the payment.', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pb-24 h-full relative overflow-hidden">
      <div className={`px-6 pt-12 pb-8 text-white rounded-b-[40px] shadow-lg relative ${isHelper ? 'bg-gray-900' : 'bg-brand-orange'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <h1 className="text-xl font-bold mb-6 relative z-10">My Wallet</h1>

        <div className="relative z-10">
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
          <h2 className="text-4xl font-bold mb-6 text-white">{isLoading ? '…' : formatPrice(wallet?.Balance)}</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <p className="text-white/60 text-[10px] uppercase font-bold mb-1">{isHelper ? 'Received for jobs' : 'Paid for jobs'}</p>
              <p className="font-bold text-lg text-white">{formatPrice(paidTotal)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
              <p className="text-white/60 text-[10px] uppercase font-bold mb-1">{isHelper ? 'Awaiting payment' : 'Still to pay'}</p>
              <p className="font-bold text-lg text-white">{formatPrice(openTotal)}</p>
            </div>
          </div>

          <Button disabled className="w-full bg-white/10 border border-white/20 text-white/80 cursor-not-allowed">
            {isHelper ? 'Withdrawals coming soon' : 'Top-ups coming soon'}
          </Button>
          <p className="text-white/60 text-[11px] mt-2 text-center">Online payments, top-ups and withdrawals are not available yet. Jobs are paid in cash for now.</p>
        </div>
      </div>

      <div className="p-6 relative z-10">
        <h3 className="font-bold text-gray-900 mb-4">Job Payments</h3>
        <div className="space-y-3 mb-8">
          {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {!isLoading && mine.length === 0 && (
            <p className="text-sm text-gray-500">No job payments yet. They appear here when a booking is completed.</p>
          )}
          {mine.map(payment => (
            <Card key={payment.ID} className={`p-4 border-l-4 ${payment.Status === 'Paid' ? 'border-l-brand-teal' : 'border-l-brand-orange'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${payment.Status === 'Paid' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-orange-50 text-brand-orange'}`}>
                    {payment.Status === 'Paid' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{titles[payment['Booking-id']] || 'Task'}</p>
                    <p className="text-[10px] text-gray-500">
                      {formatDate(payment['Paid-at'] || payment['Created-at'])} • {PAYMENT_STATUS_LABEL[payment.Status] || payment.Status}
                    </p>
                  </div>
                </div>
                <div className={`font-bold ${payment.Status === 'Paid' ? 'text-brand-teal' : 'text-gray-900'}`}>
                  {isHelper ? '+' : '-'} {formatPrice(payment.Amount)}
                </div>
              </div>
              {isHelper && payment.Status === 'Awaiting-confirmation' && (
                <Button className="w-full h-10 mt-3 text-sm" isLoading={confirmingId === payment.ID} disabled={confirmingId !== null} onClick={() => handleConfirm(payment)}>
                  Confirm cash received
                </Button>
              )}
            </Card>
          ))}
        </div>

        <h3 className="font-bold text-gray-900 mb-4">Wallet Transactions</h3>
        <div className="space-y-3">
          {!isLoading && transactions.length === 0 && (
            <p className="text-sm text-gray-500">No wallet transactions yet.</p>
          )}
          {transactions.map(tx => (
            <Card key={tx.ID} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${Number(tx.Amount) >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {Number(tx.Amount) >= 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{tx.Type || 'Transaction'}</p>
                  <p className="text-[10px] text-gray-500">{formatDate(tx['Created-at'])} • {tx.Status}</p>
                </div>
              </div>
              <div className="font-bold text-gray-900">{formatPrice(tx.Amount)}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
