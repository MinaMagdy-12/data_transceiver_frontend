import { useEffect, useRef } from 'react';
import { useDevice } from '../context/DeviceContext';

export default function LiveLog() {
    const { logLines, clearLog } = useDevice();
    const bottomRef = useRef(null);

    // Auto-scroll to bottom whenever new lines arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logLines]);

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full" style={{ minHeight: '200px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        className="animate-glow-green"
                        style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}
                    />
                    <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                        Live Telemetry Log
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                        {logLines.length} / 200
                    </span>
                    {logLines.length > 0 && (
                        <button
                            onClick={clearLog}
                            style={{
                                fontSize: '11px', color: 'var(--text-muted)', background: 'none',
                                border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px',
                                cursor: 'pointer',
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Log viewport */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                }}
            >
                {logLines.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontStyle: 'italic' }}>
                        Awaiting telemetry…
                    </p>
                ) : (
                    logLines.map((line, i) => (
                        <LogLine key={i} line={line} isLast={i === logLines.length - 1} />
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function LogLine({ line, isLast }) {
    const isError = line.includes('error') || line.includes('✗') || line.includes('⚠');
    const isOk = line.includes('✓') || line.includes('success') || line.includes('complete');

    let color = '#64748b';
    if (isLast) color = '#94a3b8';
    if (isError) color = '#ef4444';
    if (isOk) color = '#22c55e';

    return (
        <p
            style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                lineHeight: 1.7,
                color,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
            }}
        >
            {line}
        </p>
    );
}
