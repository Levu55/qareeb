import { QareebLogo } from '../../components/ui/QareebLogo';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTranslation } from '../../locales/useTranslation';
import { useAppStore } from '../../store/useAppStore';
import { Phone, Lock, Star, Globe, Camera, Upload, CheckCircle2, User, Gift, Eye, EyeOff, ShieldCheck, ArrowRight, ChevronDown, Instagram, Youtube } from 'lucide-react';

const LogoHeader = () => (
  <div className="flex flex-col items-center lg:items-start justify-center py-4">
    <QareebLogo className="h-20 w-auto" />
  </div>
);

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showRoles, setShowRoles] = useState(false);
  const rolesRef = useRef<HTMLDivElement>(null);
  
  const handleSignUpClick = () => {
    setShowRoles(true);
    setTimeout(() => {
      rolesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden relative flex flex-col font-sans">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/30 to-slate-100/60 -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full md:w-[60%] h-[50%] md:h-[60%] bg-gradient-to-tl from-slate-900/5 to-transparent rounded-tl-[120px] -z-10 blur-3xl pointer-events-none" />

      {/* Header Logo Area */}
      <div className="w-full max-w-[1240px] mx-auto px-6 md:px-12 pt-8 flex-shrink-0 relative z-20">
        <LogoHeader />
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-[1240px] mx-auto px-6 md:px-12 py-12 lg:py-16 xl:py-20 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-12 lg:gap-[10%] relative z-10">
        
        {/* Left Column (45%) */}
        <div className="w-full lg:w-[45%] flex flex-col items-center lg:items-start text-center lg:text-left z-20">
          
          <h1 className="text-[36px] md:text-[42px] lg:text-[48px] xl:text-[54px] leading-[1.1] font-extrabold text-slate-900 tracking-tight mb-4 lg:mb-6 mt-2 lg:mt-4">
            Get trusted service, <br className="hidden md:block" />right when you need it.
          </h1>
          
          <Button 
            className="w-full sm:w-[240px] h-[50px] bg-brand-orange hover:bg-orange-500 text-white rounded-xl font-bold text-base shadow-md shadow-brand-orange/20 transition-all hover:-translate-y-0.5 mb-6 shrink-0" 
            onClick={handleSignUpClick}
          >
            {t('signup')}
          </Button>
          
          <p className="text-slate-500 font-medium text-base mb-4 lg:mb-12">
            Already have an account? <button onClick={() => navigate('/auth/login')} className="text-brand-teal font-bold hover:underline transition-colors">{t('login')}</button>
          </p>
          
          {/* Roles Selection (Shows on click) */}
          {showRoles && (
            <div ref={rolesRef} className="animate-in fade-in slide-in-from-bottom-8 duration-500 w-full max-w-md mx-auto lg:mx-0 pt-8 border-t border-gray-100 mt-4 lg:mt-0">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">How do you want to use Qareeb?</h2>
              <p className="text-base text-gray-500 mb-8">Choose your role to continue</p>
              
              <div className="space-y-4">
                <div 
                  className="border-2 border-brand-orange bg-orange-50/50 hover:bg-orange-50 transition-colors rounded-2xl p-6 cursor-pointer relative shadow-sm text-left group"
                  onClick={() => navigate('/auth/signup?role=user')}
                >
                  <div className="absolute top-6 right-6 w-5 h-5 rounded-full border-[5px] border-brand-orange bg-white group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-orange-100 text-brand-orange rounded-xl flex items-center justify-center mb-4">
                    <User className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">I need help</h3>
                  <p className="text-sm text-gray-500">Find verified local helpers for tasks</p>
                </div>
                
                <div 
                  className="border-2 border-brand-teal bg-teal-50/50 hover:bg-teal-50 transition-colors rounded-2xl p-6 cursor-pointer relative shadow-sm text-left group"
                  onClick={() => navigate('/auth/signup?role=helper')}
                >
                  <div className="absolute top-6 right-6 w-5 h-5 rounded-full border-[5px] border-brand-teal bg-white group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-teal-100 text-brand-teal rounded-xl flex items-center justify-center mb-4">
                    <Gift className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">I want to earn</h3>
                  <p className="text-sm text-gray-500">Offer your skills and earn money</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Column (45%) */}
        <div className="w-full lg:w-[45%] flex items-center justify-center relative z-10 mt-8 lg:mt-0 pb-12 lg:pb-0 px-4">
          <div className="relative w-[85%] max-w-[380px] md:max-w-[440px] aspect-square bg-brand-teal/5 rounded-full shadow-2xl overflow-hidden border-[6px] lg:border-[8px] border-white">
            <img 
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop" 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
export function LoginScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const login = useAppStore(state => state.login);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  
  const [authStep, setAuthStep] = useState<'credentials' | 'otp' | 'referral'>('credentials');
  const [otp, setOtp] = useState('');
  const [referral, setReferral] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; name?: string; otp?: string; referral?: string }>({});
  
  const isSignup = window.location.pathname.includes('signup');

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let hasError = false;

    if (isSignup && name.trim().length < 2) {
      setErrors(prev => ({ ...prev, name: 'Please enter your full name' }));
      hasError = true;
    }
    
    if (phone.length < 10) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number' }));
      hasError = true;
    }

    if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthStep('otp');
    }, 800);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (otp !== '123456') {
      setErrors({ otp: 'Invalid OTP. Please try again.' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (isSignup) {
        setAuthStep('referral');
      } else {
        finishLogin();
      }
    }, 800);
  };

  const handleReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (referral && referral !== 'QAREEB2026') {
      setErrors({ referral: 'Invalid referral code.' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      finishLogin();
    }, 800);
  };

  const finishLogin = () => {
    let finalName = name;
    if (!isSignup) {
      const stored = localStorage.getItem('qareeb_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.name && parsed.phone === phone) finalName = parsed.name;
        } catch(e) {}
      }
    }
    const userData = { phone, password, name: finalName || 'Demo User' };
    localStorage.setItem('qareeb_user', JSON.stringify(userData));
    login('user', userData.name);
    navigate('/user');
  };

  return (
    <div className="flex flex-col h-full bg-white px-6 pt-12 pb-6 w-full max-w-md mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-10">
        <QareebLogo className="h-12 w-auto -translate-x-2" />
      </div>

      {authStep === 'credentials' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{isSignup ? 'Create Your Account' : 'Welcome Back!'}</h1>
            <p className="text-gray-500 text-sm">{isSignup ? 'Sign up to get started with Qareeb' : 'Login to continue to your account'}</p>
          </div>
          
          <form onSubmit={handleCredentialsSubmit} className="flex-1 flex flex-col space-y-5">
            {isSignup && (
              <Input 
                placeholder="Full Name" 
                icon={<User className="w-5 h-5 text-gray-400" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
            )}
            
            <Input 
              placeholder="Mobile Number" 
              icon={<Phone className="w-5 h-5 text-gray-400" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />
            
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder="Password" 
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 focus:outline-none"
                style={{ marginTop: errors.password ? '-12px' : '0' }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {!isSignup && (
              <div className="flex justify-end">
                <button type="button" className="text-sm font-medium text-brand-teal">Forgot Password?</button>
              </div>
            )}

            {isSignup && (
              <>
                <div className="bg-brand-teal/10 rounded-xl p-3 flex items-start gap-3 mt-2">
                  <ShieldCheck className="w-5 h-5 text-brand-teal shrink-0" />
                  <p className="text-xs text-brand-teal font-medium leading-relaxed">We respect your privacy and<br/>keep your data safe.</p>
                </div>
                
                <div className="flex items-start gap-3 pt-2">
                   <input type="checkbox" id="terms" className="mt-0.5 w-4 h-4 text-brand-orange border-gray-300 rounded focus:ring-brand-orange" required />
                   <label htmlFor="terms" className="text-xs text-gray-600 leading-tight">
                     I agree to the <span className="text-brand-teal font-medium">Terms & Conditions</span><br/>and <span className="text-brand-teal font-medium">Privacy Policy</span>
                   </label>
                </div>
              </>
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
                {isSignup ? 'Verify & Continue' : 'Login'}
              </Button>
            </div>
            
            <div className="pt-8 text-center pb-8">
              {isSignup ? (
                <p className="text-sm text-gray-500">Already have an account? <button type="button" onClick={() => navigate('/auth/login')} className="text-brand-teal font-medium">Login</button></p>
              ) : (
                <p className="text-sm text-gray-500">Don't have an account? <button type="button" onClick={() => navigate('/auth/signup')} className="text-brand-teal font-medium">Sign Up</button></p>
              )}
            </div>
          </form>
        </div>
      )}

      {authStep === 'otp' && (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Phone</h1>
            <p className="text-gray-500 text-sm">We've sent a code to <span className="font-semibold text-gray-900">{phone}</span></p>
            <p className="text-xs text-brand-teal mt-2">Demo OTP: 123456</p>
          </div>
          <form onSubmit={handleOtpSubmit} className="flex flex-col space-y-6">
            <Input 
              placeholder="Enter 6-digit OTP" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={errors.otp}
              maxLength={6}
            />
            <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading || otp.length < 6}>
              Verify
            </Button>
            <button type="button" onClick={() => setAuthStep('credentials')} className="text-sm font-medium text-gray-500 hover:text-gray-900 pt-4">
              ← Back
            </button>
          </form>
        </div>
      )}

      {authStep === 'referral' && (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Have a Referral Code?</h1>
            <p className="text-gray-500 text-sm">Enter it below to get rewards, or skip if you don't have one.</p>
            <p className="text-xs text-brand-teal mt-2">Demo Referral: QAREEB2026</p>
          </div>
          <form onSubmit={handleReferralSubmit} className="flex flex-col space-y-6">
            <Input 
              placeholder="Referral Code (Optional)" 
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              error={errors.referral}
            />
            <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={finishLogin} disabled={isLoading}>
                Skip
              </Button>
              <Button type="submit" className="flex-1" isLoading={isLoading} disabled={isLoading}>
                Apply
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
export function CNICVerificationScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(4); // Success state
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white p-6">
      <div className="h-16 flex items-center mb-4">
         <button onClick={() => navigate(-1)} className="p-2 -ms-2">←</button>
         <h1 className="text-lg font-semibold mx-auto">CNIC Verification</h1>
         <div className="w-8" />
      </div>

      {step < 4 ? (
        <>
          {/* Progress */}
          <div className="flex space-x-2 space-x-reverse mb-8">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-brand-orange' : 'bg-gray-200'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-brand-orange' : 'bg-gray-200'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-brand-orange' : 'bg-gray-200'}`}></div>
          </div>

          <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300" key={step}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 1 ? 'Front of CNIC' : step === 2 ? 'Back of CNIC' : 'Take a Selfie'}
            </h2>
            <p className="text-gray-500 mb-8">
              {step === 3 
                ? 'Make sure your face is clearly visible and well lit.' 
                : 'Position your ID card within the frame. Ensure all text is readable.'}
            </p>

            <div className="w-full aspect-[4/3] bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center mb-6">
               {step === 3 ? (
                 <Camera className="w-12 h-12 text-gray-400 mb-4" />
               ) : (
                 <Upload className="w-12 h-12 text-gray-400 mb-4" />
               )}
               <span className="font-semibold text-gray-600">Tap to capture</span>
            </div>

            <div className="bg-brand-teal-light text-brand-teal p-4 rounded-2xl flex items-start text-sm">
               <CheckCircle2 className="w-5 h-5 me-2 flex-shrink-0 mt-0.5" />
               Your data is encrypted and securely stored for safety purposes only.
            </div>
          </div>

          <div className="pb-8 pt-4">
            <Button 
              className="w-full" 
              onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
              isLoading={isLoading}
            >
              {step === 3 ? 'Submit for Verification' : 'Next Step'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
           <div className="w-24 h-24 bg-brand-teal-light rounded-full flex items-center justify-center mb-6">
             <CheckCircle2 className="w-12 h-12 text-brand-teal" />
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Pending</h2>
           <p className="text-gray-500 mb-8 max-w-[250px]">Your documents have been submitted and are under review. This usually takes 5-10 minutes.</p>
           <Button className="w-full max-w-[200px]" onClick={() => navigate('/user')}>Return Home</Button>
        </div>
      )}
    </div>
  );
}
