import { useCallback, useRef, useState } from 'react';
import { sendPayload } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

export default function TransmissionDeck() {
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

        // Add to TX queue as 'pending', capture the queue ID
        const queueId = txAdd(file.name, file.size);
        addLog(`Transmitting "${file.name}" (${formatBytes(file.size)})…`);

        // Brief delay so the pending state is visible before switching to transmitting
        setTimeout(() => txUpdate(queueId, 'transmitting'), 200);

        try {
            const res = await sendPayload(file);
            txUpdate(queueId, 'done', res.data?.ack);
            addToast(res.data?.message ?? 'File transmitted successfully', 'success');
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
    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) transmit(file);
    };
    const onFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) transmit(file);
        e.target.value = '';
    };

    return (
        <div className="glass-card p-6 flex flex-col gap-5 h-full">
            <div>
                <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                    Transmission Deck
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Drag & drop or click to select a payload file
                </p>
            </div>

            {/* Drop zone */}
            <div
                role="button"
                tabIndex={0}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !loading && inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
                style={{
                    flex: 1,
                    minHeight: '160px',
                    border: `2px dashed ${dragging ? '#3b82f6' : loading ? '#22c55e' : 'var(--border)'}`,
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    background: dragging ? 'rgba(59,130,246,0.06)' : loading ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {loading ? (
                    <>
                        <div className="animate-spin-custom" style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e',
                        }} />
                        <p style={{ fontSize: '14px', color: '#22c55e', fontWeight: 500 }}>Transmitting…</p>
                        {lastFile && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {lastFile.name}
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '14px',
                            background: dragging ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${dragging ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                stroke={dragging ? '#3b82f6' : '#94a3b8'} strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p style={{ fontSize: '14px', fontWeight: 500, color: dragging ? '#3b82f6' : 'var(--text-primary)' }}>
                                {dragging ? 'Release to transmit' : 'Drop payload here'}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>or click to browse</p>
                        </div>
                        {lastFile && (
                            <div style={{
                                position: 'absolute', bottom: '10px',
                                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                                borderRadius: '6px', padding: '4px 10px',
                                fontSize: '11px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace',
                            }}>
                                Last: {lastFile.name} ({formatBytes(lastFile.size)})
                            </div>
                        )}
                    </>
                )}
            </div>

            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={onFileInput} />
        </div>
    );
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}
