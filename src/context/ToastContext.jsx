import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let _nextId = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = _nextId++;
        setToasts((prev) => [...prev, { id, message, type, dying: false }]);

        // Start fade-out slightly before removal
        setTimeout(() => {
            setToasts((prev) =>
                prev.map((t) => (t.id === id ? { ...t, dying: true } : t))
            );
        }, duration - 400);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}

// ─── Toast Container (rendered at root level) ─────────────────────────────────
function ToastContainer({ toasts }) {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 9999,
                pointerEvents: 'none',
            }}
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} />
            ))}
        </div>
    );
}

const TOAST_STYLES = {
    success: {
        border: '1px solid rgba(34,197,94,0.4)',
        background: 'linear-gradient(135deg, rgba(17,24,39,0.97), rgba(5,46,22,0.6))',
        iconColor: '#22c55e',
        icon: '✓',
    },
    error: {
        border: '1px solid rgba(239,68,68,0.4)',
        background: 'linear-gradient(135deg, rgba(17,24,39,0.97), rgba(69,10,10,0.6))',
        iconColor: '#ef4444',
        icon: '✗',
    },
    info: {
        border: '1px solid rgba(59,130,246,0.4)',
        background: 'linear-gradient(135deg, rgba(17,24,39,0.97), rgba(23,37,84,0.6))',
        iconColor: '#3b82f6',
        icon: 'ℹ',
    },
    warning: {
        border: '1px solid rgba(245,158,11,0.4)',
        background: 'linear-gradient(135deg, rgba(17,24,39,0.97), rgba(67,20,7,0.6))',
        iconColor: '#f59e0b',
        icon: '⚠',
    },
};

function ToastItem({ toast }) {
    const s = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

    return (
        <div
            className={toast.dying ? 'animate-fade-out' : 'animate-slide-in'}
            style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '12px',
                border: s.border,
                background: s.background,
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                maxWidth: '360px',
                minWidth: '260px',
            }}
        >
            <span
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: `${s.iconColor}22`,
                    color: s.iconColor,
                    fontWeight: 700,
                    fontSize: '12px',
                    flexShrink: 0,
                    marginTop: '1px',
                }}
            >
                {s.icon}
            </span>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#e2e8f0', margin: 0 }}>
                {toast.message}
            </p>
        </div>
    );
}
