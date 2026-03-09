import { useDevice } from '../context/DeviceContext';
import { CountBadge, QueueList, QueueRow, StatusChip } from './TransmissionQueue';

export default function ReceivingQueue() {
    const { rxQueue, clearRx } = useDevice();

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* RX arrow icon */}
                    <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="8 17 12 21 16 17" />
                            <line x1="12" y1="3" x2="12" y2="21" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                        RX Queue
                    </h2>
                    <CountBadge count={rxQueue.length} color="#22c55e" />
                </div>
                {rxQueue.length > 0 && (
                    <button
                        onClick={clearRx}
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

            {/* List */}
            <QueueList
                items={rxQueue}
                emptyText="Awaiting incoming frames from the RF link…"
                renderRow={(item) => (
                    <QueueRow key={item.id}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                Frame from <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#22c55e' }}>{item.device_id}</span>
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                                {formatBytes(item.bytes)} · {item.timestamp}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <StatusChip label="Received" color="#22c55e" bg="rgba(34,197,94,0.12)" />
                            {item.ack !== undefined && (
                                <StatusChip
                                    label={item.ack ? 'ACK' : 'NO ACK'}
                                    color={item.ack ? '#10b981' : '#f43f5e'}
                                    bg={item.ack ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}
                                />
                            )}
                        </div>
                    </QueueRow>
                )}
            />
        </div>
    );
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}
