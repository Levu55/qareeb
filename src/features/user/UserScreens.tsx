
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { VoiceButton } from '../../components/ui/VoiceButton';
import { QareebLogo } from '../../components/ui/QareebLogo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTranslation } from '../../locales/useTranslation';
import { useAppStore } from '../../store/useAppStore';
import { Wrench, Calendar, Camera, Box, Lock, Zap, Droplets, Paintbrush, Truck, MapPin, Search, Star, Clock, ArrowRight, ShieldCheck, Phone, CheckCircle2, Menu, Bell, Home, PlayCircle, ClipboardList, CheckCircle, FileText, User, ShoppingBag, Heart, Tent, Scissors, Plus, ChevronRight, BookOpen, MonitorSmartphone, UserRoundCheck, Edit2, Tag } from 'lucide-react';
import { SERVICE_CATEGORIES, DEMO_HELPERS, DIGITAL_PAYMENT_THRESHOLD } from '../../config/businessLogic';

const SafetyShield = () => (
  <div className="bg-brand-teal-light text-brand-teal p-3 rounded-xl flex items-start text-sm mb-6 font-medium">
    <ShieldCheck className="w-5 h-5 me-2 shrink-0 mt-0.5" />
    <span>Qareeb Safety — Your safety comes first. Verified helpers and secure tracking.</span>
  </div>
);

const SparklesIcon = (props: any) => <Star {...props} />;

const getIcon = (name: string) => {
  const icons: any = { BookOpen, Scissors, Sparkles: SparklesIcon, Droplets, Zap, Wrench, MonitorSmartphone, ShoppingBag, Heart, UserRoundCheck, Box, Paintbrush };
  const Icon = icons[name] || Box;
  return <Icon className="w-8 h-8 md:w-10 md:h-10" />;
};



export function UserHome() {
  const navigate = useNavigate();

  const userName = useAppStore(state => state.userName);
  const tasks = useAppStore(state => state.tasks);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="pb-24 bg-white min-h-screen font-sans overflow-x-hidden">
      {/* Notifications Overlay */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setShowNotifications(false)}>
           <div className="w-full max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-brand-orange" /> Notifications</h2>
                 <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {[
                   { title: 'Booking Confirmed', desc: 'Your plumber is confirmed for tomorrow at 10 AM.', time: '2m ago', unread: true },
                   { title: 'Payment Successful', desc: 'Easypaisa payment of Rs. 1,500 was successful.', time: '1h ago', unread: true },
                   { title: 'Welcome to Qareeb!', desc: 'Start finding trusted help around your neighborhood.', time: '1d ago', unread: false }
                 ].map((notif, i) => (
                   <div key={i} onClick={() => { setShowNotifications(false); navigate('/user/bookings'); }} className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${notif.unread ? 'bg-orange-50/50 border-brand-orange/20' : 'bg-white border-gray-100'}`}>
                     <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold ${notif.unread ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</h4>
                        {notif.unread && <span className="w-2 h-2 rounded-full bg-brand-orange mt-1.5 shrink-0"></span>}
                     </div>
                     <p className="text-sm text-gray-500">{notif.desc}</p>
                     <p className="text-xs text-gray-400 mt-2 font-medium">{notif.time}</p>
                   </div>
                 ))}
              </div>
              <div className="p-4 border-t border-gray-100 bg-white">
                 <Button variant="outline" className="w-full text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5" onClick={() => setShowNotifications(false)}>Mark all as read</Button>
              </div>
           </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white text-gray-900 px-6 py-6 md:px-12 lg:px-24 rounded-b-[40px] md:rounded-b-[60px] relative overflow-hidden border-b border-gray-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=FF6B2C&color=fff`} className="w-full h-full object-cover" alt="Profile" />
             </div>
             <div>
               <p className="text-gray-500 text-sm font-medium">Welcome back,</p>
               <h1 className="text-xl md:text-2xl font-bold">{userName || 'Demo User'}</h1>
             </div>
           </div>
           <button onClick={() => setShowNotifications(true)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors relative text-gray-700">
             <Bell className="w-6 h-6" />
             <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-white"></span>
           </button>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 py-4 pb-8">
           <div className="flex-1 space-y-4 text-center md:text-left">
             <h2 className="text-3xl md:text-5xl font-extrabold leading-tight text-gray-900 drop-shadow-sm">
               Get trusted service, <br className="hidden md:block" />right when you need it.
             </h2>
             <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto md:mx-0 font-medium">
               Find verified local professionals for everyday tasks, track them live, and pay securely.
             </p>
             <div className="pt-2">
                <Button className="bg-brand-orange hover:bg-orange-500 text-white border-none shadow-lg px-8 py-6 text-lg rounded-2xl w-full md:w-auto" onClick={() => navigate('/user/post')}>
                  Find Help Now
                </Button>
             </div>
           </div>
           
           <div className="flex-1 w-[85%] max-w-[340px] md:max-w-[400px] mx-auto md:ml-auto md:mr-4 lg:mr-8 flex items-center justify-center">
             <div className="relative w-full aspect-square bg-[#EAF5F5] rounded-full shadow-2xl overflow-hidden border-[6px] border-white transition-all duration-500 ease-out hover:shadow-3xl hover:-translate-y-2">
               <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out hover:scale-105" alt="" />
             </div>
           </div>
        </div>
      </div>

      {/* Task Categories Grid */}
      <div className="px-6 md:px-12 lg:px-24 mt-12 mb-16">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Services</h2>
            <p className="text-gray-500 text-sm mt-1">What do you need help with?</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {SERVICE_CATEGORIES.map((cat) => (
            <div 
              key={cat.id}
              onClick={() => {
                localStorage.setItem('qareeb_selected_category', cat.id);
                navigate('/user/post');
              }}
              className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:border-brand-teal/30 hover:-translate-y-1 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-brand-teal flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-teal group-hover:text-white transition-all duration-300 shadow-sm">
                {getIcon(cat.iconName)}
              </div>
              <span className="font-bold text-gray-800 text-sm leading-tight">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Students & Women Empowerment Section */}
      <div className="px-6 md:px-12 lg:px-24 mb-16">
        <div className="bg-teal-50 border border-brand-teal/20 rounded-[40px] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 shadow-sm">
           <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/50 rounded-full blur-3xl pointer-events-none"></div>
           
           <div className="flex-1 relative z-10">
             <div className="inline-block px-4 py-1.5 bg-white/60 backdrop-blur-sm rounded-full text-xs font-bold text-brand-teal mb-4 border border-brand-teal/20">
               Empowering Communities
             </div>
             <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-5 drop-shadow-sm">
               Create Opportunities <br className="hidden lg:block"/> for Students & Women
             </h3>
             <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed max-w-lg font-medium">
               Qareeb is more than a service platform. We provide safe, flexible earning opportunities for local students, women, and skilled individuals in your community.
             </p>
             <Button className="h-12 px-8 rounded-xl text-base bg-brand-teal text-white hover:bg-teal-600 shadow-md transition-colors border-none" onClick={() => navigate('/user/become-helper')}>
               Become a Helper
             </Button>
           </div>
           
           <div className="flex-1 w-full relative h-[300px] md:h-[400px]">
             <div className="absolute right-4 top-0 w-2/3 h-2/3 rounded-3xl overflow-hidden shadow-2xl z-20 border-4 border-white transform rotate-3 hover:rotate-0 transition-transform duration-500">
               <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Woman Professional" />
             </div>
             <div className="absolute left-0 bottom-4 w-2/3 h-2/3 rounded-3xl overflow-hidden shadow-xl z-10 border-4 border-white transform -rotate-6 hover:rotate-0 transition-transform duration-500">
               <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Students learning" />
             </div>
           </div>
        </div>
      </div>

      {/* How Qareeb Works */}
      <div className="px-6 md:px-12 lg:px-24 mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How Qareeb Works</h2>
          <p className="text-gray-500 max-w-2xl mx-auto font-medium">Get trusted help in exactly four simple steps.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {[
            { num: '01', title: 'Choose a Service', desc: 'Find the service you need from our verified categories.' },
            { num: '02', title: 'Choose Your Helper', desc: 'View trusted helpers, profiles, ratings, and availability.' },
            { num: '03', title: 'Book & Track', desc: 'Confirm the request and track your helper’s arrival live.' },
            { num: '04', title: 'Complete & Review', desc: 'Complete the task, make secure payment, and leave feedback.' }
          ].map((step, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 border border-gray-100 relative hover:shadow-2xl hover:shadow-brand-teal/10 hover:-translate-y-3 hover:border-brand-teal/50 transition-all duration-500 ease-out group cursor-pointer overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <div className="h-32 -mx-8 -mt-8 mb-6 overflow-hidden relative">
                  <img src={['https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=400&auto=format&fit=crop', 'https://images.unsplash.com/photo-1555421689-d68471e189f2?q=80&w=400&auto=format&fit=crop', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=400&auto=format&fit=crop'][idx]} className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700 ease-out" alt={step.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
               </div>
               <div className="text-5xl font-extrabold text-gray-200 mb-2 group-hover:text-brand-teal/30 transform group-hover:scale-105 origin-left transition-all duration-500 ease-out drop-shadow-sm">{step.num}</div>
               <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10 transform group-hover:translate-x-1 transition-transform duration-500 ease-out">{step.title}</h3>
               <p className="text-gray-500 font-medium leading-relaxed relative z-10 transform group-hover:translate-x-1 transition-transform duration-500 ease-out delay-75">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}



export function PostTaskScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(localStorage.getItem('qareeb_selected_category') || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [location, setLocation] = useState('123 Main Street, Islamabad');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState('');

  const selectedService = SERVICE_CATEGORIES.find(s => s.id === category);

  useEffect(() => {
    if (selectedService && !budgetStr) {
      setBudgetStr(selectedService.baseRate.toString());
    }
    if (selectedService && !selectedService.femaleHelpersAvailable) {
      setFemaleOnly(false);
    }
  }, [selectedService, budgetStr]);

  const nextStep = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1 && !category) {
      newErrors.category = 'Please select a category first.';
    } else if (step === 1 && category) {
      localStorage.setItem('qareeb_selected_category', category);
    }
    if (step === 2) {
      if (!title.trim()) newErrors.title = 'Title is required.';
      if (!description.trim()) newErrors.description = 'Description is required.';
    }
    if (step === 4) {
      const budgetVal = parseInt(budgetStr) || 0;
      if (selectedService && budgetVal < selectedService.baseRate) {
        newErrors.budget = `Price cannot be lower than the service base rate of Rs. ${selectedService.baseRate}.`;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    if (step === 4) {
      localStorage.setItem('qareeb_demo_amount', budgetStr);
      localStorage.setItem('qareeb_female_only', femaleOnly ? 'true' : 'false');
      navigate('/user/select-helper');
    } else {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (step === 1) navigate(-1);
    else setStep(s => Math.max(1, s - 1));
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return "Choose a Service";
      case 2: return "Task Details";
      case 3: return "Service Location";
      case 4: return "Pricing & Preferences";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 md:px-8 py-4 flex items-center shadow-sm sticky top-0 z-40">
        <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2">
          <ArrowRight className="w-6 h-6 transform rotate-180 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getStepTitle()}</h1>
          <p className="text-xs text-gray-500 font-medium">Step {step} of 4</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 h-1">
        <div className="bg-brand-teal h-1 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }}></div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <SafetyShield />

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select the type of service you need</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICE_CATEGORIES.map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setErrors({});
                  }}
                  className={`border-2 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${category === cat.id ? 'border-brand-teal bg-teal-50 shadow-md -translate-y-1' : 'border-gray-200 bg-white hover:border-brand-teal/40 hover:-translate-y-1 hover:shadow-md'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${category === cat.id ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {getIcon(cat.iconName)}
                  </div>
                  <span className={`font-bold text-sm ${category === cat.id ? 'text-brand-teal' : 'text-gray-700'}`}>{cat.name}</span>
                </div>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-sm mt-2">{errors.category}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <Input 
               placeholder="Task Title (e.g., Fix leaking pipe)"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               error={errors.title}
             />
             <div className="relative">
               <textarea 
                 className={`w-full bg-white border ${errors.description ? 'border-red-500' : 'border-gray-200'} rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent min-h-[150px] resize-none shadow-sm pb-12`}
                 placeholder="Describe exactly what you need help with..."
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
               />
               <div className="absolute bottom-3 right-3 flex items-center gap-2">
                 <VoiceButton 
                   onTranscript={(text) => setDescription(prev => prev ? prev + ' ' + text : text)} 
                 />
               </div>
               {errors.description && <p className="text-red-500 text-xs mt-1 px-2">{errors.description}</p>}
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {!isEditingLocation ? (
              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm text-gray-500 font-medium mb-1">Service Location</h3>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-6 h-6 text-brand-orange shrink-0 mt-0.5" />
                      <p className="text-lg font-bold text-gray-900">{location}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setTempLocation(location);
                      setIsEditingLocation(true);
                    }}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors flex items-center gap-2 px-4"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm font-bold">Edit</span>
                  </button>
                </div>
                <div className="w-full h-48 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative">
                  <iframe 
                    src={location.toLowerCase().includes('karachi') ? "https://www.openstreetmap.org/export/embed.html?bbox=67.0%2C24.8%2C67.1%2C24.9&layer=mapnik&marker=24.86%2C67.0" : location.toLowerCase().includes('lahore') ? "https://www.openstreetmap.org/export/embed.html?bbox=74.3%2C31.5%2C74.4%2C31.6&layer=mapnik&marker=31.52%2C74.35" : "https://www.openstreetmap.org/export/embed.html?bbox=73.02%2C33.65%2C73.1%2C33.72&layer=mapnik&marker=33.6844%2C73.0479"} 
                    className="w-full h-full border-0 transition-all duration-500"
                    title="Service Location Map"
                  />
                  <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-gray-700 shadow-sm z-10 pointer-events-none">
                    Service Location
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm animate-in fade-in">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Location</h3>
                <Input 
                  placeholder="Enter complete address"
                  value={tempLocation}
                  onChange={(e) => setTempLocation(e.target.value)}
                  icon={<Search className="w-5 h-5 text-gray-400" />}
                />
                <div className="w-full h-48 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 mt-4 relative">
                  <iframe 
                    src="https://www.openstreetmap.org/export/embed.html?bbox=73.02%2C33.65%2C73.1%2C33.72&layer=mapnik&marker=33.6844%2C73.0479" 
                    className="w-full h-full border-0 pointer-events-none"
                    title="Map Preview"
                  />
                  <div className="absolute inset-0 bg-transparent cursor-crosshair" onClick={() => {
                     /* Simulated map click */
                     setTempLocation('Selected on Map, Islamabad');
                  }}></div>
                  <div className="absolute top-2 left-2 bg-white/90 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 shadow-sm z-10 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                    Tap map to select
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditingLocation(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={() => {
                    setLocation(tempLocation);
                    setIsEditingLocation(false);
                  }}>Confirm Location</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Set your price</h3>
              
              <div className="bg-orange-50 border border-brand-orange/20 p-4 rounded-xl mb-6">
                <p className="text-sm text-brand-orange font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> 
                  Base Rate: Rs. {selectedService?.baseRate}
                </p>
                <p className="text-xs text-orange-700/70 mt-1">
                  You cannot offer below the base rate for this service category.
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">Rs.</span>
                <input 
                  type="number" 
                  className={`w-full bg-gray-50 border ${errors.budget ? 'border-red-500' : 'border-gray-200'} rounded-2xl pl-14 pr-5 py-4 text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal`}
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value)}
                />
              </div>
              {errors.budget && <p className="text-red-500 text-sm mt-2">{errors.budget}</p>}
            </div>

            {selectedService?.femaleHelpersAvailable && (
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer" onClick={() => setFemaleOnly(!femaleOnly)}>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Request Female Helper</h3>
                  <p className="text-xs text-gray-500 mt-1">Available for {selectedService.name}</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${femaleOnly ? 'bg-brand-teal' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${femaleOnly ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 z-40">
        <div className="max-w-2xl mx-auto">
          <Button 
            className="w-full shadow-lg h-[54px] text-lg rounded-2xl" 
            onClick={nextStep}
            disabled={isEditingLocation}
          >
            {step === 4 ? 'Continue to Match' : 'Next Step'}
          </Button>
        </div>
      </div>
    </div>
  );
}



export function SelectHelperScreen() {
  const navigate = useNavigate();
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCNIC, setShowCNIC] = useState(false);
  const [cnicVerified, setCnicVerified] = useState(false);
  
  const category = localStorage.getItem('qareeb_selected_category') || '';
  const isFemaleOnly = localStorage.getItem('qareeb_female_only') === 'true';
  let helpers = DEMO_HELPERS.filter(h => 
    (!category || h.categories?.includes(category)) && 
    (!isFemaleOnly || h.female)
  );

  const handleConfirmBooking = () => {
    if (!cnicVerified) {
      setShowCNIC(true);
      return;
    }
    localStorage.setItem('qareeb_selected_helper', JSON.stringify(selectedHelper));
    navigate('/user/tracking');
  };

  if (showCNIC) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-40">
          <button onClick={() => setShowCNIC(false)} className="p-2 mr-2">
            <ArrowRight className="w-6 h-6 transform rotate-180 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">CNIC Verification Required</h1>
        </div>
        
        <div className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col pt-12">
          {!cnicVerified ? (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-brand-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-10 h-10 text-brand-teal" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your Identity</h2>
                <p className="text-gray-500 font-medium">Please verify your identity before confirming your booking to ensure safety for everyone.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm mb-8 text-center">
                <p className="text-sm font-bold text-gray-600 mb-4">Demo Verification Mode</p>
                <Button className="w-full mb-3" onClick={() => {
                  setCnicVerified(true);
                }}>
                  Simulate Verification Success
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center animate-in zoom-in duration-500 mt-12">
               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-12 h-12 text-green-600" />
               </div>
               <h2 className="text-3xl font-bold text-gray-900 mb-2">Verified!</h2>
               <p className="text-gray-500 font-medium mb-10">Your CNIC has been verified successfully.</p>
               <Button className="w-full h-[54px] rounded-2xl text-lg" onClick={() => {
                 setShowCNIC(false);
               }}>
                 Continue to Booking
               </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showProfile && selectedHelper) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="h-48 bg-gradient-to-br from-brand-teal to-teal-800 relative">
          <button onClick={() => setShowProfile(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors z-20">
            <ArrowRight className="w-6 h-6 transform rotate-180" />
          </button>
        </div>
        
        <div className="flex-1 px-4 md:px-8 pb-32 max-w-2xl mx-auto w-full -mt-16 relative z-10">
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 mb-6">
            <div className="flex flex-col items-center text-center -mt-20 mb-4">
              <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-lg overflow-hidden bg-gray-100 mb-4 relative">
                <img src={selectedHelper.photo} className="w-full h-full object-cover" alt={selectedHelper.name} />
                {selectedHelper.verified && (
                  <div className="absolute bottom-0 right-4 bg-white rounded-full p-0.5">
                    <CheckCircle2 className="w-6 h-6 text-brand-teal" />
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900">{selectedHelper.name}</h1>
              <p className="text-brand-teal font-bold text-sm flex items-center gap-1 justify-center mt-1">
                <ShieldCheck className="w-4 h-4" /> Verified Helper
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-gray-100 mb-6">
               <div className="text-center">
                 <div className="flex items-center justify-center gap-1 text-gray-900 font-bold text-xl mb-1">
                   <Star className="w-5 h-5 text-brand-orange fill-brand-orange" /> {selectedHelper.rating}
                 </div>
                 <p className="text-xs text-gray-500 font-medium">{selectedHelper.reviews} Reviews</p>
               </div>
               <div className="text-center border-l border-r border-gray-100">
                 <div className="text-gray-900 font-bold text-xl mb-1">{selectedHelper.completedTasks}</div>
                 <p className="text-xs text-gray-500 font-medium">Tasks Done</p>
               </div>
               <div className="text-center">
                 <div className="text-gray-900 font-bold text-xl mb-1">{selectedHelper.experience}</div>
                 <p className="text-xs text-gray-500 font-medium">Experience</p>
               </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Estimated Arrival</h3>
                  <p className="text-xs text-gray-600 font-medium mt-0.5">Arrives in approx. {selectedHelper.eta}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">{selectedHelper.distance} away</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-2">Skills & Expertise</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  {selectedHelper.skills}
                </p>
              </div>
              
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-2">About {selectedHelper.name.split(' ')[0]}</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                  {selectedHelper.bio}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <Button variant="outline" className="flex-1 h-[54px] rounded-2xl border-2" onClick={() => setShowProfile(false)}>Back</Button>
            <Button className="flex-[2] h-[54px] rounded-2xl text-lg shadow-lg bg-brand-orange hover:bg-orange-500 border-none" onClick={handleConfirmBooking}>
              Confirm Booking
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 hover:bg-gray-100 rounded-full">
          <ArrowRight className="w-6 h-6 transform rotate-180 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Choose Your Helper</h1>
          <p className="text-xs text-gray-500 font-medium">{helpers.length} helpers available nearby</p>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <SafetyShield />
        
        <div className="space-y-4">
          {helpers.length === 0 && (
            <div className="text-center py-12 px-4 bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No helpers available</h3>
              <p className="text-sm text-gray-500 font-medium mb-6">We couldn't find any helpers for this specific service right now.</p>
              <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
          )}
          {helpers.map(helper => (
            <div 
              key={helper.id} 
              className={`bg-white rounded-3xl p-5 border-2 transition-all cursor-pointer ${selectedHelper?.id === helper.id ? 'border-brand-teal shadow-md' : 'border-gray-100 hover:border-gray-200'}`}
              onClick={() => setSelectedHelper(helper)}
            >
              <div className="flex gap-4 items-start">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100">
                    <img src={helper.photo} alt={helper.name} className="w-full h-full object-cover" />
                  </div>
                  {helper.verified && (
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-0.5 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-brand-teal" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 text-lg">{helper.name}</h3>
                    <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
                      <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                      <span className="font-bold text-sm text-brand-orange">{helper.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1">{helper.completedTasks} tasks • {helper.experience} exp</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3"/> {helper.eta}</span>
                    <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><MapPin className="w-3 h-3"/> {helper.distance}</span>
                  </div>
                </div>
              </div>
              
              {selectedHelper?.id === helper.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                  <Button variant="outline" className="flex-1 text-sm border-gray-200" onClick={(e) => { e.stopPropagation(); setShowProfile(true); }}>
                    View Profile
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedHelper && !showProfile && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-12">
          <div className="max-w-2xl mx-auto">
            <Button className="w-full h-[54px] rounded-2xl text-lg shadow-lg bg-brand-orange hover:bg-orange-500 border-none" onClick={handleConfirmBooking}>
              Confirm & Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



export function TrackingScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'on_way' | 'arrived' | 'in_progress' | 'completed'>('on_way');
  const storedHelper = localStorage.getItem('qareeb_selected_helper');
  const selectedHelper = storedHelper ? JSON.parse(storedHelper) : DEMO_HELPERS[0];

  useEffect(() => {
    let timer1: any, timer2: any, timer3: any;
    if (status === 'on_way') {
      timer1 = setTimeout(() => setStatus('arrived'), 4000);
    } else if (status === 'arrived') {
      timer2 = setTimeout(() => setStatus('in_progress'), 3000);
    } else if (status === 'in_progress') {
      timer3 = setTimeout(() => setStatus('completed'), 5000);
    } else if (status === 'completed') {
      setTimeout(() => navigate('/user/payment'), 1500);
    }
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, [status, navigate]);

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this request?")) {
      navigate('/user');
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'on_way': return `${selectedHelper.name.split(' ')[0]} is on the way`;
      case 'arrived': return `${selectedHelper.name.split(' ')[0]} has arrived`;
      case 'in_progress': return 'Task in progress';
      case 'completed': return 'Task completed!';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-50">
        <button onClick={() => navigate('/user')} className="p-3 bg-white hover:bg-gray-50 shadow-md rounded-full text-gray-900 transition-colors">
          <ArrowRight className="w-5 h-5 transform rotate-180" />
        </button>
      </div>

      <div className="flex-1 relative w-full h-full bg-gray-200 overflow-hidden pointer-events-none">
        {status === 'on_way' ? (
          <iframe 
            src="https://www.openstreetmap.org/export/embed.html?bbox=73.01%2C33.64%2C73.11%2C33.73&layer=mapnik&marker=33.6844%2C73.0479" 
            className="w-full h-full border-0 absolute inset-0 transform scale-110 transition-all duration-1000"
            title="Tracking Map"
          />
        ) : (
          <iframe 
            src="https://www.openstreetmap.org/export/embed.html?bbox=73.04%2C33.67%2C73.06%2C33.69&layer=mapnik&marker=33.6844%2C73.0479" 
            className="w-full h-full border-0 absolute inset-0 transform scale-125 transition-all duration-1000"
            title="Tracking Map"
          />
        )}
        <div className="absolute inset-0 bg-brand-teal/5 mix-blend-multiply"></div>
        <div 
          className={`absolute w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center z-10 transition-all duration-1000 ease-in-out ${status === 'on_way' ? 'bg-blue-500 top-[30%] left-[30%] animate-pulse' : status === 'arrived' ? 'bg-brand-orange top-[50%] left-[50%] animate-bounce' : status === 'in_progress' ? 'bg-brand-teal top-[50%] left-[50%]' : 'bg-green-500 top-[50%] left-[50%]'}`}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {status === 'on_way' ? <Truck className="w-5 h-5 text-white" /> : <MapPin className="w-6 h-6 text-white" />}
        </div>
        
        {/* User Location Marker (Destination) */}
        {status === 'on_way' && (
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center bg-gray-900 z-0">
             <Home className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="bg-white rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.08)] relative z-20 px-6 pt-8 pb-10">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto absolute top-4 left-1/2 -translate-x-1/2"></div>
        
        <div className="flex items-center gap-4 mb-8">
           <div className="relative">
             <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
               <img src={selectedHelper.photo} className="w-full h-full object-cover" alt="Helper" />
             </div>
             <div className="absolute -bottom-2 -right-2 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm"></div>
           </div>
           <div className="flex-1">
             <h2 className="text-xl font-bold text-gray-900">{getStatusText()}</h2>
             {status === 'on_way' && <p className="text-brand-orange font-bold text-sm mt-1">Estimated arrival: 8 min</p>}
             {status === 'arrived' && <p className="text-brand-teal font-bold text-sm mt-1">Ready to start.</p>}
             {status === 'in_progress' && <p className="text-brand-orange font-bold text-sm mt-1">Working securely.</p>}
           </div>
           
           <div className="flex gap-2">
             <button className="w-12 h-12 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center hover:bg-brand-teal hover:text-white transition-colors">
               <Phone className="w-5 h-5" />
             </button>
           </div>
        </div>

        <SafetyShield />

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-gray-400 px-2">
             <span className={status !== 'on_way' ? 'text-brand-teal' : ''}>On way</span>
             <span className={status === 'arrived' || status === 'in_progress' || status === 'completed' ? 'text-brand-teal' : ''}>Arrived</span>
             <span className={status === 'in_progress' || status === 'completed' ? 'text-brand-teal' : ''}>Working</span>
             <span className={status === 'completed' ? 'text-brand-teal' : ''}>Done</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-brand-teal transition-all duration-1000" style={{ width: status === 'on_way' ? '25%' : status === 'arrived' ? '50%' : status === 'in_progress' ? '75%' : '100%' }}></div>
          </div>
        </div>

        {status === 'on_way' && (
          <div className="mt-8 flex gap-4">
            <Button variant="outline" className="flex-1 border-red-200 text-red-500 hover:bg-red-50" onClick={handleCancel}>Cancel Request</Button>
            <Button variant="outline" className="flex-1">Edit Request</Button>
          </div>
        )}
      </div>
    </div>
  );
}



export function PaymentRatingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const storedHelper = localStorage.getItem('qareeb_selected_helper');
  const selectedHelper = storedHelper ? JSON.parse(storedHelper) : DEMO_HELPERS[0];
  const [paymentMethod, setPaymentMethod] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const amountStr = localStorage.getItem('qareeb_demo_amount') || '0';
  const amount = parseInt(amountStr, 10);
  const isCashDisabled = amount > 1500;
  
  // Auto-select easypaisa if cash is disabled and nothing is selected
  useEffect(() => {
    if (isCashDisabled && (!paymentMethod || paymentMethod === 'cash')) {
      setPaymentMethod('easypaisa');
    }
  }, [isCashDisabled, paymentMethod]);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  

  const handleApplyPromo = () => {
    if (!promoCode) return;
    if (promoCode.toUpperCase() === 'QAREEB10') {
      setDiscount(amount * 0.1);
      setPromoApplied(true);
    } else {
      alert('Invalid promo code');
    }
  };

  const requiresDigital = amount > DIGITAL_PAYMENT_THRESHOLD;

  const handlePayment = () => {
    if (!paymentMethod) return;
    setStep(2);
    setTimeout(() => {
      setStep(3);
    }, 2000);
  };

  const handleRatingSubmit = () => {
    if (rating === 0) return;
    setStep(4);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-12">
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-40 mb-6">
        <h1 className="text-xl font-bold text-gray-900 mx-auto">
          {step === 1 ? 'Payment' : step === 3 ? 'Rate Helper' : step === 4 ? 'Thank You' : 'Processing'}
        </h1>
      </div>

      <div className="flex-1 px-4 md:px-8 max-w-lg mx-auto w-full flex flex-col justify-center">
        {step === 1 && (
          <div className="animate-in fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-sm text-center border border-gray-100 mb-6 relative overflow-hidden">
              <p className="text-sm text-gray-500 font-medium mb-2">Total Amount</p>
              <div className="flex items-center justify-center gap-3">
                {promoApplied && <span className="text-2xl font-bold text-gray-400 line-through">Rs. {amount.toLocaleString()}</span>}
                <h2 className="text-4xl font-extrabold text-gray-900">Rs. {(amount - discount).toLocaleString()}</h2>
              </div>
              
              <div className="mt-6 flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input 
                    placeholder="Promo Code (e.g. QAREEB10)" 
                    className="pl-10 bg-gray-50 border-gray-200 uppercase"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={promoApplied}
                  />
                </div>
                <Button 
                  variant={promoApplied ? 'secondary' : 'outline'} 
                  onClick={promoApplied ? () => { setPromoApplied(false); setDiscount(0); setPromoCode(''); } : handleApplyPromo}
                  className={promoApplied ? 'bg-green-100 text-green-700 border-transparent hover:bg-green-200' : ''}
                >
                  {promoApplied ? 'Applied' : 'Apply'}
                </Button>
              </div>
            </div>

            {requiresDigital && (
              <div className="bg-orange-50 border border-brand-orange/20 text-orange-700 p-4 rounded-xl mb-6 text-sm font-medium flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                Digital payment is required for bookings above Rs. {DIGITAL_PAYMENT_THRESHOLD}. Cash is unavailable.
              </div>
            )}

            <h3 className="font-bold text-gray-900 mb-4 px-2">Choose Payment Method</h3>
            
            <div className="space-y-3">
              <label className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-colors ${paymentMethod === 'easypaisa' ? 'border-brand-teal bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'easypaisa'} onChange={() => setPaymentMethod('easypaisa')} />
                <div className="flex-1 font-bold text-gray-900">Easypaisa</div>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Easypaisa_Digital_Bank_logo.png/500px-Easypaisa_Digital_Bank_logo.png" alt="Easypaisa" className="h-6 object-contain" />
              </label>

              <label className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-colors ${paymentMethod === 'jazzcash' ? 'border-brand-teal bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'jazzcash'} onChange={() => setPaymentMethod('jazzcash')} />
                <div className="flex-1 font-bold text-gray-900">JazzCash</div>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/JazzCash_logo_%282025%29.png/500px-JazzCash_logo_%282025%29.png" alt="JazzCash" className="h-6 object-contain" />
              </label>

              <label className={`flex items-center p-4 rounded-2xl border-2 transition-colors ${requiresDigital ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' : paymentMethod === 'cash' ? 'border-brand-teal bg-teal-50/50 cursor-pointer' : 'border-gray-200 bg-white cursor-pointer hover:border-gray-300'}`}>
                <input type="radio" name="payment" className="hidden" disabled={requiresDigital} checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                <div className="flex-1 font-bold text-gray-900">Cash</div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">💵</div>
              </label>
            </div>

            {(paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && (
               <div className="mt-6 p-5 border border-brand-teal/30 bg-teal-50/20 rounded-2xl animate-in slide-in-from-top-2">
                 <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">{paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} Wallet Details</h4>
                 <Input placeholder="Mobile Number (e.g., 03001234567)" className="bg-white" />
                 <p className="text-xs text-gray-500 mt-2">A prompt will be sent to your mobile wallet app for authorization.</p>
               </div>
            )}
            <Button className="w-full h-[54px] rounded-2xl text-lg mt-8" onClick={handlePayment} disabled={!paymentMethod}>
              {paymentMethod === 'cash' ? 'Confirm Cash Payment' : 'Pay & Confirm Booking'}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center animate-in zoom-in duration-300 flex flex-col items-center py-20">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-brand-teal rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-gray-900">Processing Payment...</h3>
            <p className="text-gray-500 mt-2">Please wait securely.</p>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in slide-in-from-bottom-8">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                <img src={selectedHelper.photo} className="w-full h-full object-cover" alt="Helper" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">How was your experience?</h2>
              <div className="bg-gray-50 inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 mt-2 border border-gray-100">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">Duration: 1h 45m</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">Rate {selectedHelper.name.split(' ')[0]}'s service quality</p>
              
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="focus:outline-none transform transition-transform hover:scale-110 active:scale-95">
                    <Star className={`w-10 h-10 ${star <= rating ? 'text-brand-orange fill-brand-orange' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>

              <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 mb-6 text-left">
                <h4 className="font-bold text-brand-teal text-sm mb-1">How your feedback makes a difference</h4>
                <p className="text-xs text-teal-800/80 leading-relaxed font-medium">Your feedback helps Qareeb maintain service quality, recognize great helpers, and help future users make better decisions.</p>
              </div>

              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal mb-6 min-h-[120px] resize-none"
                placeholder="Tell us more about your experience (optional)..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />

              <Button className="w-full h-[54px] rounded-2xl text-lg" onClick={handleRatingSubmit} disabled={rating === 0}>
                Submit Feedback
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center animate-in zoom-in duration-500 flex flex-col items-center py-20 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
             <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle2 className="w-12 h-12 text-green-600" />
             </div>
             <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Thank you for your feedback!</h2>
             <p className="text-gray-500 font-medium mb-10 max-w-sm leading-relaxed">Your rating has been recorded. It helps us keep the Qareeb community safe and high-quality.</p>
             <Button className="w-full h-[54px] rounded-2xl text-lg bg-gray-900 hover:bg-gray-800 text-white border-none" onClick={() => navigate('/user')}>
               Continue to Home
             </Button>
          </div>
        )}

      </div>
    </div>
  );
}

export function CategoriesScreen() { return <UserHome />; }
