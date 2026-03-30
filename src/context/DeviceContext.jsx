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
    //Config
    config: {
        frequency: 0.0,
        sample_rate: 0,
        samples_per_symbol: 0,
        timeout: 0,
        modulation_method: 'QPSK',
        
        tx_serial: '',
        tx_gain: 0,
        chunk_size: 0,
        max_resend: 0,
        trans_count: 0,
        
        rx_serial: '',
        rx_gain: 0,
        capture_seconds: 0,

        reset_timeout : 0,
        reed_solo_size : 0,
        padding_size : 0
    },
    // Queues
    txQueue: [],         // { id, name, size, status, timestamp }
    rxQueue: [],         // { id, device_id, bytes, timestamp, status }
    // Data rates (bytes / sec)
    rxRate: 0,
    txRate: 0,
    // Telemetry Metrics
    telemetry: {
        timestamp: '',
        elapsed: 0,
        totalBytes: 0,
        goodputBps: 0,
        goodputKbps: 0,
        txAttempts: 0,
        packetDrops: 0,
        pdr: 0,
        avgRtt: 0,
    }
};

let _queueId = 1;

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
    switch (action.type) {
        case 'WS_PACKET': {
            const data = action.payload;
            console.log(data)
            // Log activity to the UI terminal
            const logMsg = `[${data.timestamp}] Telemetry update: ${data.goodputKbps} kbps, PDR: ${data.pdr}%`;

            // Note: Since the backend only sends telemetry now (not per-packet info),
            // we will derive the overall status based on if attempts are happening.
            const isTransmitting = data.goodputBps > 0 || data.txAttempts > state.telemetry.txAttempts;

            return {
                ...state,
                connected: true,
                status: isTransmitting ? 'transmitting' : 'idle',
                logLines:[...state.logLines.slice(-199), logMsg],
                
                // 2. INGEST THE EXACT PAYLOAD FROM BACKEND
                telemetry: {
                    timestamp: data.timestamp || '',
                    elapsed: data.elapsed || 0,
                    totalBytes: data.totalBytes || 0,
                    goodputBps: data.goodputBps || 0,
                    goodputKbps: data.goodputKbps || 0,
                    txAttempts: data.txAttempts || 0,
                    packetDrops: data.packetDrops || 0,
                    pdr: data.pdr || 0,
                    avgRtt: data.avgRtt || 0,
                },
                
                // For the UI gauges, we can map goodput directly to rxRate
                rxRate: data.goodputKbps || 0,
                txRate: data.goodputKbps || 0,
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
        case 'SET_CONFIG':
            return { ...state, config: { ...state.config, ...action.payload } };
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
        // ✅ THE FIX: Zero out the new backend-aligned fields
        case 'RESET_TELEMETRY':
            return {
                ...state, 
                telemetry: {
                    timestamp: new Date().toLocaleTimeString(),
                    elapsed: 0,
                    totalBytes: 0,
                    goodputBps: 0,
                    goodputKbps: 0,
                    txAttempts: 0,
                    packetDrops: 0,
                    pdr: 0,
                    avgRtt: 0,
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

    const setConfig = useCallback((cfg) => dispatch({ type: 'SET_CONFIG', payload: cfg }), []);
    const addLog = useCallback((line) => dispatch({ type: 'ADD_LOG', line: `[${new Date().toLocaleTimeString()}] ${line}` }), []);
    const txAdd = useCallback((name, size) => { const id = Date.now() + Math.random(); dispatch({ type: 'TX_ADD', name, size, id }); return id; }, []);
    const txUpdate = useCallback((id, status, ack) => dispatch({ type: 'TX_UPDATE', id, status, ack }), []);
    const clearRx = useCallback(() => dispatch({ type: 'CLEAR_RX' }), []);
    const clearTx = useCallback(() => dispatch({ type: 'CLEAR_TX' }), []);
    const clearLog = useCallback(() => dispatch({ type: 'CLEAR_LOG' }), []);
    const resetTelemetry = useCallback(() => dispatch({ type: 'RESET_TELEMETRY' }), []);


    return (
        <DeviceContext.Provider value={{ ...state, setConfig, addLog, txAdd, txUpdate, clearRx, clearTx, clearLog, resetTelemetry }}>

            {children}
        </DeviceContext.Provider>
    );
}

export function useDevice() {
    return useContext(DeviceContext);
}

