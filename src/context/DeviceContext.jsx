import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useReducer,
    useRef,
} from 'react';
import { connectWebSocket } from '../services/api';

// ─── State shape ──────────────────────────────────────────────────────────────
const initialState = {
    status: 'offline',  // 'idle' | 'transmitting' | 'error' | 'offline'
    deviceId: null,
    logLines: [],
    connected: false,
    // TX config (HackRF transmit side)
    txConfig: { frequency: 915, gain: 20, sampleRate: 2, serial: '', sps: 8, chunkSize: 256, maxResend: 3, modulation: 'QPSK', transCount: 1 },
    // RX config (HackRF receive side)
    rxConfig: { frequency: 433, lnaGain: 16, vgaGain: 20, sampleRate: 2, captureSeconds: 10, sps: 8, modulation: 'QPSK' },
    // Queues
    txQueue: [],         // { id, name, size, status, timestamp }
    rxQueue: [],         // { id, device_id, bytes, timestamp, status }
    // Data rates (bytes / sec)
    rxRate: 0,
    txRate: 0,
    // Telemetry Metrics
    telemetry: {
        startTime: Date.now(),
        totalBytes: 0,
        txAttempts: 0,
        packetDrops: 0,
        totalRttMs: 0,
        rttCount: 0,
    }
};

let _queueId = 1;

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
    switch (action.type) {
        case 'WS_PACKET': {
            const { device_id, status, timestamp, rx_bytes, ack } = action.payload;
            const label = `[${new Date(timestamp).toLocaleTimeString()}] ${device_id} → status: ${status}`;
            // EMA for RX rate (WS mock fires every ~5 s → bytes/s = rx_bytes / 5)
            const newRxRate = rx_bytes != null
                ? Math.round(state.rxRate * 0.6 + (rx_bytes / 5) * 0.4)
                : Math.round(state.rxRate * 0.85);
            // TX rate: ramp when transmitting, decay otherwise
            const newTxRate = status === 'transmitting'
                ? Math.round(state.txRate * 0.5 + (12000 + Math.random() * 40000) * 0.5)
                : Math.round(state.txRate * 0.75);
            // RX queue
            const rxQueue = rx_bytes != null
                ? [
                    ...state.rxQueue.slice(-49),
                    {
                        id: action.id ?? _queueId++,
                        device_id,
                        bytes: rx_bytes,
                        timestamp: new Date(timestamp).toLocaleTimeString(),
                        status: 'received',
                        ack,
                    },
                ]
                : state.rxQueue;
            // Telemetry updates
            const isDrop = ack === false;
            const hasTx = status === 'transmitting';
            const rttMs = action.payload.rtt_ms || 0;

            const telemetry = {
                ...state.telemetry,
                totalBytes: state.telemetry.totalBytes + (rx_bytes || 0),
                txAttempts: state.telemetry.txAttempts + (hasTx ? 1 : 0),
                packetDrops: state.telemetry.packetDrops + (isDrop ? 1 : 0),
                totalRttMs: state.telemetry.totalRttMs + rttMs,
                rttCount: state.telemetry.rttCount + (rttMs > 0 ? 1 : 0),
            };

            return {
                ...state,
                status,
                deviceId: device_id,
                connected: true,
                rxQueue,
                rxRate: newRxRate,
                txRate: newTxRate,
                logLines: [...state.logLines.slice(-199), label],
                telemetry,
            };
        }
        case 'WS_ERROR':
            return {
                ...state,
                status: 'error',
                connected: false,
                logLines: [
                    ...state.logLines.slice(-199),
                    `[${new Date().toLocaleTimeString()}] ⚠ WebSocket error — reconnecting…`,
                ],
            };
        case 'SET_TX_CONFIG':
            return { ...state, txConfig: { ...state.txConfig, ...action.payload } };
        case 'SET_RX_CONFIG':
            return { ...state, rxConfig: { ...state.rxConfig, ...action.payload } };
        case 'ADD_LOG':
            return {
                ...state,
                logLines: [...state.logLines.slice(-199), action.line],
            };
        // ── TX Queue ──────────────────────────────────────────────────────────
        case 'TX_ADD':
            return {
                ...state,
                txQueue: [
                    ...state.txQueue.slice(-49),
                    {
                        id: action.id,
                        name: action.name,
                        size: action.size,
                        status: 'pending',
                        timestamp: new Date().toLocaleTimeString(),
                    },
                ],
            };
        case 'TX_UPDATE':
            return {
                ...state,
                txQueue: state.txQueue.map((item) =>
                    item.id === action.id
                        ? { ...item, status: action.status, ...(action.ack !== undefined && { ack: action.ack }) }
                        : item
                ),
            };
        // ── RX Queue (manual clear) ───────────────────────────────────────────
        case 'CLEAR_RX':
            return { ...state, rxQueue: [] };
        case 'CLEAR_TX':
            return { ...state, txQueue: [] };
        case 'CLEAR_LOG':
            return { ...state, logLines: [] };
        case 'RESET_TELEMETRY':
            return {
                ...state, telemetry: {
                    startTime: Date.now(),
                    totalBytes: 0,
                    txAttempts: 0,
                    packetDrops: 0,
                    totalRttMs: 0,
                    rttCount: 0,
                }
            };
        default:
            return state;
    }
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const DeviceContext = createContext(null);

export function DeviceProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const wsRef = useRef(null);

    const onMessage = useCallback((packet) => {
        dispatch({ type: 'WS_PACKET', payload: packet });
    }, []);

    const onError = useCallback(() => {
        dispatch({ type: 'WS_ERROR' });
    }, []);

    useEffect(() => {
        wsRef.current = connectWebSocket(onMessage, onError);
        return () => wsRef.current?.disconnect();
    }, [onMessage, onError]);

    const setTxConfig = useCallback((cfg) => dispatch({ type: 'SET_TX_CONFIG', payload: cfg }), []);
    const setRxConfig = useCallback((cfg) => dispatch({ type: 'SET_RX_CONFIG', payload: cfg }), []);
    const addLog = useCallback((line) => dispatch({ type: 'ADD_LOG', line: `[${new Date().toLocaleTimeString()}] ${line}` }), []);
    const txAdd = useCallback((name, size) => { const id = Date.now() + Math.random(); dispatch({ type: 'TX_ADD', name, size, id }); return id; }, []);
    const txUpdate = useCallback((id, status, ack) => dispatch({ type: 'TX_UPDATE', id, status, ack }), []);
    const clearRx = useCallback(() => dispatch({ type: 'CLEAR_RX' }), []);
    const clearTx = useCallback(() => dispatch({ type: 'CLEAR_TX' }), []);
    const clearLog = useCallback(() => dispatch({ type: 'CLEAR_LOG' }), []);
    const resetTelemetry = useCallback(() => dispatch({ type: 'RESET_TELEMETRY' }), []);


    return (
        <DeviceContext.Provider value={{ ...state, setTxConfig, setRxConfig, addLog, txAdd, txUpdate, clearRx, clearTx, clearLog, resetTelemetry }}>

            {children}
        </DeviceContext.Provider>
    );
}

export function useDevice() {
    return useContext(DeviceContext);
}

