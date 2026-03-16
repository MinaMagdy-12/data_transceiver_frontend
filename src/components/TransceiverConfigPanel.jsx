import { useEffect, useState } from 'react';
import { updateConfig } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

// 1. Map your EXACT radio.conf fields here
const SHARED_FIELDS =[
    { key: 'frequency', label: 'Frequency', unit: 'MHz', min: 1, max: 6000, step: 0.001 },
    { key: 'sample_rate', label: 'Sample Rate', unit: 'Msps', min: 0.1, max: 20, step: 0.1 },
    { key: 'samples_per_symbol', label: 'Samples/Symbol', unit: '', min: 1, max: 1024, step: 1 },
    { key: 'timeout', label: 'Timeout', unit: 's', min: 1, max: 120, step: 1 },
];

const TX_FIELDS =[
    { key: 'tx_gain', label: 'TX Gain', unit: 'dB', min: 0, max: 47, step: 1 },
    { key: 'chunk_size', label: 'Chunk Size', unit: 'B', min: 16, max: 8192, step: 16 },
    { key: 'max_resend', label: 'Max Resend', unit: '', min: 0, max: 10, step: 1 },
    { key: 'trans_count', label: 'Trans Count', unit: '', min: 1, max: 100, step: 1 },
];

const RX_FIELDS =[
    { key: 'rx_gain', label: 'RX Gain', unit: 'dB', min: 0, max: 62, step: 1 },
    { key: 'capture_seconds', label: 'Capture Secs', unit: 's', min: 1, max: 3600, step: 1 },
];

export default function TransceiverConfigPanel() {
    const { txConfig, rxConfig, setTxConfig, setRxConfig, addLog } = useDevice();
    const { addToast } = useToast();
    // 2. Initialize with your EXACT radio.conf defaults if context is empty
    const [vals, setVals] = useState({
        // Shared (Note: 2300000000 Hz = 2300 MHz, 2000000 Hz = 2 Msps)
        frequency: String(txConfig?.frequency || '2300'),
        sample_rate: String(txConfig?.sample_rate || '2'),
        samples_per_symbol: String(txConfig?.samples_per_symbol || '50'),
        timeout: String(txConfig?.timeout || '10'),
        modulation: txConfig?.modulation || 'OFDM',
        
        // TX
        txSerial: txConfig?.txSerial || '0000000000000000f77c60dc29417dc3',
        tx_gain: String(txConfig?.tx_gain || '30'),
        chunk_size: String(txConfig?.chunk_size || '2048'),
        max_resend: String(txConfig?.max_resend || '5'),
        trans_count: String(txConfig?.trans_count || '5'),
        
        // RX
        rxSerial: rxConfig?.rxSerial || '000000000000000075b068dc30792007',
        rx_gain: String(rxConfig?.rx_gain || '20'),
        capture_seconds: String(rxConfig?.capture_seconds || '2'),
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/config_init');
      console.log(response.status)
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      let data = await response.json();
      data = JSON.parse(data);
      console.log(typeof data)
      
      setVals(prev => {
        // Start with previous values as base (safety net)
        // Then override with server data
        // Finally ensure EVERY field used in the form is a string (never undefined)
        return {
          // Shared
          frequency:           String(parseInt(data.frequency,10) / (1000000)           ?? '2322'),
          sample_rate:         String(parseInt(data.sample_rate,10) / (1000000)        ?? prev.sample_rate ?? '2'),
          samples_per_symbol:  String(data.samples_per_symbol  ?? prev.samples_per_symbol  ?? '50'),
          timeout:             String(data.timeout             ?? prev.timeout             ?? '10'),
          modulation:          String(data.modulation          ?? prev.modulation          ?? 'OFDM'),

          // TX
          txSerial:            String(data.txSerial            ?? prev.txSerial            ?? '0000000000000000f77c60dc29417dc3'),
          tx_gain:             String(data.tx_gain             ?? prev.tx_gain             ?? '30'),
          chunk_size:          String(data.chunk_size          ?? prev.chunk_size          ?? '2048'),
          max_resend:          String(data.max_resend          ?? prev.max_resend          ?? '5'),
          trans_count:         String(data.trans_count         ?? prev.trans_count         ?? '5'),

          // RX
          rxSerial:            String(data.rxSerial            ?? prev.rxSerial            ?? '000000000000000075b068dc30792007'),
          rx_gain:             String(data.rx_gain             ?? prev.rx_gain             ?? '20'),
          capture_seconds:     String(data.capture_seconds     ?? prev.capture_seconds     ?? '2'),
        };
      });
    } catch (err) {
      console.log(`ERROR: Fetching Radio.conf ${err}`);
      // Optionally show toast / keep old values
    }
  };

  fetchData();
}, []);

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
            sample_rate: parseFloat(vals.sample_rate),
            samples_per_symbol: parseInt(vals.samples_per_symbol, 10),
            timeout: parseInt(vals.timeout, 10),
            modulation: vals.modulation,
            
            txSerial: vals.txSerial.trim(),
            tx_gain: parseInt(vals.tx_gain, 10),
            chunk_size: parseInt(vals.chunk_size, 10),
            max_resend: parseInt(vals.max_resend, 10),
            trans_count: parseInt(vals.trans_count, 10),
            
            rxSerial: vals.rxSerial.trim(),
            rx_gain: parseInt(vals.rx_gain, 10),
            capture_seconds: parseInt(vals.capture_seconds, 10),
        };

        try {
            await updateConfig(payload);
            
            // Update Context to reflect changes across the app
            setTxConfig(p => ({
                ...p, frequency: payload.frequency, sample_rate: payload.sample_rate, samples_per_symbol: payload.samples_per_symbol, timeout: payload.timeout,
                modulation: payload.modulation, tx_gain: payload.tx_gain, chunk_size: payload.chunk_size, 
                max_resend: payload.max_resend, trans_count: payload.trans_count, txSerial: payload.txSerial
            }));
            
            setRxConfig(p => ({
                ...p, frequency: payload.frequency, sample_rate: payload.sample_rate, samples_per_symbol: payload.samples_per_symbol, timeout: payload.timeout,
                modulation: payload.modulation, rx_gain: payload.rx_gain, capture_seconds: payload.capture_seconds, rxSerial: payload.rxSerial
            }));

            addToast(`Transceiver config saved — ${vals.frequency} MHz`, 'success');
            addLog(`Config updated → freq: ${vals.frequency} MHz, TX Gain: ${vals.tx_gain} dB, RX Gain: ${vals.rx_gain} dB`);
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