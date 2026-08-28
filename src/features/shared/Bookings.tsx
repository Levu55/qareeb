import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Briefcase, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function BookingsScreen() {
  const role = useAppStore(state => state.role);
  const [activeTab, setActiveTab] = useState<'active' | 'past' | 'cancelled'>('active');

  const allBookings = [
    {
      id: 1,
      title: 'Plumbing Repair',
      status: 'Scheduled',
      statusColor: 'bg-blue-100 text-blue-700',
      price: 'Rs. 800',
      date: 'Tomorrow, 10:00 AM',
      helperName: 'Kamran Ali (Plumber)',
      customerName: 'Waleed Ahmed',
      location: 'DHA Phase 6',
      type: 'active'
    },
    {
      id: 2,
      title: 'AC Service & Cleaning',
      status: 'In Progress',
      statusColor: 'bg-orange-100 text-orange-700',
      price: 'Rs. 1,500',
      date: 'Today, 2:30 PM',
      helperName: 'Zain Abbas (Technician)',
      customerName: 'Sara Khan',
      location: 'Clifton Block 4',
      type: 'active'
    },
    {
      id: 3,
      title: 'Deep House Cleaning',
      status: 'Pending',
      statusColor: 'bg-yellow-100 text-yellow-700',
      price: 'Rs. 2,500',
      date: 'Aug 16, 09:00 AM',
      helperName: 'Fatima Bibi (Cleaner)',
      customerName: 'Waleed Ahmed',
      location: 'Gulshan-e-Iqbal',
      type: 'active'
    },
    {
      id: 4,
      title: 'Electrical Wiring Fix',
      status: 'Completed',
      statusColor: 'bg-green-100 text-green-700',
      price: 'Rs. 1,200',
      date: 'Yesterday, 11:00 AM',
      helperName: 'Hassan Raza (Electrician)',
      customerName: 'Ali Hassan',
      location: 'Bahria Town',
      type: 'past'
    },
    {
      id: 5,
      title: 'Car Wash',
      status: 'Cancelled',
      statusColor: 'bg-red-100 text-red-700',
      price: 'Rs. 500',
      date: 'Aug 12, 04:00 PM',
      helperName: 'Usman Tariq (Washer)',
      customerName: 'Waleed Ahmed',
      location: 'DHA Phase 2',
      type: 'cancelled'
    }
  ];

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
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <Card key={booking.id} className="p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
               <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-50">
                 <div>
                   <div className={`text-xs font-bold px-2.5 py-1 rounded-full mb-2 inline-flex items-center gap-2 shadow-sm transition-all hover:scale-105 ${booking.statusColor}`}>
                     {(booking.status === 'In Progress' || booking.status === 'Scheduled' || booking.status === 'Pending') && (
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
