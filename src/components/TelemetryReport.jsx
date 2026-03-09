import { useEffect, useState } from 'react';
import { useDevice } from '../context/DeviceContext';

export default function TelemetryReport() {
    const { telemetry, resetTelemetry } = useDevice();
    const [elapsed, setElapsed] = useState(0);

    // Update elapsed time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - telemetry.startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [telemetry.startTime]);

    const txAttempts = telemetry.txAttempts;
    const packetDrops = telemetry.packetDrops;
    const totalBytes = telemetry.totalBytes;
    const avgRtt = telemetry.rttCount > 0 ? (telemetry.totalRttMs / telemetry.rttCount) / 1000 : 0; // seconds

    const goodputBps = elapsed > 0 ? totalBytes / elapsed : 0;
    const dropRate = txAttempts > 0 ? (packetDrops / txAttempts) * 100 : 0;

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
                <MetricBox label="Elapsed Time" value={`${elapsed} s`} />
                <MetricBox label="Total Bytes" value={`${fmtBytes(totalBytes)}`} />
                <MetricBox label="Goodput" value={`${goodputBps >= 1024 ? (goodputBps / 1024).toFixed(1) + ' KBps' : Math.floor(goodputBps) + ' Bps'}`} />
                <MetricBox label="TX Attempts" value={txAttempts.toString()} />
                <MetricBox label="Packet Drops" value={`${packetDrops} (${dropRate.toFixed(1)}%)`} isDanger={dropRate > 10} />
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
