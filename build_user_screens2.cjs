const fs = require('fs');

const trackingScreen = `
export function TrackingScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'on_way' | 'arrived' | 'in_progress' | 'completed'>('on_way');

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
      case 'on_way': return 'Ayesha is on the way';
      case 'arrived': return 'Ayesha has arrived';
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

      <div className="flex-1 relative w-full h-full bg-gray-200">
        <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=33.6844,73.0479&zoom=14&size=800x800&maptype=roadmap&markers=color:orange%7C33.6844,73.0479&key=YOUR_API_KEY_HERE')] bg-cover bg-center opacity-80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-brand-teal/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-orange w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center animate-bounce z-10">
          <MapPin className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="bg-white rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.08)] relative z-20 px-6 pt-8 pb-10">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto absolute top-4 left-1/2 -translate-x-1/2"></div>
        
        <div className="flex items-center gap-4 mb-8">
           <div className="relative">
             <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm">
               <img src={DEMO_HELPERS[0].photo} className="w-full h-full object-cover" alt="Helper" />
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
`;

const paymentRatingScreen = `
export function PaymentRatingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Payment, 2 = Processing, 3 = Rating
  const [paymentMethod, setPaymentMethod] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  // Base rate demo
  const amount = parseInt(localStorage.getItem('qareeb_demo_amount') || '1600');
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
    // We do NOT navigate immediately. Wait for user to read or tap Continue.
    setStep(4); // 4 = Success manual continue screen
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
            <div className="bg-white p-8 rounded-3xl shadow-sm text-center border border-gray-100 mb-6">
              <p className="text-sm text-gray-500 font-medium mb-2">Total Amount</p>
              <h2 className="text-4xl font-extrabold text-gray-900">Rs. {amount.toLocaleString()}</h2>
            </div>

            {requiresDigital && (
              <div className="bg-orange-50 border border-brand-orange/20 text-orange-700 p-4 rounded-xl mb-6 text-sm font-medium flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                Digital payment is required for bookings above Rs. {DIGITAL_PAYMENT_THRESHOLD}. Cash is unavailable.
              </div>
            )}

            <h3 className="font-bold text-gray-900 mb-4 px-2">Choose Payment Method</h3>
            
            <div className="space-y-3">
              <label className={\`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-colors \${paymentMethod === 'easypaisa' ? 'border-brand-teal bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}\`}>
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'easypaisa'} onChange={() => setPaymentMethod('easypaisa')} />
                <div className="flex-1 font-bold text-gray-900">Easypaisa</div>
                {/* Simulated Easypaisa style */}
                <div className="text-[#00c853] font-black text-xl italic tracking-tighter">easypaisa</div>
              </label>

              <label className={\`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-colors \${paymentMethod === 'jazzcash' ? 'border-brand-teal bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}\`}>
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'jazzcash'} onChange={() => setPaymentMethod('jazzcash')} />
                <div className="flex-1 font-bold text-gray-900">JazzCash</div>
                {/* Simulated JazzCash style */}
                <div className="text-[#d2232a] font-black text-xl italic tracking-tighter">JazzCash</div>
              </label>

              <label className={\`flex items-center p-4 rounded-2xl border-2 transition-colors \${requiresDigital ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' : paymentMethod === 'cash' ? 'border-brand-teal bg-teal-50/50 cursor-pointer' : 'border-gray-200 bg-white cursor-pointer hover:border-gray-300'}\`}>
                <input type="radio" name="payment" className="hidden" disabled={requiresDigital} checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                <div className="flex-1 font-bold text-gray-900">Cash</div>
                <div className="text-gray-400"><Box className="w-6 h-6" /></div>
              </label>
            </div>

            <Button className="w-full h-[54px] rounded-2xl text-lg mt-8" onClick={handlePayment} disabled={!paymentMethod}>
              Confirm Payment
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
                <img src={DEMO_HELPERS[0].photo} className="w-full h-full object-cover" alt="Helper" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">How was your experience?</h2>
              <p className="text-gray-500 text-sm mb-6">Rate {DEMO_HELPERS[0].name.split(' ')[0]}'s service quality</p>
              
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="focus:outline-none transform transition-transform hover:scale-110 active:scale-95">
                    <Star className={\`w-10 h-10 \${star <= rating ? 'text-brand-orange fill-brand-orange' : 'text-gray-200'}\`} />
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
`;

global.trackingScreen = trackingScreen;
global.paymentRatingScreen = paymentRatingScreen;

const fullFile = `
${global.imports}
${global.userHome}
${global.postTaskScreen}
${global.selectHelperScreen}
${global.trackingScreen}
${global.paymentRatingScreen}
`;

fs.writeFileSync('src/features/user/UserScreens.tsx', fullFile);
