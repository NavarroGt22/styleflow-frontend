import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

let toasts: ToastItem[] = [];
let listeners: Array<(items: ToastItem[]) => void> = [];
let nextId = 1;

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function showToast(message: string, type: ToastType = 'info', durationMs = 4500) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  window.setTimeout(() => dismiss(id), durationMs);
}

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white border-emerald-500',
  error: 'bg-red-600 text-white border-red-500',
  info: 'bg-slate-800 text-white border-slate-600',
};

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
      {items.map((item) => {
        const Icon = icons[item.type];
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300 ${styles[item.type]}`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 opacity-80 hover:opacity-100"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
