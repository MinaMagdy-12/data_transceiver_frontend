import { useState } from 'react';
import { updateRxConfig } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

// HackRF One RX field specs
const FIELDS = [
    { key: 'frequency', label: 'Frequency', unit: 'MHz', min: 1, max: 6000, step: 0.001, placeholder: '433' },
    { key: 'lnaGain', label: 'LNA Gain', unit: 'dB', min: 0, max: 40, step: 8, placeholder: '16', note: 'x8' },
    { key: 'vgaGain', label: 'VGA Gain', unit: 'dB', min: 0, max: 62, step: 2, placeholder: '20', note: 'x2' },
    { key: 'sampleRate', label: 'Sample Rate', unit: 'Msps', min: 0.1, max: 20, step: 0.1, placeholder: '2' },
    { key: 'captureSeconds', label: 'Capture Secs', unit: 's', min: 1, max: 3600, step: 1, placeholder: '10' },
    { key: 'sps', label: 'Samples/Symbol', unit: '', min: 1, max: 128, step: 1, placeholder: '8' },
];

export default function RxConfigPanel() {
    const { rxConfig, setRxConfig, addLog } = useDevice();
    const { addToast } = useToast();

    const [vals, setVals] = useState({
        frequency: String(rxConfig.frequency),
        lnaGain: String(rxConfig.lnaGain),
        vgaGain: String(rxConfig.vgaGain),
        sampleRate: String(rxConfig.sampleRate),
        captureSeconds: String(rxConfig.captureSeconds),
        sps: String(rxConfig.sps),
        modulation: rxConfig.modulation || 'QPSK',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const errs = {};
        FIELDS.forEach(({ key, label, min, max, step }) => {
            const n = parseFloat(vals[key]);
            if (isNaN(n)) errs[key] = `${label} must be a number`;
            else if (n < min || n > max) errs[key] = `Range: ${min} – ${max}`;
            else if (step >= 1 && n % step !== 0) errs[key] = `Must be a multiple of ${step}`;
        });
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setLoading(true);
        const payload = {
            frequency: parseFloat(vals.frequency),
            lnaGain: parseFloat(vals.lnaGain),
            vgaGain: parseFloat(vals.vgaGain),
            sampleRate: parseFloat(vals.sampleRate),
            captureSeconds: parseInt(vals.captureSeconds, 10),
            sps: parseInt(vals.sps, 10),
            modulation: vals.modulation,
        };
        try {
            await updateRxConfig(payload);
            setRxConfig(payload);
            addToast(`RX config saved — ${vals.frequency} MHz, LNA ${vals.lnaGain} dB`, 'success');
            addLog(`RX config updated → freq: ${vals.frequency} MHz, LNA: ${vals.lnaGain} dB, VGA: ${vals.vgaGain} dB, SR: ${vals.sampleRate} Msps`);
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            addToast(`RX config failed: ${msg}`, 'error');
            addLog(`RX config error: ${msg}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: 'rgba(34,197,94,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="8 17 12 21 16 17" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22c55e' }}>
                        RX Config
                    </h2>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Receive settings</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                    {FIELDS.map(({ key, label, unit, min, max, step, placeholder, note }) => (
                        <Field key={key} label={label} unit={unit} note={note} error={errors[key]}>
                            <input
                                className={`input-field${errors[key] ? ' error' : ''}`}
                                type="number" min={min} max={max} step={step}
                                placeholder={placeholder}
                                value={vals[key]}
                                onChange={(e) => { setVals(p => ({ ...p, [key]: e.target.value })); setErrors(p => ({ ...p, [key]: undefined })); }}
                            />
                        </Field>
                    ))}

                    {/* Modulation */}
                    <Field label="Modulation" unit="" error={errors.modulation}>
                        <select
                            className="input-field"
                            value={vals.modulation}
                            onChange={(e) => setVals(p => ({ ...p, modulation: e.target.value }))}
                        >
                            <option value="QPSK">QPSK</option>
                            <option value="BPSK">BPSK</option>
                            <option value="OFDM">OFDM</option>
                        </select>
                    </Field>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        marginTop: 'auto',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 22px',
                        background: 'linear-gradient(135deg, #22c55e, #15803d)',
                        border: 'none', borderRadius: 8,
                        color: '#fff', fontSize: '14px', fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? <><Spinner /> Applying…</> : 'Save RX Settings'}
                </button>
            </form>
        </div>
    );
}

function Field({ label, unit, note, error, children }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {note ? `${unit} · ${note}` : unit}
                </span>
            </div>
            {children}
            {error && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: 4 }}>⚠ {error}</p>}
        </div>
    );
}

function Spinner() {
    return <span className="animate-spin-custom" style={{
        width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
    }} />;
}
