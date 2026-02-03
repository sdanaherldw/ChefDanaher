import { useAppState } from '../../context/AppContext';
import type { Toast as ToastType } from '../../types';

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useAppState();

  return (
    <div className={`toast ${toast.type}`}>
      <span>{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => removeToast(toast.id)}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useAppState();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
