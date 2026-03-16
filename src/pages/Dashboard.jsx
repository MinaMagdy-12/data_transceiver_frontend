import StatusIndicator from '../components/StatusIndicator';
import PayloadDeck from '../components/PayloadDeck';
import TransmissionQueue from '../components/TransmissionQueue';
import ReceivingQueue from '../components/ReceivingQueue';
import TelemetryReport from '../components/TelemetryReport';
import TransceiverConfigPanel from '../components/TransceiverConfigPanel';
import { useDevice } from '../context/DeviceContext';
import { USE_MOCK } from '../services/api';

export default function Dashboard() {
    const { txConfig, rxConfig } = useDevice();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

            {/* ── Nav ──────────────────────────────────────────────────── */}
            <header style={{
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(15,22,41,0.95) 0%, rgba(10,14,26,0.9) 100%)',
                backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{
                    maxWidth: '1600px', margin: '0 auto', padding: '0 24px',
                    height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="animate-glow-blue" style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>RF Control Plane</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1 }}>HackRF One · Dual-Mode Transceiver</p>
                        </div>
                    </div>

                    {/* Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Pill label="TX Freq" value={`${txConfig.frequency} MHz`} color="#3b82f6" />
                        <Pill label="TX Gain" value={`${txConfig.gain} dB`} color="#3b82f6" />
                        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                        <Pill label="RX Freq" value={`${rxConfig.frequency} MHz`} color="#22c55e" />
                        <Pill label="LNA" value={`${rxConfig.lnaGain} dB`} color="#22c55e" />
                        {txConfig.serial && (
                            <Pill label="Serial" value={txConfig.serial.slice(0, 8) + '…'} color="#a855f7" />
                        )}
                        {USE_MOCK && (
                            <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                                borderRadius: 4, background: 'rgba(245,158,11,0.15)',
                                color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', letterSpacing: '0.05em',
                            }}>MOCK MODE</span>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Content ──────────────────────────────────────────────── */}
            <main style={{
                flex: 1, maxWidth: '1600px', width: '100%',
                margin: '0 auto', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '20px',
            }}>
                {/* Row 1: Status+Gauge | TX Config | RX Config | PayloadDeck */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '0.5fr 1fr  1fr',
                    gap: '20px', minHeight: '320px',
                }}>
                    <StatusIndicator />
                    <TransceiverConfigPanel />
                    <PayloadDeck />
                </div>

                {/* Row 2: TX Queue | RX Queue */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px', minHeight: '240px',
                }}>
                    <TransmissionQueue />
                    <ReceivingQueue />
                </div>

                {/* Row 3: Telemetry Report */}
                <div style={{ minHeight: '200px' }}>
                    <TelemetryReport />
                </div>
            </main>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <footer style={{
                borderTop: '1px solid var(--border)', padding: '12px 24px',
                textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)',
            }}>
                RF Control Plane · HackRF One · {USE_MOCK ? 'Mock Mode Active' : 'Live Mode'}
            </footer>
        </div>
    );
}

function Pill({ label, value, color }) {
    return (
        <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: color ?? 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>{label}</p>
            <p style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: color ?? 'var(--text-primary)' }}>{value}</p>
        </div>
    );
}
