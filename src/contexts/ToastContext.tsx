import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
interface ConfirmState { message: string; resolve: (v: boolean) => void; }

interface ToastApi {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used within ToastProvider');
  return c;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const confirm = useCallback(
    (message: string) => new Promise<boolean>(resolve => setConfirmState({ message, resolve })),
    [],
  );

  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => setToasts(x => x.filter(i => i.id !== t.id))}>
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="modal-overlay" onClick={() => closeConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <p style={{ marginTop: 0, fontSize: 15 }}>{confirmState.message}</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => closeConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => closeConfirm(true)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
