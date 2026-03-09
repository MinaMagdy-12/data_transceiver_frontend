import { useCallback, useRef, useState } from 'react';
import { sendPayload, sendMessage } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

const MAX_CHARS = 1024;

export default function PayloadDeck() {
    const [tab, setTab] = useState('message'); // 'message' | 'file'

    return (
        <div className="glass-card flex flex-col h-full" style={{ overflow: 'hidden' }}>
            {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
            }}>
                <TabBtn label="Message" icon={<MsgIcon />} active={tab === 'message'} color="#a855f7" onClick={() => setTab('message')} />
                <TabBtn label="File" icon={<FileIcon />} active={tab === 'file'} color="#3b82f6" onClick={() => setTab('file')} />
            </div>

            {/* ── Panels ────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {tab === 'message' ? <MessagePanel /> : <FilePanel />}
            </div>
        </div>
    );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ label, icon, active, color, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '13px 0',
                background: active ? `${color}12` : 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                color: active ? color : 'var(--text-muted)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.18s',
            }}
        >
            {icon}
            {label}
        </button>
    );
}

// ─── Message Panel ─────────────────────────────────────────────────────────────
function MessagePanel() {
    const { addLog, txAdd, txUpdate } = useDevice();
    const { addToast } = useToast();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

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
            ref.current?.focus();
        }
    }, [canSend, text, addLog, addToast, txAdd, txUpdate]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
            {/* Textarea */}
            <div style={{ position: 'relative', flex: 1 }}>
                <textarea
                    ref={ref}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                    placeholder={"Type a message to transmit over the RF link…\nCtrl+Enter to send"}
                    disabled={loading}
                    style={{
                        width: '100%', height: '100%', minHeight: '120px',
                        resize: 'none',
                        background: overLimit ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${overLimit ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '10px', padding: '12px 14px 28px',
                        color: 'var(--text-primary)',
                        fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', lineHeight: '1.6',
                        outline: 'none',
                        boxShadow: overLimit ? '0 0 0 3px rgba(239,68,68,0.15)' : text.length > 0 ? '0 0 0 3px rgba(168,85,247,0.12)' : 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                />
                <span style={{
                    position: 'absolute', bottom: '10px', right: '12px',
                    fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none',
                    color: overLimit ? '#ef4444' : charCount > MAX_CHARS * 0.8 ? '#f59e0b' : 'var(--text-muted)',
                }}>
                    {charCount}/{MAX_CHARS}
                </span>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UTF-8 payload · Ctrl+Enter</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    {text.length > 0 && !loading && (
                        <button onClick={() => setText('')} style={{
                            fontSize: '12px', padding: '8px 14px',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer',
                        }}>Clear</button>
                    )}
                    <button onClick={handleSend} disabled={!canSend} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '8px 20px',
                        background: canSend ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 8,
                        color: canSend ? '#fff' : 'var(--text-muted)',
                        fontSize: '13px', fontWeight: 600, cursor: canSend ? 'pointer' : 'not-allowed',
                        boxShadow: canSend ? '0 4px 14px rgba(168,85,247,0.35)' : 'none',
                        transition: 'all 0.2s',
                    }}>
                        {loading
                            ? <><Spinner />&nbsp;Sending…</>
                            : <><SendIcon /> Transmit</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── File Panel ────────────────────────────────────────────────────────────────
function FilePanel() {
    const { addLog, txAdd, txUpdate } = useDevice();
    const { addToast } = useToast();
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastFile, setLastFile] = useState(null);
    const inputRef = useRef(null);

    const transmit = useCallback(async (file) => {
        if (!file) return;
        setLastFile(file);
        setLoading(true);
        const queueId = txAdd(file.name, file.size);
        addLog(`Transmitting "${file.name}" (${fmt(file.size)})…`);
        setTimeout(() => txUpdate(queueId, 'transmitting'), 200);
        try {
            const res = await sendPayload(file);
            txUpdate(queueId, 'done', res.data?.ack);
            addToast(res.data?.message ?? 'File transmitted', 'success');
            addLog(`✓ Transmission complete: "${file.name}"`);
        } catch (err) {
            txUpdate(queueId, 'error');
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            addToast(`Transmission failed: ${msg}`, 'error');
            addLog(`✗ Transmission error: ${msg}`);
        } finally {
            setLoading(false);
        }
    }, [addLog, addToast, txAdd, txUpdate]);

    const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };
    const onDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) transmit(f); };
    const onInput = (e) => { const f = e.target.files?.[0]; if (f) transmit(f); e.target.value = ''; };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div
                role="button" tabIndex={0}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => !loading && inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
                style={{
                    flex: 1,
                    border: `2px dashed ${dragging ? '#3b82f6' : loading ? '#22c55e' : 'var(--border)'}`,
                    borderRadius: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: dragging ? 'rgba(59,130,246,0.06)' : loading ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.2s, background 0.2s',
                    position: 'relative', overflow: 'hidden',
                }}
            >
                {loading ? (
                    <>
                        <div className="animate-spin-custom" style={{
                            width: 44, height: 44, borderRadius: '50%',
                            border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e',
                        }} />
                        <p style={{ fontSize: 14, color: '#22c55e', fontWeight: 500 }}>Transmitting…</p>
                        {lastFile && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{lastFile.name}</p>}
                    </>
                ) : (
                    <>
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: dragging ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${dragging ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                        }}>
                            <UploadIcon color={dragging ? '#3b82f6' : '#94a3b8'} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: dragging ? '#3b82f6' : 'var(--text-primary)' }}>
                                {dragging ? 'Release to transmit' : 'Drop payload here'}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>or click to browse</p>
                        </div>
                        {lastFile && (
                            <div style={{
                                position: 'absolute', bottom: 10,
                                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                                borderRadius: 6, padding: '4px 10px',
                                fontSize: 11, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace',
                            }}>
                                Last: {lastFile.name} ({fmt(lastFile.size)})
                            </div>
                        )}
                    </>
                )}
            </div>
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={onInput} />
        </div>
    );
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
function fmt(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}

function Spinner() {
    return <span className="animate-spin-custom" style={{
        width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
    }} />;
}

function SendIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    );
}
function UploadIcon({ color }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}
function MsgIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}
function FileIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
        </svg>
    );
}
