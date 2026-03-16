import { useDevice } from '../context/DeviceContext';

export default function TelemetryReport() {
    const { telemetry, resetTelemetry } = useDevice();

    // Map directly to the backend's payload fields
    const {
        elapsed = 0,
        totalBytes = 0,
        goodputBps = 0,
        txAttempts = 0,
        packetDrops = 0,
        pdr = 0,
        avgRtt = 0
    } = telemetry;

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full" style={{ minHeight: '200px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        className="animate-glow-blue"
                        style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}
                    />
                    <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                        Telemetry Report
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={resetTelemetry}
                        style={{
                            fontSize: '11px', color: 'var(--text-muted)', background: 'none',
                            border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px',
                            cursor: 'pointer',
                        }}
                    >
                        Reset Metrics
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{
                flex: 1,
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
                background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                border: '1px solid var(--border)', padding: '16px',
            }}>
                {/* Notice how much cleaner this is now! */}
                <MetricBox label="Elapsed Time" value={`${elapsed.toFixed(1)} s`} />
                <MetricBox label="Total Bytes" value={`${fmtBytes(totalBytes)}`} />
                <MetricBox label="Goodput" value={`${goodputBps >= 1024 ? (goodputBps / 1024).toFixed(1) + ' KBps' : Math.floor(goodputBps) + ' Bps'}`} />
                <MetricBox label="TX Attempts" value={txAttempts.toString()} />
                <MetricBox label="Packet Drops" value={`${packetDrops}%`} isDanger={pdr > 10} />
                <MetricBox label="Average RTT" value={avgRtt > 0 ? `${avgRtt.toFixed(3)} s/pkt` : '--'} />
            </div>
        </div>
    );
}

function MetricBox({ label, value, isDanger }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '4px',
            background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px',
            border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`
        }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{
                fontSize: '18px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: isDanger ? '#ef4444' : 'var(--text-primary)'
            }}>{value}</p>
        </div>
    );
}

function fmtBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}