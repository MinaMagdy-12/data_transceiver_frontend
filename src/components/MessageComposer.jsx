import { useRef, useState, useCallback } from 'react';
import { sendMessage } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

const MAX_CHARS = 1024;

export default function MessageComposer() {
    const { addLog, txAdd, txUpdate } = useDevice();
    const { addToast } = useToast();

    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef(null);

    const charCount = text.length;
    const overLimit = charCount > MAX_CHARS;
    const canSend = text.trim().length > 0 && !overLimit && !loading;

    const handleSend = useCallback(async () => {
        if (!canSend) return;
        const payload = text.trim();
        setLoading(true);

        const bytes = new Blob([payload]).size;
        const queueId = txAdd(`"${payload.slice(0, 28)}${payload.length > 28 ? '…' : ''}"`, bytes);
        addLog(`Sending message (${bytes} B)…`);
        setTimeout(() => txUpdate(queueId, 'transmitting'), 150);

        try {
            const res = await sendMessage(payload);
            txUpdate(queueId, 'done', res.data?.ack);
            addToast(res.data?.message ?? 'Message sent', 'success');
            addLog(`✓ Message delivered (${bytes} B)`);
            setText('');
        } catch (err) {
            txUpdate(queueId, 'error');
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            addToast(`Message failed: ${msg}`, 'error');
            addLog(`✗ Message error: ${msg}`);
        } finally {
            setLoading(false);
            textareaRef.current?.focus();
        }
    }, [canSend, text, addLog, addToast, txAdd, txUpdate]);

    // Ctrl+Enter or Cmd+Enter to send
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'rgba(168,85,247,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                    Message Composer
                </h2>
            </div>

            {/* Textarea */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message to transmit over the RF link…&#10;Ctrl+Enter to send"
                        disabled={loading}
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: '120px',
                            resize: 'none',
                            background: overLimit ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${overLimit ? '#ef4444' : 'var(--border)'}`,
                            borderRadius: '10px',
                            padding: '12px 14px',
                            color: 'var(--text-primary)',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxShadow: overLimit
                                ? '0 0 0 3px rgba(239,68,68,0.15)'
                                : text.length > 0 ? '0 0 0 3px rgba(168,85,247,0.12)' : 'none',
                        }}
                        onFocus={(e) => {
                            if (!overLimit) e.target.style.borderColor = '#a855f7';
                        }}
                        onBlur={(e) => {
                            if (!overLimit) e.target.style.borderColor = 'var(--border)';
                        }}
                    />
                    {/* Character count badge */}
                    <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '12px',
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: overLimit ? '#ef4444' : charCount > MAX_CHARS * 0.8 ? '#f59e0b' : 'var(--text-muted)',
                        pointerEvents: 'none',
                    }}>
                        {charCount}/{MAX_CHARS}
                    </span>
                </div>

                {/* Footer row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Sent as UTF-8 payload &middot; Ctrl+Enter
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {text.length > 0 && !loading && (
                            <button
                                onClick={() => setText('')}
                                style={{
                                    fontSize: '12px', padding: '8px 14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--border)', borderRadius: '8px',
                                    color: 'var(--text-secondary)', cursor: 'pointer',
                                }}
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={handleSend}
                            disabled={!canSend}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '8px 20px',
                                background: canSend
                                    ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                                    : 'rgba(255,255,255,0.06)',
                                border: 'none',
                                borderRadius: '8px',
                                color: canSend ? '#fff' : 'var(--text-muted)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: canSend ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                boxShadow: canSend ? '0 4px 14px rgba(168,85,247,0.35)' : 'none',
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin-custom" style={{
                                        width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                                    }} />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    Transmit
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
