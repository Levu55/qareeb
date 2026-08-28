import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTranslation } from '../../locales/useTranslation';
import { MapPin, Navigation as NavIcon, Clock, CheckCircle2, AlertTriangle, Briefcase, Star, ArrowRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CATEGORIES } from '../../data/services';
import { useAppStore } from '../../store/useAppStore';




const earningsData = [
  { day: 'Mon', amount: 1200 },
  { day: 'Tue', amount: 800 },
  { day: 'Wed', amount: 1500 },
  { day: 'Thu', amount: 2000 },
  { day: 'Fri', amount: 4500 },
  { day: 'Sat', amount: 3200 },
  { day: 'Sun', amount: 0 },
];
export function HelperHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAvailable, setIsAvailable] = useState(true);
  const { helperServices } = useAppStore();

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pb-24 h-full">
      {/* Header */}
      <div className={`${isAvailable ? 'bg-brand-teal' : 'bg-gray-700'} px-6 pt-12 pb-6 rounded-b-[40px] shadow-lg relative overflow-hidden transition-colors`}>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        
        
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Helper Mode
          </div>
          <button 
            onClick={() => { useAppStore.getState().switchRole('user'); navigate('/user'); }}
            className="text-white/90 text-xs font-bold bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Switch to User Mode
          </button>
        </div>
        <div className="flex justify-between items-center mb-2 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              {isAvailable ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                  Available
                </>
              ) : 'Offline'}
            </h1>
            <p className="text-white/80 text-sm">{isAvailable ? 'Looking for jobs nearby...' : 'You won\'t receive new requests.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAvailable(!isAvailable)}
              className={`w-14 h-8 rounded-full transition-colors relative ${isAvailable ? 'bg-brand-orange' : 'bg-gray-500'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isAvailable && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Incoming Requests</h2>
            <Card className="border-l-4 border-l-brand-orange shadow-md relative overflow-hidden mb-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="absolute top-0 right-0 bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-bl-lg">URGENT</div>
              <div className="flex justify-between items-start mb-4 pt-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Fix Leaking Pipe</h3>
                  <p className="text-gray-500 text-sm flex items-center mt-1 mb-1">
                    <MapPin className="w-4 h-4 me-1" /> DHA Phase 6 (2km away)
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="bg-brand-teal/10 px-2 py-0.5 rounded text-[10px] font-bold text-brand-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified User
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-teal text-xl">Rs. 800</p>
                  <p className="text-xs text-gray-500">Est. 1 hr</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10">Decline</Button>
                <Button className="flex-1 h-10 bg-brand-orange hover:bg-orange-500 focus:ring-brand-orange text-white" onClick={() => navigate('/helper/active-job')}>Accept Job</Button>
              </div>
            </Card>
          </>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8">Your Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center hover:-translate-y-1 hover:shadow-md transition-all duration-300">
             <div className="text-2xl font-bold text-gray-900 mb-1">Rs. 4500</div>
             <div className="text-xs text-gray-500 font-medium">Earned Today</div>
          </Card>
          <Card className="p-4 text-center hover:-translate-y-1 hover:shadow-md transition-all duration-300">
             <div className="text-2xl font-bold text-gray-900 mb-1 flex items-center justify-center"><Star className="w-5 h-5 text-yellow-400 fill-current me-1"/> 4.9</div>
             <div className="text-xs text-gray-500 font-medium">Rating (128)</div>
          </Card>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-teal" /> Weekly Earnings</h2>
        <Card className="p-4 mb-4 hover:shadow-md transition-shadow">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`Rs. ${value}`, 'Earnings']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {
                    earningsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount > 2000 ? '#00C4B6' : '#94A3B8'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <h2 id="services" className="text-lg font-bold text-gray-900 mb-4 mt-8 scroll-mt-24">Your Service Categories</h2>
        <div className="grid grid-cols-2 gap-4">
          {helperServices && helperServices.length > 0 ? helperServices.map(service => (
            <Card key={service} className="p-4 flex flex-col items-center text-center border-brand-teal/20 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-brand-teal/40">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-brand-teal/10 text-brand-teal`}>
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{service}</h3>
              <p className="text-[10px] text-gray-500">Active</p>
            </Card>
          )) : (
            <div className="col-span-2 text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
              No services selected. Update your profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function ActiveJobScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<
    "navigating" | "working" | "rating" | "completed"
  >("navigating");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showSOS, setShowSOS] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-200 overflow-hidden pointer-events-none">
        <iframe 
          src="https://www.openstreetmap.org/export/embed.html?bbox=74.31%2C31.50%2C74.38%2C31.56&layer=mapnik&marker=31.5204%2C74.3587" 
          className="w-full h-full border-0 absolute inset-0 transform scale-110"
          title="Tracking Map"
        />
        <div className="absolute inset-0 bg-brand-teal/5 mix-blend-multiply"></div>
        <div 
          className={`absolute w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center z-10 transition-all duration-1000 ease-in-out ${status === 'navigating' ? 'bg-blue-500 top-[30%] left-[30%] animate-pulse' : status === 'working' ? 'bg-brand-orange top-[50%] left-[50%] animate-bounce' : 'bg-green-500 top-[50%] left-[50%]'}`}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <MapPin className="w-6 h-6 text-white" />
        </div>
        
        {status === 'navigating' && (
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center bg-gray-900 z-0">
             <MapPin className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      
      <div className="absolute top-12 left-6 right-6 z-10 flex justify-between items-center">
        <button
          onClick={() => navigate("/helper")}
          className="w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-gray-900"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="bg-white shadow-md rounded-full px-3 py-1.5 flex items-center gap-2">
           <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse"></div>
           <span className="text-xs font-bold text-gray-900">Active Job</span>
        </div>
        <button onClick={() => setShowSOS(true)} className="w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-red-500 hover:bg-red-50">
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>

      {showSOS && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center">
             {!sosSent ? (
               <>
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                   <AlertTriangle className="w-8 h-8 text-red-500" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Are you in an emergency?</h3>
                 <p className="text-sm text-gray-500 mb-6">This will alert Qareeb Support, share your live GPS location, and record the task identity.</p>
                 <div className="w-full flex gap-3">
                   <Button variant="outline" className="flex-1" onClick={() => setShowSOS(false)}>Cancel</Button>
                   <Button variant="danger" className="flex-1" onClick={() => setSosSent(true)}>Trigger SOS</Button>
                 </div>
               </>
             ) : (
               <>
                 <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
                   <CheckCircle2 className="w-8 h-8 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">SOS alert sent.</h3>
                 <p className="text-sm text-gray-500 mb-6">Support has been notified with your location and task details. They will contact you immediately.</p>
                 <Button className="w-full bg-gray-900 mb-3" onClick={() => setShowSOS(false)}>Close</Button>
                 <Button variant="ghost" className="w-full text-brand-teal">Contact Qareeb Support</Button>
               </>
             )}
          </div>
        </div>
      )}

      <div className="mt-auto bg-white rounded-t-[32px] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-20 pb-safe">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {status === "navigating"
                ? "Navigating to Customer"
                : status === "working"
                  ? "Job in Progress"
                  : "Job Completed"}
            </h2>
            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">Ahmed Khan <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> • Fix Leaking Pipe</p>
          </div>
          {status === "navigating" && (
            <div className="w-14 h-14 rounded-full border-[3px] border-brand-teal/20 flex flex-col items-center justify-center relative">
               <svg className="w-full h-full absolute -rotate-90" viewBox="0 0 36 36">
                  <path className="text-brand-teal" strokeDasharray="80, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
               </svg>
               <span className="font-bold text-brand-teal text-[11px] leading-tight mt-1">5</span>
               <span className="text-[7px] text-brand-teal font-medium uppercase">min</span>
            </div>
          )}
        </div>

        {status === "navigating" && (
          <>
            <div className="bg-brand-teal/5 border border-brand-teal/10 rounded-2xl p-4 flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                   <MapPin className="w-4 h-4 text-brand-teal" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-gray-900 mb-0.5">Destination</p>
                   <p className="text-[10px] text-gray-600">House 42, Street 1, DHA Phase 6</p>
                 </div>
               </div>
               <button className="w-10 h-10 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center text-brand-teal hover:bg-gray-50">
                 <NavIcon className="w-4 h-4" />
               </button>
            </div>
            
            <div className="flex gap-3">
              <Button className="w-12 h-12 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 p-0 flex items-center justify-center shrink-0 shadow-sm" variant="outline">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </Button>
              <Button
                className="flex-1 h-12 bg-brand-teal hover:bg-brand-teal-hover shadow-md shadow-brand-teal/20 text-sm"
                onClick={() => setStatus("working")}
              >
                I have arrived
              </Button>
            </div>
          </>
        )}

        {status === "working" && (
          <div className="space-y-4 mb-2">
            <div className="flex items-center justify-center py-8 px-6 bg-gray-50/50 rounded-3xl border border-gray-100 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border border-brand-orange/20 animate-ping"></div>
                  <Clock className="w-8 h-8 text-brand-orange" />
                </div>
                <span className="font-bold text-gray-900 text-3xl tracking-tight block mb-1">
                  00:45<span className="text-xl text-gray-400 font-medium">:12</span>
                </span>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Elapsed time</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 border-gray-200 text-gray-600 hover:bg-gray-50">Need Help?</Button>
              <Button
                className="flex-[2] h-12 bg-brand-teal hover:bg-brand-teal-hover shadow-md shadow-brand-teal/20"
                onClick={() => setStatus("rating")}
              >
                Complete Job
              </Button>
            </div>
          </div>
        )}


        {status === "rating" && (
          <div className="animate-in slide-in-from-bottom-8 pt-4 pb-8 w-full max-w-sm mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Rate the Customer</h2>
              <p className="text-gray-500 text-sm mb-6">How was your experience with Waleed?</p>
              
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="focus:outline-none transform transition-transform hover:scale-110 active:scale-95">
                    <Star className={`w-10 h-10 ${star <= rating ? 'text-brand-orange fill-brand-orange' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal mb-6 min-h-[120px] resize-none"
                placeholder="Write a review about the customer (optional)..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <Button className="w-full h-12 rounded-2xl text-lg bg-brand-teal" onClick={() => setStatus("completed")} disabled={rating === 0}>
                Submit Rating
              </Button>
            </div>
          </div>
        )}
        {status === "completed" && (
          <div className="text-center space-y-6 pt-2 pb-4 w-full max-w-[340px] mx-auto">
            <div className="w-24 h-24 bg-brand-teal/10 rounded-full flex items-center justify-center mx-auto text-brand-teal relative">
              <div className="absolute inset-0 rounded-full border border-brand-teal/20 animate-ping"></div>
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h3 className="font-bold text-[32px] text-brand-teal mb-1 tracking-tight">PKR 800</h3>
              <p className="text-sm text-gray-500 font-medium">Payment received via Wallet</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 my-6 flex justify-between items-center text-left">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Job Duration</p>
                <p className="text-sm font-bold text-gray-900">1h 15m</p>
              </div>
              <div className="w-[1px] h-8 bg-gray-200"></div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Customer Rating</p>
                <div className="flex items-center">
                  <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange mr-1" />
                  <span className="text-sm font-bold text-gray-900">5.0</span>
                </div>
              </div>
            </div>
            
            <Button className="w-full h-12 bg-brand-orange hover:bg-brand-orange-hover shadow-md shadow-brand-orange/20" onClick={() => navigate("/helper")}>
              Find Next Job
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
