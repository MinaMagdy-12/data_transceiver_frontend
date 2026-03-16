import { useState } from 'react';
import { updateConfig } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

// 1. Map your EXACT radio.conf fields here
const SHARED_FIELDS =[
    { key: 'frequency', label: 'Frequency', unit: 'MHz', min: 1, max: 6000, step: 0.001 },
    { key: 'sampleRate', label: 'Sample Rate', unit: 'Msps', min: 0.1, max: 20, step: 0.1 },
    { key: 'sps', label: 'Samples/Symbol', unit: '', min: 1, max: 1024, step: 1 },
    { key: 'timeout', label: 'Timeout', unit: 's', min: 1, max: 120, step: 1 },
];

const TX_FIELDS =[
    { key: 'txGain', label: 'TX Gain', unit: 'dB', min: 0, max: 47, step: 1 },
    { key: 'chunkSize', label: 'Chunk Size', unit: 'B', min: 16, max: 8192, step: 16 },
    { key: 'maxResend', label: 'Max Resend', unit: '', min: 0, max: 10, step: 1 },
    { key: 'transCount', label: 'Trans Count', unit: '', min: 1, max: 100, step: 1 },
];

const RX_FIELDS =[
    { key: 'rxGain', label: 'RX Gain', unit: 'dB', min: 0, max: 62, step: 1 },
    { key: 'captureSeconds', label: 'Capture Secs', unit: 's', min: 1, max: 3600, step: 1 },
];

export default function TransceiverConfigPanel() {
    const { txConfig, rxConfig, setTxConfig, setRxConfig, addLog } = useDevice();
    const { addToast } = useToast();

    // 2. Initialize with your EXACT radio.conf defaults if context is empty
    const [vals, setVals] = useState({
        // Shared (Note: 2300000000 Hz = 2300 MHz, 2000000 Hz = 2 Msps)
        frequency: String(txConfig?.frequency || '2300'),
        sampleRate: String(txConfig?.sampleRate || '2'),
        sps: String(txConfig?.sps || '50'),
        timeout: String(txConfig?.timeout || '10'),
        modulation: txConfig?.modulation || 'OFDM',
        
        // TX
        txSerial: txConfig?.txSerial || '0000000000000000f77c60dc29417dc3',
        txGain: String(txConfig?.txGain || '30'),
        chunkSize: String(txConfig?.chunkSize || '2048'),
        maxResend: String(txConfig?.maxResend || '5'),
        transCount: String(txConfig?.transCount || '5'),
        
        // RX
        rxSerial: rxConfig?.rxSerial || '000000000000000075b068dc30792007',
        rxGain: String(rxConfig?.rxGain || '20'),
        captureSeconds: String(rxConfig?.captureSeconds || '2'),
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const errs = {};
        const allFields =[...SHARED_FIELDS, ...TX_FIELDS, ...RX_FIELDS];
        
        allFields.forEach(({ key, label, min, max, step }) => {
            const n = parseFloat(vals[key]);
            if (isNaN(n)) errs[key] = `${label} must be a number`;
            else if (n < min || n > max) errs[key] = `Range: ${min} – ${max}`;
            else if (step >= 1 && n % step !== 0 && key !== 'frequency') {
                errs[key] = `Must be a multiple of ${step}`;
            }
        });
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setLoading(true);
        // Build payload targeting exactly what the backend needs
        const payload = {
            frequency: parseFloat(vals.frequency),
            sampleRate: parseFloat(vals.sampleRate),
            sps: parseInt(vals.sps, 10),
            timeout: parseInt(vals.timeout, 10),
            modulation: vals.modulation,
            
            txSerial: vals.txSerial.trim(),
            txGain: parseInt(vals.txGain, 10),
            chunkSize: parseInt(vals.chunkSize, 10),
            maxResend: parseInt(vals.maxResend, 10),
            transCount: parseInt(vals.transCount, 10),
            
            rxSerial: vals.rxSerial.trim(),
            rxGain: parseInt(vals.rxGain, 10),
            captureSeconds: parseInt(vals.captureSeconds, 10),
        };

        try {
            await updateConfig(payload);
            
            // Update Context to reflect changes across the app
            setTxConfig(p => ({
                ...p, frequency: payload.frequency, sampleRate: payload.sampleRate, sps: payload.sps, timeout: payload.timeout,
                modulation: payload.modulation, txGain: payload.txGain, chunkSize: payload.chunkSize, 
                maxResend: payload.maxResend, transCount: payload.transCount, txSerial: payload.txSerial
            }));
            
            setRxConfig(p => ({
                ...p, frequency: payload.frequency, sampleRate: payload.sampleRate, sps: payload.sps, timeout: payload.timeout,
                modulation: payload.modulation, rxGain: payload.rxGain, captureSeconds: payload.captureSeconds, rxSerial: payload.rxSerial
            }));

            addToast(`Transceiver config saved — ${vals.frequency} MHz`, 'success');
            addLog(`Config updated → freq: ${vals.frequency} MHz, TX Gain: ${vals.txGain} dB, RX Gain: ${vals.rxGain} dB`);
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            addToast(`Config failed: ${msg}`, 'error');
            addLog(`Config error: ${msg}`);
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (key, val) => {
        setVals(p => ({ ...p, [key]: val }));
        setErrors(p => ({ ...p, [key]: undefined }));
    };

    return (
        <div className="glass-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: 'rgba(168, 85, 247, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a855f7' }}>
                        Transceiver Config
                    </h2>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Global radio.conf settings</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                
                {/* ── Shared Settings ── */}
                <div>
                    <h3 style={sectionHeaderStyle}>Shared RF Settings</h3>
                    <div style={gridStyle}>
                        {SHARED_FIELDS.map((f) => (
                            <Field key={f.key} label={f.label} unit={f.unit} error={errors[f.key]}>
                                <input className={`input-field${errors[f.key] ? ' error' : ''}`} type="number" min={f.min} max={f.max} step={f.step}
                                    value={vals[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} />
                            </Field>
                        ))}
                        <Field label="Modulation" unit="" error={errors.modulation}>
                            <select className="input-field" value={vals.modulation} onChange={(e) => handleChange('modulation', e.target.value)}>
                                <option value="QPSK">QPSK</option>
                                <option value="BPSK">BPSK</option>
                                <option value="OFDM">OFDM</option>
                            </select>
                        </Field>
                    </div>
                </div>

                {/* ── TX Settings ── */}
                <div>
                    <h3 style={sectionHeaderStyle}>TX Settings</h3>
                    <div style={gridStyle}>
                        {TX_FIELDS.map((f) => (
                            <Field key={f.key} label={f.label} unit={f.unit} error={errors[f.key]}>
                                <input className={`input-field${errors[f.key] ? ' error' : ''}`} type="number" min={f.min} max={f.max} step={f.step}
                                    value={vals[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} />
                            </Field>
                        ))}
                    </div>
                    {/* Full width for serials */}
                    <div style={{ marginTop: 12 }}>
                        <Field label="TX Serial" unit="" error={errors.txSerial}>
                            <input className="input-field" type="text" placeholder="Hardware TX Serial"
                                value={vals.txSerial} onChange={(e) => handleChange('txSerial', e.target.value)} />
                        </Field>
                    </div>
                </div>

                {/* ── RX Settings ── */}
                <div>
                    <h3 style={sectionHeaderStyle}>RX Settings</h3>
                    <div style={gridStyle}>
                        {RX_FIELDS.map((f) => (
                            <Field key={f.key} label={f.label} unit={f.unit} note={f.note} error={errors[f.key]}>
                                <input className={`input-field${errors[f.key] ? ' error' : ''}`} type="number" min={f.min} max={f.max} step={f.step}
                                    value={vals[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} />
                            </Field>
                        ))}
                    </div>
                    {/* Full width for serials */}
                    <div style={{ marginTop: 12 }}>
                        <Field label="RX Serial" unit="" error={errors.rxSerial}>
                            <input className="input-field" type="text" placeholder="Hardware RX Serial"
                                value={vals.rxSerial} onChange={(e) => handleChange('rxSerial', e.target.value)} />
                        </Field>
                    </div>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={loading} style={{
                        marginTop: 'auto',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 22px',
                        background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
                        border: 'none', borderRadius: 8,
                        color: '#fff', fontSize: '14px', fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                        transition: 'all 0.2s',
                    }}>
                    {loading ? <><Spinner /> Applying…</> : 'Save Transceiver Settings'}
                </button>
            </form>
        </div>
    );
}

// Sub-components & Styles
const gridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 };
const sectionHeaderStyle = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' };

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
    return <span className="animate-spin-custom" style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />;
}