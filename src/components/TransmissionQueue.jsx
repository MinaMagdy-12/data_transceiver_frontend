import { useDevice } from '../context/DeviceContext';

const STATUS_COLOR = {
    pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
    transmitting: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Sending…' },
    done: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Sent' },
    error: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Error' },
};

export default function TransmissionQueue() {
    const { txQueue, clearTx } = useDevice();

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* TX arrow icon */}
                    <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: 'rgba(59,130,246,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                        TX Queue
                    </h2>
                    <CountBadge count={txQueue.length} color="#3b82f6" />
                </div>
                {txQueue.length > 0 && (
                    <button
                        onClick={clearTx}
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
                items={txQueue}
                emptyText="No outgoing items yet — drop a file to transmit"
                renderRow={(item) => {
                    const s = STATUS_COLOR[item.status] ?? STATUS_COLOR.pending;
                    return (
                        <QueueRow key={item.id}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name}
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                                    {formatBytes(item.size)} · {item.timestamp}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <StatusChip label={s.label} color={s.color} bg={s.bg} />
                                {item.status === 'done' && item.ack !== undefined && (
                                    <StatusChip
                                        label={item.ack ? 'ACK' : 'NO ACK'}
                                        color={item.ack ? '#10b981' : '#f43f5e'}
                                        bg={item.ack ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}
                                    />
                                )}
                            </div>
                        </QueueRow>
                    );
                }}
            />
        </div>
    );
}

// ─── Shared queue primitives ───────────────────────────────────────────────────
export function QueueList({ items, emptyText, renderRow }) {
    return (
        <div style={{
            flex: 1, overflowY: 'auto',
            background: 'rgba(0,0,0,0.2)', borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
        }}>
            {items.length === 0 ? (
                <p style={{
                    color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic',
                    padding: '14px 16px',
                }}>
                    {emptyText}
                </p>
            ) : (
                [...items].reverse().map(renderRow)
            )}
        </div>
    );
}

export function QueueRow({ children }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
        }}>
            {children}
        </div>
    );
}

export function StatusChip({ label, color, bg }) {
    return (
        <span style={{
            fontSize: '10px', fontWeight: 700,
            padding: '2px 8px', borderRadius: 99,
            color, background: bg,
            border: `1px solid ${color}44`,
            whiteSpace: 'nowrap', flexShrink: 0,
        }}>
            {label}
        </span>
    );
}

export function CountBadge({ count, color }) {
    return (
        <span style={{
            fontSize: '11px', fontWeight: 700, lineHeight: 1,
            padding: '2px 7px', borderRadius: 99,
            background: `${color}18`,
            color, border: `1px solid ${color}33`,
        }}>
            {count}
        </span>
    );
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}
