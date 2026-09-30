import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useAppStore } from '../../store/useAppStore';
import { LogOut, User, Shield, CreditCard, CircleHelp, SwitchCamera, AlertTriangle, ArrowLeft, Plus, Check, Mail, Phone, MapPin, ChevronRight, MessageSquare, PhoneCall, Landmark, Bell, Share2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

import { supabase } from '../../lib/supabaseClient';

export function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const addToast = useAppStore(state => state.addToast);

  const handleToggleNotifications = () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            addToast('Push notifications enabled!');
          } else {
            addToast('Push notifications denied', 'error');
          }
        });
      } else {
        setNotificationsEnabled(true);
        addToast('Push notifications enabled!');
      }
    } else {
      setNotificationsEnabled(false);
      addToast('Push notifications disabled');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Qareeb - Local Services',
      text: 'Check out Qareeb, the best app for local services!',
      url: window.location.origin
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        addToast('Link copied to clipboard!');
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const { role, logout, userName, isHelper, switchRole, cnicStatus } = useAppStore();
  const navigate = useNavigate();
  
  const displayName = userName || 'User';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' }); // this device only; other devices stay signed in
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    logout();
    navigate('/auth');
  };

  const handleSwitchRole = () => {
    if (role === 'user') {
      if (isHelper) {
        switchRole('helper');
        navigate('/helper');
      } else {
        navigate('/user/become-helper');
      }
    } else {
      switchRole('user');
      navigate('/user');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col pb-24 h-full">
      <div className="bg-white p-6 pt-12 pb-8 shadow-sm text-center">
         <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF6B2C&color=fff`} className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md" />
         <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
         <p className="text-gray-500">{role === 'user' ? 'Customer' : 'Pro Helper'}</p>
         
         {/* CNIC state comes from the admin review (auth app_metadata) */}
         {cnicStatus === 'approved' ? (
           <div className="mt-4 inline-flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
             <Shield className="w-4 h-4 me-1" />
             Verified CNIC
           </div>
         ) : (
           <div className="mt-4 inline-flex items-center bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
             <AlertTriangle className="w-4 h-4 me-1" />
             {cnicStatus === 'pending' ? 'CNIC under review' : cnicStatus === 'rejected' ? 'CNIC rejected' : 'CNIC not verified'}
           </div>
         )}
      </div>

      <div className="p-6 space-y-2">

         <button onClick={() => navigate(`/${role}/profile/details`)} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 font-medium hover:border-brand-teal/30 border border-transparent shadow-sm active:scale-[0.98] transition-all">
           <div className="flex items-center"><User className="w-5 h-5 me-3 text-gray-400" /> Personal Details</div>
           <span className="text-gray-300">→</span>
         </button>
         <button onClick={() => navigate(`/${role}/profile/payments`)} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 font-medium hover:border-brand-teal/30 border border-transparent shadow-sm active:scale-[0.98] transition-all">
           <div className="flex items-center"><CreditCard className="w-5 h-5 me-3 text-gray-400" /> {role === 'helper' ? 'Payout Details' : 'Saved Payment Methods'}</div>
           <span className="text-gray-300">→</span>
         </button>
         <button onClick={() => navigate(`/${role}/profile/support`)} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 font-medium hover:border-brand-teal/30 border border-transparent shadow-sm active:scale-[0.98] transition-all">
           <div className="flex items-center"><CircleHelp className="w-5 h-5 me-3 text-gray-400" /> Help & Support</div>
           <span className="text-gray-300">→</span>
         </button>
         
         <div className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 font-medium border border-transparent shadow-sm">
           <div className="flex items-center"><Bell className="w-5 h-5 me-3 text-gray-400" /> Push Notifications</div>
           <button 
             onClick={handleToggleNotifications}
             className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-brand-teal' : 'bg-gray-300'}`}
           >
             <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
           </button>
         </div>
         
         <button onClick={handleShare} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 font-medium hover:border-brand-teal/30 border border-transparent shadow-sm active:scale-[0.98] transition-all">
           <div className="flex items-center"><Share2 className="w-5 h-5 me-3 text-gray-400" /> Share with Friends</div>
           <span className="text-gray-300">→</span>
         </button>

         <button onClick={handleSwitchRole} className="w-full mt-4 bg-brand-orange-light p-4 rounded-2xl flex items-center justify-center text-brand-orange font-bold shadow-sm active:scale-[0.98] transition-transform">
           <SwitchCamera className="w-5 h-5 me-2" />
           Switch to {role === 'user' ? 'Helper Mode' : 'User Mode'}
         </button>

         <button onClick={handleLogout} className="w-full mt-2 bg-red-50 p-4 rounded-2xl flex items-center justify-center text-red-500 font-bold shadow-sm active:scale-[0.98] transition-transform">
           <LogOut className="w-5 h-5 me-2" />
           Logout
         </button>
      </div>
    </div>
  );
}


export function PersonalDetailsScreen() {
  const navigate = useNavigate();
  const { userName, phone: userPhone, user, addToast } = useAppStore();
  const [name, setName] = useState(userName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The phone number is the verified sign-in number; the database keeps Profiles.Phone equal to it
  const phone = userPhone || (user?.phone ? `+${String(user.phone).replace(/^\+/, '')}` : '');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { data: { user: current } } = await supabase.auth.getUser();
      if (!current) throw new Error('Please sign in again.');
      const { data, error: profileError } = await supabase
        .from('Profiles')
        .update({ 'Full-name': trimmed })
        .eq('ID', current.id)
        .select('ID');
      if (profileError) throw profileError;
      if (!data || data.length === 0) throw new Error('Profile not found.');
      const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (metaError) throw metaError;
      useAppStore.setState({ userName: trimmed });
      addToast('Your details have been saved.');
      navigate(-1);
    } catch (err: any) {
      setError(err?.message || 'Could not save your details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto">
      <div className="bg-white px-4 py-4 md:px-8 border-b flex items-center gap-4 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
      </div>
      <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto w-full">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div className="flex flex-col items-center mb-6">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=FF6B2C&color=fff`} className="w-24 h-24 rounded-full shadow-sm border border-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={name} onChange={e => setName(e.target.value)} className="pl-12 bg-gray-50 border-gray-200" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={phone} readOnly disabled className="pl-12 bg-gray-100 border-gray-200 text-gray-500" type="tel" />
              </div>
              <p className="text-xs text-gray-500 mt-1">This is your verified sign-in number and cannot be changed here.</p>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <Button className="w-full mt-6 h-12 text-base shadow-md shadow-brand-orange/20" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SavedPaymentMethodsScreen() {
  const navigate = useNavigate();
  const role = useAppStore(state => state.role);

  // No payment provider is integrated yet, so no card/bank/wallet details are collected or stored
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto">
      <div className="bg-white px-4 py-4 md:px-8 border-b flex items-center gap-4 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{role === 'helper' ? 'Payout Details' : 'Payment Methods'}</h2>
      </div>
      <div className="p-4 md:p-8 space-y-4 max-w-2xl mx-auto w-full">
        <Card className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-500">
            {role === 'helper' ? <Landmark className="w-7 h-7" /> : <CreditCard className="w-7 h-7" />}
          </div>
          <h3 className="font-bold text-gray-900 mb-2">{role === 'helper' ? 'Payouts are not available yet' : 'Saved payment methods are not available yet'}</h3>
          <p className="text-sm text-gray-500">
            {role === 'helper'
              ? 'Customers currently pay you in cash. Bank and mobile-wallet payouts will be added with online payments.'
              : 'Jobs are currently paid in cash. Easypaisa, JazzCash and card payments will be added once online payments launch.'}
          </p>
        </Card>
      </div>
    </div>
  );
}

export function HelpSupportScreen() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  const faqs = [
    { q: 'How do I reset my password?', a: 'You can reset your password from the login screen by clicking "Forgot Password".' },
    { q: 'How are helpers verified?', a: 'All helpers go through a strict CNIC verification and background check process.' },
    { q: 'What is the refund policy?', a: 'If a task is not completed as agreed, you can dispute it within 24 hours for a full refund.' },
    { q: 'How do I cancel a booking?', a: 'Go to your Bookings, select the active task, and tap Cancel. Note that fees may apply if cancelled late.' }
  ];

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto">
      <div className="bg-white px-4 py-4 md:px-8 border-b flex items-center gap-4 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
      </div>
      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
           <div onClick={() => alert("Live chat initiated. An agent will be with you shortly.")} className="bg-brand-orange-light border border-brand-orange/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-100 transition-colors">
              <MessageSquare className="w-8 h-8 text-brand-orange mb-2" />
              <h3 className="font-bold text-brand-orange">Live Chat</h3>
              <p className="text-xs text-orange-700 mt-1">Typical reply in 5m</p>
           </div>
           <div onClick={() => alert("Calling Qareeb Support... Please hold.")} className="bg-brand-teal/10 border border-brand-teal/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-brand-teal/20 transition-colors">
              <PhoneCall className="w-8 h-8 text-brand-teal mb-2" />
              <h3 className="font-bold text-brand-teal">Call Us</h3>
              <p className="text-xs text-teal-800 mt-1">Available 24/7</p>
           </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
             {faqs.map((faq, i) => (
               <div key={i} className="divide-y divide-gray-100">
                 <div onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group">
                   <span className="font-medium text-gray-700 group-hover:text-brand-teal transition-colors">{faq.q}</span>
                   <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedFaq === i ? 'rotate-90 text-brand-teal' : 'group-hover:text-brand-teal'}`} />
                 </div>
                 {expandedFaq === i && (
                   <div className="p-4 bg-gray-50 text-sm text-gray-600 animate-in slide-in-from-top-2">
                     {faq.a}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
