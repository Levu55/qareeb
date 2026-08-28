import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useAppStore } from '../../store/useAppStore';
import { LogOut, User, Shield, CreditCard, CircleHelp, SwitchCamera, AlertTriangle, ArrowLeft, Plus, Check, Mail, Phone, MapPin, ChevronRight, MessageSquare, PhoneCall, Landmark, Bell, Share2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

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

  const { role, logout, login, userName, isHelper, switchRole } = useAppStore();
  const navigate = useNavigate();
  
  const displayName = userName || 'Waleed Ahmed'; // Fallback if somehow empty

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
         
         {role === 'helper' && (
           <div className="mt-4 inline-flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
             <Shield className="w-4 h-4 me-1" />
             Verified CNIC
           </div>
         )}
      </div>

      <div className="p-6 space-y-2">
         {role === 'helper' && (
           <Card className="p-4 mb-4 border-l-4 border-l-red-500 bg-red-50 flex gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-red-900 text-sm">Account Status: 1 Strike</h4>
                <p className="text-xs text-red-700 mt-1">You missed a scheduled job. 3 strikes will result in a temporary ban.</p>
              </div>
           </Card>
         )}

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

         <button onClick={logout} className="w-full mt-2 bg-red-50 p-4 rounded-2xl flex items-center justify-center text-red-500 font-bold shadow-sm active:scale-[0.98] transition-transform">
           <LogOut className="w-5 h-5 me-2" />
           Logout
         </button>
      </div>
    </div>
  );
}


export function PersonalDetailsScreen() {
  const navigate = useNavigate();
  const { userName, role } = useAppStore();
  const [name, setName] = useState(userName || 'Waleed Ahmed');
  const [email, setEmail] = useState('waleed@example.com');
  const [phone, setPhone] = useState('0300 1234567');
  
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
              <div className="relative">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Waleed')}&background=FF6B2C&color=fff`} className="w-24 h-24 rounded-full shadow-sm border border-gray-100" />
                <button className="absolute bottom-0 right-0 p-1.5 bg-brand-teal text-white rounded-full shadow-md border-2 border-white hover:bg-teal-600 transition-colors">
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-brand-teal font-medium mt-3 cursor-pointer">Change Profile Photo</span>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={name} onChange={e => setName(e.target.value)} className="pl-12 bg-gray-50 border-gray-200" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={email} onChange={e => setEmail(e.target.value)} className="pl-12 bg-gray-50 border-gray-200" type="email" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-12 bg-gray-50 border-gray-200" type="tel" />
              </div>
            </div>
          </div>
          <Button className="w-full mt-6 h-12 text-base shadow-md shadow-brand-orange/20" onClick={() => navigate(-1)}>
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
  const [selectedMethod, setSelectedMethod] = useState<string>('visa');
  const addToast = useAppStore(state => state.addToast);
  const [isAdding, setIsAdding] = useState(false);

  
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto">
      <div className="bg-white px-4 py-4 md:px-8 border-b flex items-center gap-4 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">{role === 'helper' ? 'Payout Details' : 'Payment Methods'}</h2>
      </div>
      <div className="p-4 md:p-8 space-y-4 max-w-2xl mx-auto w-full">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">Saved Cards</h3>
        <Card 
          onClick={() => setSelectedMethod('visa')}
          className={`p-4 border-2 flex items-center gap-4 cursor-pointer transition-colors ${selectedMethod === 'visa' ? 'border-brand-teal bg-teal-50/20' : 'border-transparent hover:border-gray-200'}`}
        >
           <div className="w-12 h-8 bg-blue-900 rounded border border-blue-800 flex items-center justify-center text-white text-xs font-bold font-serif italic">VISA</div>
           <div className="flex-1">
             <p className="font-bold text-gray-900">•••• •••• •••• 4242</p>
             <p className="text-xs text-gray-500">Expires 12/28</p>
           </div>
           <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedMethod === 'visa' ? 'bg-brand-teal' : 'border-2 border-gray-300'}`}>
             {selectedMethod === 'visa' && <Check className="w-3.5 h-3.5 text-white" />}
           </div>
        </Card>
        
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2 mt-6">Bank Accounts</h3>
        <Card 
          onClick={() => setSelectedMethod('bank')}
          className={`p-4 border-2 flex items-center gap-4 cursor-pointer transition-colors ${selectedMethod === 'bank' ? 'border-brand-teal bg-teal-50/20' : 'border-transparent hover:border-gray-200'}`}
        >
           <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
             <Landmark className="w-6 h-6"/>
           </div>
           <div className="flex-1">
             <p className="font-bold text-gray-900">Habib Bank Limited (HBL)</p>
             <p className="text-xs text-gray-500">PK34HABB••••••1234</p>
           </div>
           <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedMethod === 'bank' ? 'bg-brand-teal' : 'border-2 border-gray-300'}`}>
             {selectedMethod === 'bank' && <Check className="w-3.5 h-3.5 text-white" />}
           </div>
        </Card>
        
<h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2 mt-6">Mobile Wallets</h3>
        <Card 
          onClick={() => setSelectedMethod('easypaisa')}
          className={`p-4 border-2 flex items-center gap-4 cursor-pointer transition-colors ${selectedMethod === 'easypaisa' ? 'border-brand-teal bg-teal-50/20' : 'border-transparent hover:border-gray-200'}`}
        >
           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Easypaisa_Digital_Bank_logo.png/500px-Easypaisa_Digital_Bank_logo.png" alt="Easypaisa" className="w-12 h-12 object-contain" />
           <div className="flex-1">
             <p className="font-bold text-gray-900">Waleed Ahmed</p>
             <p className="text-xs text-gray-500">0300 ••••567</p>
           </div>
           <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedMethod === 'easypaisa' ? 'bg-brand-teal' : 'border-2 border-gray-300'}`}>
             {selectedMethod === 'easypaisa' && <Check className="w-3.5 h-3.5 text-white" />}
           </div>
        </Card>
        
        <Card 
          onClick={() => setSelectedMethod('jazzcash')}
          className={`p-4 border-2 flex items-center gap-4 cursor-pointer transition-colors ${selectedMethod === 'jazzcash' ? 'border-brand-teal bg-teal-50/20' : 'border-transparent hover:border-gray-200'}`}
        >
           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/JazzCash_logo_%282025%29.png/500px-JazzCash_logo_%282025%29.png" alt="JazzCash" className="w-12 h-12 object-contain" />
           <div className="flex-1">
             <p className="font-bold text-gray-900">Waleed Ahmed</p>
             <p className="text-xs text-gray-500">0300 ••••567</p>
           </div>
           <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedMethod === 'jazzcash' ? 'bg-brand-teal' : 'border-2 border-gray-300'}`}>
             {selectedMethod === 'jazzcash' && <Check className="w-3.5 h-3.5 text-white" />}
           </div>
        </Card>

                {isAdding ? (
           <div className="mt-6 p-4 border border-gray-200 rounded-xl bg-white space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <h4 className="font-bold text-gray-900">{role === 'helper' ? 'Add Payout Method' : 'Add New Payment Method'}</h4>
             <Input placeholder={role === 'helper' ? 'IBAN, Card Number or Wallet ID' : 'Card Number or Wallet ID'} className="bg-gray-50" />
             <div className="flex gap-2">
               <Button variant="secondary" className="flex-1" onClick={() => setIsAdding(false)}>Cancel</Button>
               <Button className="flex-1 shadow-md shadow-brand-teal/20" onClick={() => {
                 setIsAdding(false);
                 addToast('New payment method added successfully!');
               }}>Save</Button>
             </div>
           </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="w-full mt-6 py-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Plus className="w-5 h-5" /> {role === 'helper' ? 'Add Payout Method' : 'Add New Payment Method'}
          </button>
        )}
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
