import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTranslation } from '../../locales/useTranslation';
import { MapPin, Navigation as NavIcon, Clock, CheckCircle2, AlertTriangle, Briefcase, Star, ArrowRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CATEGORIES } from '../../data/services';
import { useAppStore } from '../../store/useAppStore';
import { getMyBookings, getMyBooking, getMyHelperRecord, setMyAvailability, updateBookingStatus, getMyEarnings, getReviewsAboutMe, submitReview, shareHelperLocation, onBookingsChange, osmEmbedUrl, categoryName, formatPrice, CURRENT_BOOKING_KEY, type BookingStatus, type EarningsDay, type MyBooking, type ReviewRecord } from '../../lib/marketplace';

// Accepted and under way; the database allows a helper only one of these at a time
const ONGOING_STATUSES: BookingStatus[] = ['Accepted', 'On-the-way', 'Arrived', 'In-progress'];


export function HelperHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAvailable, setIsAvailable] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [requests, setRequests] = useState<MyBooking[]>([]);
  const [activeJob, setActiveJob] = useState<MyBooking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { helperServices } = useAppStore();
  const userId: string | undefined = useAppStore(state => state.user?.id);
  const addToast = useAppStore(state => state.addToast);

  const [earnings, setEarnings] = useState<EarningsDay[]>([]);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [myCategories, setMyCategories] = useState<string[]>([]);
  // Services saved in Supabase; the local list is only a fallback before it loads
  const myServices = myCategories.length > 0 ? myCategories : (helperServices || []);

  // Availability, verification and rating come from the helper record
  useEffect(() => {
    getMyHelperRecord()
      .then(record => {
        setIsAvailable(Boolean(record?.['Is-available']));
        setVerifyStatus(record?.['Verify-status'] ?? null);
        setMyRating(record?.Rating != null ? Number(record.Rating) : null);
        setMyCategories(record?.Categories ?? []);
      })
      .catch(err => addToast(err?.message || 'Could not load your helper profile.', 'error'));
    getMyEarnings(7)
      .then(setEarnings)
      .catch(err => console.warn('Earnings load failed:', err));
    getReviewsAboutMe(100)
      .then(setReviews)
      .catch(err => console.warn('Reviews load failed:', err));
  }, []);

  // While available, share the device position so customers see distance/ETA (not coordinates)
  useEffect(() => {
    if (!isAvailable) return;
    shareHelperLocation().catch(err => console.warn('Location update failed:', err));
  }, [isAvailable]);

  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const earnedToday = earnings.find(d => d.day === todayKey)?.amount ?? 0;
  const earningsData = earnings.map(d => ({
    day: new Date(`${d.day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
    amount: d.amount,
  }));

  // Pending requests and the ongoing job; Realtime pushes new requests, polling is a fallback
  useEffect(() => {
    let active = true;
    const load = () => getMyBookings()
      .then(rows => {
        if (!active) return;
        const mine = rows.filter(r => r.my_role === 'helper');
        setRequests(mine.filter(r => r.status === 'Pending'));
        setActiveJob(mine.find(r => ONGOING_STATUSES.includes(r.status)) || null);
      })
      .catch(err => console.warn('Request refresh failed:', err));
    load();
    if (!isAvailable || !userId) return () => { active = false; };
    const unsubscribe = onBookingsChange(`Helper-id=eq.${userId}`, load);
    const timer = setInterval(load, 20000);
    return () => { active = false; clearInterval(timer); unsubscribe(); };
  }, [isAvailable, userId]);

  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await setMyAvailability(next);
    } catch (err: any) {
      setIsAvailable(!next);
      addToast(err?.message || 'Could not update availability.', 'error');
    }
  };

  const respond = async (request: MyBooking, accept: boolean) => {
    setBusyId(request.booking_id);
    try {
      await updateBookingStatus(request.booking_id, accept ? 'Accepted' : 'Rejected');
      setRequests(current => current.filter(r => r.booking_id !== request.booking_id));
      if (accept) {
        localStorage.setItem(CURRENT_BOOKING_KEY, request.booking_id);
        navigate('/helper/active-job');
      } else {
        addToast('Request declined.', 'info');
      }
    } catch (err: any) {
      addToast(err?.message || 'Could not update the request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

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
              onClick={toggleAvailability}
              className={`w-14 h-8 rounded-full transition-colors relative ${isAvailable ? 'bg-brand-orange' : 'bg-gray-500'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeJob && (
          <Card className="p-4 mb-6 border-l-4 border-l-brand-teal flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-1">Active job</p>
              <h3 className="font-bold text-gray-900">{activeJob.title || 'Task'}</h3>
              <p className="text-xs text-gray-500">{activeJob.counterpart_name} • {activeJob.status.replace(/-/g, ' ')}</p>
            </div>
            <Button className="h-10 px-4 text-sm" onClick={() => { localStorage.setItem(CURRENT_BOOKING_KEY, activeJob.booking_id); navigate('/helper/active-job'); }}>
              Continue
            </Button>
          </Card>
        )}
        {isAvailable && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Incoming Requests</h2>
            {verifyStatus !== 'Approved' && (
              <p className="text-sm text-gray-500 mb-4">Your helper verification is {verifyStatus ? verifyStatus.toLowerCase() : 'not started'}. You will receive requests once an admin approves it.</p>
            )}
            {verifyStatus === 'Approved' && requests.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">No new requests right now. New bookings will appear here.</p>
            )}
            {requests.map(request => (
            <Card key={request.booking_id} className="border-l-4 border-l-brand-orange shadow-md relative overflow-hidden mb-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="flex justify-between items-start mb-4 pt-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{request.title || 'New task'}</h3>
                  <p className="text-gray-500 text-sm flex items-center mt-1 mb-1">
                    <MapPin className="w-4 h-4 me-1" /> {request.location || 'Address shared after accepting'}
                    {request.helper_distance_km != null && ` (~${Number(request.helper_distance_km)} km away)`}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="bg-brand-teal/10 px-2 py-0.5 rounded text-[10px] font-bold text-brand-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified User
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{request.counterpart_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-teal text-xl">{formatPrice(request.price)}</p>
                  <p className="text-xs text-gray-500">{categoryName(request.category)}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10" disabled={busyId === request.booking_id} onClick={() => respond(request, false)}>Decline</Button>
                <Button className="flex-1 h-10 bg-brand-orange hover:bg-orange-500 focus:ring-brand-orange text-white" isLoading={busyId === request.booking_id} disabled={busyId === request.booking_id} onClick={() => respond(request, true)}>Accept Job</Button>
              </div>
            </Card>
            ))}
          </>
        )}

        {verifyStatus !== null && (verifyStatus !== 'Approved' || myServices.length === 0) && (
          <Card className="p-4 mt-6 border-l-4 border-l-brand-orange">
            <p className="text-sm text-gray-700 font-medium">
              {verifyStatus === 'Rejected'
                ? 'Your CNIC verification was rejected. Upload a new CNIC photo to be reviewed again.'
                : verifyStatus !== 'Approved'
                  ? `Your helper verification is ${verifyStatus.toLowerCase()}. Customers can book you once an admin approves it.`
                  : 'Choose the services you offer so customers can find you.'}
            </p>
            <button onClick={() => navigate('/helper/become-helper')} className="mt-2 text-sm font-bold text-brand-orange hover:underline">
              Update services & CNIC
            </button>
          </Card>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8">Your Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center hover:-translate-y-1 hover:shadow-md transition-all duration-300">
             <div className="text-2xl font-bold text-gray-900 mb-1">{formatPrice(earnedToday)}</div>
             <div className="text-xs text-gray-500 font-medium">Completed Job Value Today</div>
          </Card>
          <Card className="p-4 text-center hover:-translate-y-1 hover:shadow-md transition-all duration-300">
             <div className="text-2xl font-bold text-gray-900 mb-1 flex items-center justify-center"><Star className="w-5 h-5 text-yellow-400 fill-current me-1"/> {myRating ? myRating.toFixed(1) : 'New'}</div>
             <div className="text-xs text-gray-500 font-medium">Rating ({reviews.length >= 100 ? '100+' : reviews.length})</div>
          </Card>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-teal" /> Weekly Completed Job Value</h2>
        <Card className="p-4 mb-4 hover:shadow-md transition-shadow">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`Rs. ${value}`, 'Job value']}
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
          <p className="text-[11px] text-gray-400 mt-2">Value of jobs you completed each day. In-app payments and payouts are not enabled yet.</p>
        </Card>

        <h2 className="text-lg font-bold text-gray-900 mb-4 mt-8 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400 fill-current" /> Recent Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No reviews yet. Customers can rate you after a completed job.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {reviews.slice(0, 5).map(review => (
              <Card key={review.ID} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= review.Rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400">{new Date(review['Created-at']).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</span>
                </div>
                {review.Comment && <p className="text-sm text-gray-600">{review.Comment}</p>}
              </Card>
            ))}
          </div>
        )}

        <h2 id="services" className="text-lg font-bold text-gray-900 mb-4 mt-8 scroll-mt-24">Your Service Categories</h2>
        <div className="grid grid-cols-2 gap-4">
          {myServices.length > 0 ? myServices.map(service => (
            <Card key={service} className="p-4 flex flex-col items-center text-center border-brand-teal/20 hover:-translate-y-1 hover:shadow-md transition-all duration-300 hover:border-brand-teal/40">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-brand-teal/10 text-brand-teal`}>
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{categoryName(service)}</h3>
              <p className="text-[10px] text-gray-500">Active</p>
            </Card>
          )) : (
            <div className="col-span-2 text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
              No services selected.{' '}
              <button onClick={() => navigate('/helper/become-helper')} className="font-bold text-brand-orange hover:underline">Choose services</button>
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
    "navigating" | "arrived" | "working" | "rating" | "completed"
  >("navigating");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showSOS, setShowSOS] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const addToast = useAppStore(state => state.addToast);
  const bookingId = localStorage.getItem(CURRENT_BOOKING_KEY);
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Load the booking; starting the job moves an accepted booking to On-the-way
  useEffect(() => {
    if (!bookingId) {
      navigate('/helper', { replace: true });
      return;
    }
    (async () => {
      try {
        let current = await getMyBooking(bookingId);
        if (!current || current.my_role !== 'helper') {
          addToast('Job not found.', 'error');
          navigate('/helper', { replace: true });
          return;
        }
        if (current.status === 'Accepted') {
          await updateBookingStatus(bookingId, 'On-the-way');
          current = { ...current, status: 'On-the-way' };
        }
        setBooking(current);
        if (current.status === 'Arrived') {
          setStatus('arrived');
        } else if (current.status === 'In-progress') {
          setStatus('working');
          setWorkStartedAt(Date.now());
        } else if (current.status === 'Completed') {
          setStatus('completed');
        } else if (current.status === 'Cancelled' || current.status === 'Rejected') {
          addToast('This booking is no longer active.', 'info');
          navigate('/helper', { replace: true });
        }
      } catch (err: any) {
        addToast(err?.message || 'Could not load the job.', 'error');
      }
    })();
  }, [bookingId]);

  // Share position while travelling so the customer sees an up-to-date distance/ETA
  useEffect(() => {
    if (status !== 'navigating') return;
    const share = () => shareHelperLocation().catch(err => console.warn('Location update failed:', err));
    share();
    const timer = setInterval(share, 60000);
    return () => clearInterval(timer);
  }, [status]);

  // Notice if the customer cancels (Realtime push; polling is a fallback)
  useEffect(() => {
    if (!bookingId || status === 'rating' || status === 'completed') return;
    const check = async () => {
      try {
        const latest = await getMyBooking(bookingId);
        if (latest?.status === 'Cancelled') {
          addToast('The customer cancelled this booking.', 'info');
          localStorage.removeItem(CURRENT_BOOKING_KEY);
          navigate('/helper', { replace: true });
        }
      } catch (err) {
        console.warn('Job refresh failed:', err);
      }
    };
    const unsubscribe = onBookingsChange(`ID=eq.${bookingId}`, check);
    const timer = setInterval(check, 20000);
    return () => { clearInterval(timer); unsubscribe(); };
  }, [bookingId, status]);

  useEffect(() => {
    if (status !== 'working') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const elapsed = workStartedAt ? Math.max(0, Math.floor((now - workStartedAt) / 1000)) : 0;
  const [jobSeconds, setJobSeconds] = useState<number | null>(null);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const taskPoint = booking?.task_latitude != null && booking?.task_longitude != null
    ? { latitude: booking.task_latitude, longitude: booking.task_longitude }
    : null;
  const jobDuration = jobSeconds === null
    ? '—'
    : jobSeconds >= 3600
      ? `${Math.floor(jobSeconds / 3600)}h ${Math.round((jobSeconds % 3600) / 60)}m`
      : `${Math.max(1, Math.round(jobSeconds / 60))}m`;

  const submitCustomerRating = async () => {
    if (!bookingId || rating === 0) return;
    setIsSavingRating(true);
    try {
      await submitReview(bookingId, rating, feedback);
      setStatus('completed');
    } catch (err: any) {
      addToast(err?.message || 'Could not save your rating.', 'error');
    } finally {
      setIsSavingRating(false);
    }
  };
  const pad = (v: number) => String(v).padStart(2, '0');

  const advance = async (steps: ('Arrived' | 'In-progress' | 'Completed')[], nextView: 'arrived' | 'working' | 'rating') => {
    if (!bookingId) return;
    setIsUpdating(true);
    try {
      for (const step of steps) {
        await updateBookingStatus(bookingId, step);
      }
      setBooking(current => (current ? { ...current, status: steps[steps.length - 1] } : current));
      if (nextView === 'working') setWorkStartedAt(Date.now());
      setStatus(nextView);
    } catch (err: any) {
      addToast(err?.message || 'Could not update the job.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-200 overflow-hidden pointer-events-none">
        <iframe 
          src={taskPoint ? osmEmbedUrl(taskPoint, 0.02) : "https://www.openstreetmap.org/export/embed.html?bbox=74.31%2C31.50%2C74.38%2C31.56&layer=mapnik&marker=31.5204%2C74.3587"}
          className="w-full h-full border-0 absolute inset-0 transform scale-110"
          title="Tracking Map"
        />
        <div className="absolute inset-0 bg-brand-teal/5 mix-blend-multiply"></div>
        <div 
          className={`absolute w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center z-10 transition-all duration-1000 ease-in-out ${status === 'navigating' ? 'bg-blue-500 top-[30%] left-[30%] animate-pulse' : status === 'working' || status === 'arrived' ? 'bg-brand-orange top-[50%] left-[50%] animate-bounce' : 'bg-green-500 top-[50%] left-[50%]'}`}
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
                 <p className="text-sm text-gray-500 mb-6">In-app SOS alerts are not connected yet. If you are in danger, call Police (15) or Rescue (1122) now.</p>
                 <div className="w-full flex gap-3">
                   <Button variant="outline" className="flex-1" onClick={() => setShowSOS(false)}>Cancel</Button>
                   <Button variant="danger" className="flex-1" onClick={() => { window.location.href = 'tel:15'; setSosSent(true); }}>Call Police (15)</Button>
                 </div>
               </>
             ) : (
               <>
                 <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
                   <CheckCircle2 className="w-8 h-8 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Calling Police (15)</h3>
                 <p className="text-sm text-gray-500 mb-6">If the call did not start, dial 15 (Police) or 1122 (Rescue) from your phone. Qareeb Support was not notified automatically.</p>
                 <Button className="w-full bg-gray-900 mb-3" onClick={() => setShowSOS(false)}>Close</Button>
                 <Button variant="ghost" className="w-full text-brand-teal" onClick={() => { window.location.href = 'tel:1122'; }}>Call Rescue (1122)</Button>
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
                : status === "arrived"
                  ? "Arrived at Customer"
                  : status === "working"
                  ? "Job in Progress"
                  : "Job Completed"}
            </h2>
            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">{booking?.counterpart_name || 'Customer'} <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> • {booking?.title || 'Task'}</p>
          </div>
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
                   <p className="text-[10px] text-gray-600">{booking?.location || 'Address not provided'}</p>
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
                className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover shadow-md shadow-brand-orange/20 text-sm"
                onClick={() => advance(['Arrived'], 'arrived')}
                isLoading={isUpdating}
                disabled={isUpdating || !booking}
              >
                I have arrived
              </Button>
            </div>
          </>
        )}

        {status === "arrived" && (
          <div className="flex gap-3 mb-2">
            <Button
              className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover shadow-md shadow-brand-orange/20 text-sm"
              onClick={() => advance(['In-progress'], 'working')}
              isLoading={isUpdating}
              disabled={isUpdating || !booking}
            >
              Start Job
            </Button>
          </div>
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
                  {pad(Math.floor(elapsed / 3600))}:{pad(Math.floor(elapsed / 60) % 60)}<span className="text-xl text-gray-400 font-medium">:{pad(elapsed % 60)}</span>
                </span>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Elapsed time</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 border-gray-200 text-gray-600 hover:bg-gray-50">Need Help?</Button>
              <Button
                className="flex-[2] h-12 bg-brand-orange hover:bg-brand-orange-hover shadow-md shadow-brand-orange/20"
                onClick={() => { setJobSeconds(elapsed); advance(['Completed'], 'rating'); }}
                isLoading={isUpdating}
                disabled={isUpdating || !booking}
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
              <p className="text-gray-500 text-sm mb-6">How was your experience with {booking?.counterpart_name || 'this customer'}?</p>
              
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
              <Button className="w-full h-12 rounded-2xl text-lg bg-brand-orange" onClick={submitCustomerRating} disabled={rating === 0 || isSavingRating} isLoading={isSavingRating}>
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
              <h3 className="font-bold text-[32px] text-brand-teal mb-1 tracking-tight">{formatPrice(booking?.price)}</h3>
              <p className="text-sm text-gray-500 font-medium">Job value · paid in cash for now. Confirm receipt in your Wallet.</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 my-6 flex justify-between items-center text-left">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Job Duration</p>
                <p className="text-sm font-bold text-gray-900">{jobDuration}</p>
              </div>
              <div className="w-[1px] h-8 bg-gray-200"></div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Customer Rating</p>
                <div className="flex items-center">
                  <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange mr-1" />
                  <span className="text-sm font-bold text-gray-900">{rating > 0 ? rating.toFixed(1) : '—'}</span>
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
