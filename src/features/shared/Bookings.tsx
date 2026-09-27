import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Briefcase, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getMyBookings, formatPrice, CURRENT_BOOKING_KEY, type MyBooking } from '../../lib/marketplace';

interface BookingCard {
  id: string;
  title: string;
  status: string;
  statusColor: string;
  live: boolean;
  price: string;
  date: string;
  helperName: string;
  customerName: string;
  location: string;
  type: 'active' | 'past' | 'cancelled';
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; type: BookingCard['type']; live: boolean }> = {
  Pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', type: 'active', live: true },
  Accepted: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', type: 'active', live: true },
  'On-the-way': { label: 'On the Way', color: 'bg-orange-100 text-orange-700', type: 'active', live: true },
  Arrived: { label: 'Arrived', color: 'bg-orange-100 text-orange-700', type: 'active', live: true },
  'In-progress': { label: 'In Progress', color: 'bg-orange-100 text-orange-700', type: 'active', live: true },
  Completed: { label: 'Completed', color: 'bg-green-100 text-green-700', type: 'past', live: false },
  Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', type: 'cancelled', live: false },
  Rejected: { label: 'Declined', color: 'bg-red-100 text-red-700', type: 'cancelled', live: false },
};

function toBookingCard(b: MyBooking): BookingCard {
  const display = STATUS_DISPLAY[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-700', type: 'active' as const, live: false };
  const when = new Date(b.scheduled_at || b.created_at);
  const name = b.counterpart_name || 'Qareeb user';
  return {
    id: b.booking_id,
    title: b.title || 'Task',
    status: display.label,
    statusColor: display.color,
    live: display.live,
    price: formatPrice(b.price),
    date: when.toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    helperName: name,
    customerName: name,
    location: b.location || '',
    type: display.type,
  };
}

export function BookingsScreen() {
  const role = useAppStore(state => state.role);
  const [activeTab, setActiveTab] = useState<'active' | 'past' | 'cancelled'>('active');

  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);
  const [allBookings, setAllBookings] = useState<BookingCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyBookings()
      .then(rows => {
        if (!active) return;
        // Show customer bookings in user mode and assigned jobs in helper mode
        const mine = rows.filter(r => (role === 'helper' ? r.my_role === 'helper' : r.my_role === 'customer'));
        setAllBookings(mine.map(toBookingCard));
      })
      .catch(err => addToast(err?.message || 'Could not load bookings.', 'error'))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [role]);

  const openBooking = (booking: BookingCard) => {
    if (booking.type !== 'active') return;
    localStorage.setItem(CURRENT_BOOKING_KEY, booking.id);
    navigate(role === 'helper' ? '/helper/active-job' : '/user/tracking');
  };

  const bookings = allBookings.filter(b => b.type === activeTab);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pb-24 h-full">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 sticky top-0">
        <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
        <div className="flex gap-4 mt-4 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('active')}
            className={`pb-2 font-bold text-sm px-2 transition-colors ${activeTab === 'active' ? 'border-b-2 border-brand-orange text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`pb-2 font-bold text-sm px-2 transition-colors ${activeTab === 'past' ? 'border-b-2 border-brand-orange text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Past
          </button>
          <button 
            onClick={() => setActiveTab('cancelled')}
            className={`pb-2 font-bold text-sm px-2 transition-colors ${activeTab === 'cancelled' ? 'border-b-2 border-brand-orange text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Cancelled
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <p className="text-center text-sm text-gray-500 py-12">Loading bookings…</p>
        ) : bookings.length > 0 ? (
          bookings.map((booking) => (
            <Card key={booking.id} onClick={() => openBooking(booking)} className="p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
               <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-50">
                 <div>
                   <div className={`text-xs font-bold px-2.5 py-1 rounded-full mb-2 inline-flex items-center gap-2 shadow-sm transition-all hover:scale-105 ${booking.statusColor}`}>
                     {booking.live && (
                       <span className="relative flex h-2.5 w-2.5">
                         <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${booking.statusColor.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}`}></span>
                         <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${booking.statusColor.split(' ')[1].replace('text-', 'bg-')}`}></span>
                       </span>
                     )}
                     {booking.status}
                   </div>
                   <h3 className="font-bold text-gray-900">{booking.title}</h3>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-brand-teal">{booking.price}</p>
                 </div>
               </div>
               
               <div className="flex items-center text-sm text-gray-500 mb-3">
                 <Calendar className="w-4 h-4 me-2" /> {booking.date}
               </div>
  
               <div className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl">
                 <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(role === 'user' ? booking.helperName : booking.customerName)}&background=FF6B2C&color=fff`} className="w-10 h-10 rounded-full" />
                 <div>
                   <p className="font-semibold text-gray-900 text-sm">
                     {role === 'user' ? booking.helperName : booking.customerName}
                   </p>
                   <p className="text-xs text-gray-500">{booking.location}</p>
                 </div>
               </div>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No {activeTab} bookings</h3>
            <p className="text-sm text-gray-500 max-w-[200px]">You don't have any {activeTab} tasks right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
