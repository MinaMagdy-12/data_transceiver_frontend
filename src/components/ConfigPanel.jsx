import { useState } from 'react';
import { updateConfig } from '../services/api';
import { useDevice } from '../context/DeviceContext';
import { useToast } from '../context/ToastContext';

export default function ConfigPanel() {
    const { frequency, sampleRate, setConfig, addLog } = useDevice();
    const { addToast } = useToast();

    const [freq, setFreq] = useState(String(frequency));
    const [sr, setSr] = useState(String(sampleRate));
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validate() {
        const errs = {};
        const f = parseFloat(freq);
        const s = parseFloat(sr);

        if (isNaN(f) || f <= 0) errs.freq = 'Must be a positive number (MHz)';
        else if (f < 1 || f > 6000) errs.freq = 'Valid range: 1 – 6000 MHz';

        if (isNaN(s) || s <= 0) errs.sr = 'Must be a positive number (Msps)';
        else if (s < 0.1 || s > 20) errs.sr = 'Valid range: 0.1 – 20 Msps';

        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setLoading(true);
        try {
            const payload = { frequency: parseFloat(freq), sampleRate: parseFloat(sr) };
            await updateConfig(payload);
            setConfig(payload.frequency, payload.sampleRate);
            addToast(`Config saved — ${freq} MHz @ ${sr} Msps`, 'success');
            addLog(`Config updated → frequency: ${freq} MHz, sampleRate: ${sr} Msps`);
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
            addToast(`Config failed: ${msg}`, 'error');
            addLog(`Config error: ${msg}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-card p-6 flex flex-col gap-5 h-full">
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                    Configuration
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Frequency & sample rate settings
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
                {/* Frequency */}
                <FieldGroup label="Frequency" unit="MHz" error={errors.freq}>
                    <input
                        className={`input-field ${errors.freq ? 'error' : ''}`}
                        type="number"
                        step="0.001"
                        placeholder="e.g. 915"
                        value={freq}
                        onChange={(e) => { setFreq(e.target.value); setErrors((p) => ({ ...p, freq: undefined })); }}
                    />
                </FieldGroup>

                {/* Sample Rate */}
                <FieldGroup label="Sample Rate" unit="Msps" error={errors.sr}>
                    <input
                        className={`input-field ${errors.sr ? 'error' : ''}`}
                        type="number"
                        step="0.1"
                        placeholder="e.g. 2"
                        value={sr}
                        onChange={(e) => { setSr(e.target.value); setErrors((p) => ({ ...p, sr: undefined })); }}
                    />
                </FieldGroup>

                {/* Submit */}
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ marginTop: 'auto' }}
                >
                    {loading ? (
                        <>
                            <span
                                className="animate-spin-custom"
                                style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}
                            />
                            Applying…
                        </>
                    ) : (
                        'Save Configuration'
                    )}
                </button>
            </form>
        </div>
    );
}

function FieldGroup({ label, unit, error, children }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {label}
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {unit}
                </span>
            </div>
            {children}
            {error && (
                <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚠</span> {error}
                </p>
            )}
        </div>
    );
}
