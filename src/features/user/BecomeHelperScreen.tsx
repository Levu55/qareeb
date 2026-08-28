import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, CheckCircle2, ShieldCheck, Upload } from 'lucide-react';

export function BecomeHelperScreen() {
  const navigate = useNavigate();
  const { registerAsHelper, userName } = useAppStore();
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      // Simulate backend processing, then convert to helper role.
      registerAsHelper(selectedServices);
      navigate('/helper');
    }, 1500);
  };

  if (isSubmitting) {
    return (
      <div className="flex-1 bg-brand-teal flex flex-col items-center justify-center p-6 h-full absolute inset-0 z-50">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
          <div className="absolute inset-2 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute inset-4 bg-white text-brand-teal rounded-full flex items-center justify-center shadow-xl z-10 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Setting up your profile...</h2>
        <p className="text-teal-50 text-center max-w-xs">Activating Helper mode so you can start earning.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-y-auto pb-24 absolute inset-0 z-50">
      <div className="bg-white px-4 pt-12 pb-4 md:px-8 border-b flex items-center gap-4 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Become a Helper</h2>
      </div>

      <div className="p-6 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-brand-orange' : 'bg-gray-200'}`}></div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h3>
              <p className="text-gray-500 mb-6 text-sm">Tell us about yourself to get verified.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name (as per CNIC)</label>
                  <Input defaultValue={userName || 'Waleed Ahmed'} required className="bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">CNIC Number</label>
                  <Input placeholder="37405-XXXXXXX-X" required className="bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                  <Input type="date" required className="bg-gray-50" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Skills & Services</h3>
              <p className="text-gray-500 mb-6 text-sm">What kind of tasks can you help with?</p>
              
              <div className="space-y-3">
                 {['Home & Cleaning', 'Errands & Delivery', 'Moving & Lifting', 'Repairs & Technical', 'Digital & Admin', 'Event Help'].map((skill, idx) => (
                   <label key={idx} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${selectedServices.includes(skill) ? 'border-brand-teal bg-teal-50/50' : 'border-gray-100 hover:border-brand-teal/30'}`}>
                     <input 
                       type="checkbox" 
                       className="w-5 h-5 text-brand-teal rounded focus:ring-brand-teal border-gray-300"
                       checked={selectedServices.includes(skill)} 
                       onChange={(e) => {
                         if (e.target.checked) setSelectedServices([...selectedServices, skill]);
                         else setSelectedServices(selectedServices.filter(s => s !== skill));
                       }} 
                     />
                     <span className="font-bold text-gray-700">{skill}</span>
                   </label>
                 ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h3>
              <p className="text-gray-500 mb-6 text-sm">Upload a photo of your CNIC for safety and trust.</p>
              
              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="w-14 h-14 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-gray-700">Upload CNIC Front</p>
                  <p className="text-xs text-gray-400 mt-1">Tap to browse or take a photo</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                  <ShieldCheck className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Secure Verification</h4>
                    <p className="text-xs text-blue-700 mt-1">Your ID is encrypted and never shared publicly. It is only used to verify your identity on Qareeb.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-14 text-lg font-bold shadow-md shadow-brand-orange/20 mt-8">
            {step < 3 ? 'Continue' : 'Submit Application'}
          </Button>
        </form>
      </div>
    </div>
  );
}
