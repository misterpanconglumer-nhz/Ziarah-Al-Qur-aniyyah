import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => {
        let bg = 'bg-slate-900 text-white';
        let icon = <Info className="w-4 h-4 text-sky-400" />;

        if (toast.type === 'success') {
          bg = 'bg-emerald-900/95 text-emerald-50 border border-emerald-700';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-900/95 text-amber-50 border border-amber-700';
          icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
        } else if (toast.type === 'error') {
          bg = 'bg-rose-900/95 text-rose-50 border border-rose-700';
          icon = <AlertOctagon className="w-4 h-4 text-rose-400" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs font-medium transition-all transform duration-300 animate-slide-in ${bg}`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-white/60 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
