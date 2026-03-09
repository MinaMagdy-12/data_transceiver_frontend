import { useDevice } from '../context/DeviceContext';

const STATUS_CONFIG = {
    idle: {
        label: 'Idle',
        color: '#3b82f6',
        glow: 'var(--accent-glow)',
        animation: 'animate-glow-blue',
        bg: 'rgba(59,130,246,0.1)',
        ringColor: '#3b82f680',
    },
    transmitting: {
        label: 'Transmitting',
        color: '#22c55e',
        glow: 'var(--green-glow)',
        animation: 'animate-glow-green',
        bg: 'rgba(34,197,94,0.1)',
        ringColor: '#22c55e80',
    },
    error: {
        label: 'Error',
        color: '#ef4444',
        glow: 'var(--red-glow)',
        animation: 'animate-glow-red',
        bg: 'rgba(239,68,68,0.1)',
        ringColor: '#ef444480',
    },
    offline: {
        label: 'Offline',
        color: '#6b7280',
        glow: 'transparent',
        animation: '',
        bg: 'rgba(107,114,128,0.08)',
        ringColor: '#6b728050',
    },
};

// ── Arc Gauge ─────────────────────────────────────────────────────────────────
// Renders a 240-degree arc gauge. value: bytes/sec, maxBytes: ceiling of scale.
function ArcGauge({ value, maxBytes, colorStop }) {
    const R = 44;                        // radius
    const CX = 60, CY = 58;             // center (slightly below midpoint so labels fit)
    const START_DEG = 150;              // arc starts at bottom-left
    const SWEEP = 240;                  // total arc span in degrees
    const circumference = 2 * Math.PI * R;
    const arcLen = (circumference * SWEEP) / 360;
    const pct = Math.min(value / maxBytes, 1);

    // Convert angle to SVG path arc point
    function polar(deg) {
        const rad = ((deg - 90) * Math.PI) / 180;
        return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
    }

    function arcPath(startDeg, endDeg) {
        const s = polar(startDeg);
        const e = polar(endDeg);
        const largeArc = endDeg - startDeg > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`;
    }

    const kbps = Math.round((value * 8) / 1000);
    const displayStr = kbps >= 1000 ? `${(kbps / 1000).toFixed(2)} Mbps` : `${kbps} kbps`;

    return (
        <svg width="120" height="80" viewBox="0 0 120 80" style={{ overflow: 'visible' }}>
            {/* Track */}
            <path
                d={arcPath(START_DEG, START_DEG + SWEEP)}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="7"
                strokeLinecap="round"
            />
            {/* Filled arc */}
            {pct > 0 && (
                <path
                    d={arcPath(START_DEG, START_DEG + SWEEP * pct)}
                    fill="none"
                    stroke={colorStop}
                    strokeWidth="7"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 4px ${colorStop}88)`, transition: 'all 0.8s ease' }}
                />
            )}
            {/* Value label */}
            <text x={CX} y={CY + 4} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                {displayStr}
            </text>
        </svg>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function StatusIndicator() {
    const { status, deviceId, connected, rxRate, txRate } = useDevice();
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
    const MAX_BYTES = 1_000_000 / 8;   // 1 Mbps ceiling

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                    Device Status
                </h2>
                <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px',
                    background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                    color: connected ? '#22c55e' : '#6b7280',
                    border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}`,
                }}>
                    {connected ? 'LINKED' : 'NO LINK'}
                </span>
            </div>

            {/* Orb */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
                <div className={cfg.animation} style={{
                    width: '68px', height: '68px', borderRadius: '50%', background: cfg.bg,
                    border: `2px solid ${cfg.ringColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: cfg.color, boxShadow: `0 0 18px 5px ${cfg.glow}`,
                    }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: cfg.color }}>{cfg.label}</p>
                    {deviceId && <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{deviceId}</p>}
                </div>
            </div>

            {/* Rate Gauges */}
            <div style={{
                borderTop: '1px solid var(--border)', paddingTop: '12px',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1,
            }}>
                <GaugePanel label="RX Rate" value={rxRate} maxBytes={MAX_BYTES} color="#22c55e" />
                <GaugePanel label="TX Rate" value={txRate} maxBytes={MAX_BYTES} color="#3b82f6" />
            </div>
        </div>
    );
}

function GaugePanel({ label, value, maxBytes, color }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <ArcGauge value={value} maxBytes={maxBytes} colorStop={color} />
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: color, fontWeight: 600 }}>
                {label}
            </p>
        </div>
    );
}
