const fs = require('fs');

const imports = `
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTranslation } from '../../locales/useTranslation';
import { useAppStore } from '../../store/useAppStore';
import heroImg from '../../assets/images/qareeb_hero_adnan_1786958738930.jpg';
import { Wrench, Calendar, Camera, Box, Lock, Zap, Droplets, Paintbrush, Truck, MapPin, Search, Star, Clock, ArrowRight, ShieldCheck, Phone, CheckCircle2, Menu, Bell, Home, PlayCircle, ClipboardList, CheckCircle, FileText, User, ShoppingBag, Heart, Tent, Scissors, Plus, ChevronRight, BookOpen, MonitorSmartphone, UserRoundCheck, Edit2 } from 'lucide-react';
import { SERVICE_CATEGORIES, DEMO_HELPERS, DIGITAL_PAYMENT_THRESHOLD } from '../../config/businessLogic';

const SafetyShield = () => (
  <div className="bg-brand-teal-light text-brand-teal p-3 rounded-xl flex items-start text-sm mb-6 font-medium">
    <ShieldCheck className="w-5 h-5 me-2 shrink-0 mt-0.5" />
    <span>Qareeb Safety — Your safety comes first. Verified helpers and secure tracking.</span>
  </div>
);

const getIcon = (name: string) => {
  const icons: any = { BookOpen, Scissors, Sparkles: SparklesIcon, Droplets, Zap, Wrench, MonitorSmartphone, ShoppingBag, Heart, UserRoundCheck, Box, Paintbrush };
  const Icon = icons[name] || Box;
  return <Icon className="w-8 h-8 md:w-10 md:h-10" />;
};
// Quick mock for Sparkles since it's not imported directly from lucide-react in the old code, wait, let me just use Stars.
const SparklesIcon = (props: any) => <Star {...props} />;
`;

const userHome = `
export function UserHome() {
  const navigate = useNavigate();
  const user = useAppStore(state => state.user);
  const tasks = useAppStore(state => state.tasks);

  return (
    <div className="pb-24 bg-white min-h-screen font-sans overflow-x-hidden">
      {/* Header */}
      <div className="bg-brand-teal text-white px-6 py-6 md:px-12 lg:px-24 rounded-b-[40px] md:rounded-b-[60px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-xl border border-white/30">
               {user?.name?.charAt(0) || 'U'}
             </div>
             <div>
               <p className="text-teal-100 text-sm font-medium">Welcome back,</p>
               <h1 className="text-xl md:text-2xl font-bold">{user?.name || 'User'}</h1>
             </div>
           </div>
           <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors relative">
             <Bell className="w-6 h-6" />
             <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-brand-teal"></span>
           </button>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 py-4 pb-8">
           <div className="flex-1 space-y-4 text-center md:text-left">
             <div className="inline-flex items-center bg-white/10 px-3 py-1 rounded-full text-sm font-medium text-teal-50 border border-white/20">
               ✨ Help is always near.
             </div>
             <h2 className="text-3xl md:text-5xl font-extrabold leading-tight text-white drop-shadow-md">
               Get trusted help, <br className="hidden md:block" />right when you need it.
             </h2>
             <p className="text-teal-50 text-base md:text-lg max-w-md mx-auto md:mx-0">
               Find verified local professionals for everyday tasks, track them live, and pay securely.
             </p>
             <div className="pt-2">
                <Button className="bg-brand-orange hover:bg-orange-500 text-white border-none shadow-lg px-8 py-6 text-lg rounded-2xl w-full md:w-auto" onClick={() => navigate('/user/post')}>
                  Book a Service Now
                </Button>
             </div>
           </div>
           
           <div className="flex-1 w-full max-w-md mx-auto md:mx-0">
             <div className="relative w-full aspect-[4/5] bg-white rounded-[32px] shadow-2xl overflow-hidden border-[6px] border-white transition-all duration-500 ease-out group-hover:shadow-2xl group-hover:-translate-y-2">
               <img src={heroImg} className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105" alt="Qareeb Helper" />
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
        <div className="bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 border border-brand-orange/20 rounded-[40px] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
           <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none"></div>
           
           <div className="flex-1 relative z-10">
             <div className="inline-block px-4 py-1.5 bg-white rounded-full text-xs font-bold text-brand-orange mb-4 shadow-sm border border-orange-100">
               Empowering Communities
             </div>
             <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-5">
               Create Opportunities <br className="hidden lg:block"/> for Students & Women
             </h3>
             <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed max-w-lg font-medium">
               Qareeb is more than a service platform. We provide safe, flexible earning opportunities for local students, women, and skilled individuals in your community.
             </p>
             <Button variant="outline" className="h-12 px-8 rounded-xl text-base border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-colors" onClick={() => navigate('/helper')}>
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
            <div key={idx} className="bg-gray-50 rounded-3xl p-8 border border-gray-100 relative hover:shadow-lg hover:-translate-y-1 transition-all group">
               <div className="text-5xl font-extrabold text-gray-200 mb-6 group-hover:text-brand-teal/20 transition-colors">{step.num}</div>
               <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
               <p className="text-gray-500 font-medium leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
`;

const postTaskScreen = `
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

  // Initialize budget when category selected
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
    }
    if (step === 2) {
      if (!title.trim()) newErrors.title = 'Title is required.';
      if (!description.trim()) newErrors.description = 'Description is required.';
    }
    if (step === 4) {
      const budgetVal = parseInt(budgetStr) || 0;
      if (selectedService && budgetVal < selectedService.baseRate) {
        newErrors.budget = \`Price cannot be lower than the service base rate of Rs. \${selectedService.baseRate}.\`;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    if (step === 4) {
      // Proceed to helper selection instead of submitting immediately
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
      {/* Header */}
      <div className="bg-white px-4 md:px-8 py-4 flex items-center shadow-sm sticky top-0 z-40">
        <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2">
          <ArrowRight className="w-6 h-6 transform rotate-180 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getStepTitle()}</h1>
          <p className="text-xs text-gray-500 font-medium">Step {step} of 4</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1">
        <div className="bg-brand-teal h-1 transition-all duration-300" style={{ width: \`\${(step / 4) * 100}%\` }}></div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <SafetyShield />

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select the type of service you need</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SERVICE_CATEGORIES.map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setErrors({});
                  }}
                  className={\`border-2 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer transition-all \${category === cat.id ? 'border-brand-teal bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}\`}
                >
                  <div className={\`w-12 h-12 rounded-xl flex items-center justify-center mb-3 \${category === cat.id ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-500'}\`}>
                    {getIcon(cat.iconName)}
                  </div>
                  <span className={\`font-bold text-sm \${category === cat.id ? 'text-brand-teal' : 'text-gray-700'}\`}>{cat.name}</span>
                </div>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-sm mt-2">{errors.category}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
             <Input 
               placeholder="Task Title (e.g., Fix leaking pipe)"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               error={errors.title}
             />
             <div>
               <textarea 
                 className={\`w-full bg-white border \${errors.description ? 'border-red-500' : 'border-gray-200'} rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent min-h-[150px] resize-none shadow-sm\`}
                 placeholder="Describe exactly what you need help with..."
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
               />
               {errors.description && <p className="text-red-500 text-xs mt-1 px-2">{errors.description}</p>}
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
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
                <div className="w-full h-48 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-200">
                  <img src="https://maps.googleapis.com/maps/api/staticmap?center=33.6844,73.0479&zoom=13&size=600x300&maptype=roadmap&markers=color:orange%7C33.6844,73.0479&key=YOUR_API_KEY_HERE" alt="Map Preview" className="w-full h-full object-cover opacity-50 blur-[2px]" />
                  <div className="absolute font-bold text-gray-600 bg-white/80 px-4 py-2 rounded-lg">Demo Map View</div>
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
          <div className="space-y-8">
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
                  className={\`w-full bg-gray-50 border \${errors.budget ? 'border-red-500' : 'border-gray-200'} rounded-2xl pl-14 pr-5 py-4 text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-teal\`}
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
                <div className={\`w-12 h-6 rounded-full transition-colors flex items-center px-1 \${femaleOnly ? 'bg-brand-teal' : 'bg-gray-300'}\`}>
                  <div className={\`w-4 h-4 bg-white rounded-full transition-transform shadow-sm \${femaleOnly ? 'transform translate-x-6' : ''}\`}></div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Bottom Action Bar */}
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
`;

const selectHelperScreen = `
export function SelectHelperScreen() {
  const navigate = useNavigate();
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCNIC, setShowCNIC] = useState(false);
  const [cnicStep, setCnicStep] = useState(1);
  const [cnicVerified, setCnicVerified] = useState(false);
  
  // Filter helpers based on requirements
  const helpers = DEMO_HELPERS;

  const handleConfirmBooking = () => {
    if (!cnicVerified) {
      setShowCNIC(true);
      return;
    }
    // Proceed to tracking/payment
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
        {/* Profile Header Image / Cover */}
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

        {/* Action Bottom Bar */}
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
          {helpers.map(helper => (
            <div 
              key={helper.id} 
              className={\`bg-white rounded-3xl p-5 border-2 transition-all cursor-pointer \${selectedHelper?.id === helper.id ? 'border-brand-teal shadow-md' : 'border-gray-100 hover:border-gray-200'}\`}
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
`;

fs.writeFileSync('build_user_screens1.js', 'console.log("part 1");\nmodule.exports = { imports, userHome, postTaskScreen, selectHelperScreen };');

// Re-export variables to global so they can be read
global.imports = imports;
global.userHome = userHome;
global.postTaskScreen = postTaskScreen;
global.selectHelperScreen = selectHelperScreen;
