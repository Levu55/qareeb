import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useAppStore(state => state.toasts);
  const removeToast = useAppStore(state => state.removeToast);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

const ToastItem: React.FC<{ toast: any, onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-brand-teal" />
  };

  const bgs = {
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-teal-50 border-teal-200 text-teal-900'
  };

  return (
    <div className={`animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto flex items-center gap-3 py-3 px-4 rounded-2xl border shadow-lg w-full max-w-sm ${bgs[toast.type]}`}>
      {icons[toast.type]}
      <p className="text-sm font-bold flex-1">{toast.message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-black/5 rounded-full transition-colors">
        <X className="w-4 h-4 opacity-50" />
      </button>
    </div>
  );
}
