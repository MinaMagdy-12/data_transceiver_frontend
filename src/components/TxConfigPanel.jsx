import { useState } from 'react';
import { updateTxConfig } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

// HackRF One TX field specs
const FIELDS = [
    { key: 'frequency', label: 'Frequency', unit: 'MHz', min: 1, max: 6000, step: 0.001, placeholder: '915' },
    { key: 'gain', label: 'TX Gain', unit: 'dB', min: 0, max: 47, step: 1, placeholder: '20' },
    { key: 'sampleRate', label: 'Sample Rate', unit: 'Msps', min: 0.1, max: 20, step: 0.1, placeholder: '2' },
    { key: 'sps', label: 'Samples/Symbol', unit: '', min: 1, max: 128, step: 1, placeholder: '8' },
    { key: 'chunkSize', label: 'Chunk Size', unit: 'B', min: 16, max: 4096, step: 16, placeholder: '256' },
    { key: 'maxResend', label: 'Max Resend', unit: '', min: 0, max: 10, step: 1, placeholder: '3' },
    { key: 'transCount', label: 'Trans Count', unit: '', min: 1, max: 100, step: 1, placeholder: '1' },
];

export default function TxConfigPanel() {
    const { txConfig, setTxConfig, addLog } = useDevice();
    const { addToast } = useToast();

    const [vals, setVals] = useState({
        frequency: String(txConfig.frequency),
        gain: String(txConfig.gain),
        sampleRate: String(txConfig.sampleRate),
        sps: String(txConfig.sps),
        chunkSize: String(txConfig.chunkSize),
        maxResend: String(txConfig.maxResend),
        transCount: String(txConfig.transCount),
        modulation: txConfig.modulation || 'QPSK',
        serial: txConfig.serial,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const errs = {};
        FIELDS.forEach(({ key, label, min, max }) => {
            const n = parseFloat(vals[key]);
            if (isNaN(n)) errs[key] = `${label} must be a number`;
            else if (n < min || n > max) errs[key] = `Range: ${min} – ${max}`;
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
            gain: parseFloat(vals.gain),
            sampleRate: parseFloat(vals.sampleRate),
            sps: parseInt(vals.sps, 10),
            chunkSize: parseInt(vals.chunkSize, 10),
            maxResend: parseInt(vals.maxResend, 10),
            transCount: parseInt(vals.transCount, 10),
            modulation: vals.modulation,
            serial: vals.serial.trim(),
        };
        try {
            await updateTxConfig(payload);
            setTxConfig(payload);
            addToast(`TX config saved — ${vals.frequency} MHz, gain ${vals.gain} dB`, 'success');
            addLog(`TX config updated → freq: ${vals.frequency} MHz, gain: ${vals.gain} dB, SR: ${vals.sampleRate} Msps`);
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            addToast(`TX config failed: ${msg}`, 'error');
            addLog(`TX config error: ${msg}`);
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
                    background: 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3b82f6' }}>
                        TX Config
                    </h2>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Transmit settings</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                    {/* Numeric fields */}
                    {FIELDS.map(({ key, label, unit, min, max, step, placeholder }) => (
                        <Field key={key} label={label} unit={unit} error={errors[key]}>
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

                    {/* Device Serial */}
                    <Field label="Device Serial" unit="" error={errors.serial}>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="e.g. 0000000000000000"
                            value={vals.serial}
                            onChange={(e) => setVals(p => ({ ...p, serial: e.target.value }))}
                        />
                    </Field>
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 'auto' }}>
                    {loading
                        ? <><Spinner /> Applying…</>
                        : 'Save TX Settings'}
                </button>
            </form>
        </div>
    );
}

function Field({ label, unit, error, children }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</label>
                {unit && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{unit}</span>}
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
