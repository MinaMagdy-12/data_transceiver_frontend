/**
 * src/services/api.js
 *
 * API Service Layer — the single integration point between the UI and backend.
 * ─────────────────────────────────────────────────────────────────────────────
 *  SET USE_MOCK = false  to target the real backend.
 *  SET USE_MOCK = true   to run the UI without any backend (safe for dev).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import axios from 'axios';

// ── Toggle this flag ──────────────────────────────────────────────────────────
export const USE_MOCK = false;

// ── Backend base URL (only used when USE_MOCK = false) ────────────────────────
const BASE_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const MOCK_STATUSES = ['idle', 'transmitting', 'error', 'idle', 'transmitting'];
const MOCK_DEVICES = ['rf_1', 'rf_2'];

function randomMockPacket() {
    const status = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)];
    const hasRx = Math.random() < 0.4;
    const isAck = Math.random() > 0.2; // 80% chance of ACK
    return {
        device_id: MOCK_DEVICES[Math.floor(Math.random() * MOCK_DEVICES.length)],
        status,
        timestamp: new Date().toISOString(),
        rtt_ms: hasRx ? Math.floor(20 + Math.random() * 150) : 0,
        ...(hasRx && {
            rx_bytes: Math.floor(512 + Math.random() * 65024),
            ack: isAck
        }),
        // simulate packet drop without rx if transmitting
        ...((status === 'transmitting' && !hasRx) && {
            ack: isAck
        })
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// sendPayload — POST /api/transmit
// ─────────────────────────────────────────────────────────────────────────────
// curl -X POST "http://localhost:8080/send_file" \
//      -H "accept: application/json" \
//      -H "Content-Type: multipart/form-data" \
//      -F "file=@coffee-resized.jpg"

export async function sendPayload(file) {
    if (USE_MOCK) {
        await delay(1200);
        if (Math.random() < 0.15) {
            const err = new Error('Mock transmission error: signal lost');
            err.response = { status: 500, data: { message: 'Signal lost during transmission (mock)' } };
            throw err;
        }
        return { 
            status: 200, 
            data: { message: `File "${file.name}" transmitted successfully (mock)`, bytes: file.size, ack: Math.random() > 0.1 } 
        };
    }

    const formData = new FormData();
    // Matches the -F "file=@coffee-resized.jpg"
    formData.append('file', file); 

    // Assuming BASE_URL is set to "http://localhost:8080"
    return axios.post(`${BASE_URL}/send_file`, formData, {
        headers: { 
            'Content-Type': 'multipart/form-data',
            'accept': 'application/json' // Added to match the cURL headers
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// sendMessage — POST /api/transmit  (text payload)
// ─────────────────────────────────────────────────────────────────────────────
// curl -X POST "http://127.0.0.1:8080/send_text" \
//      -H "Content-Type: application/x-www-form-urlencoded" \
//      -d "message=Hello HackRF World"

export async function sendMessage(text) {
    if (USE_MOCK) {
        await delay(800);
        if (Math.random() < 0.1) {
            const err = new Error('Mock TX error: collision detected');
            err.response = { status: 500, data: { message: 'Channel collision detected (mock)' } };
            throw err;
        }
        return { 
            status: 200, 
            data: { message: 'Message transmitted (mock)', bytes: new Blob([text]).size, ack: Math.random() > 0.1 } 
        };
    }

    // Prepare the data natively as x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('message', text);

    // Assuming BASE_URL is "http://127.0.0.1:8080"
    return axios.post(`${BASE_URL}/send_text`, params, {
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded' 
        },
    });
}

// PUT /api/config
export async function updateConfig(json) {
    if (USE_MOCK) {
        await delay(500);
        if (Math.random() < 0.08) {
            const err = new Error('Mock config error');
            err.response = { status: 400, data: { message: 'Configuration validation failed (mock)' } };
            throw err;
        }
        return { status: 200, data: { message: 'Configuration applied to radio.conf (mock)', config: json } };
    }
    return axios.put(`${BASE_URL}/api/config`, json);
}
// ─────────────────────────────────────────────────────────────────────────────
// connectWebSocket
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {(packet: object) => void} onMessage  - Called for each telemetry packet
 * @param {(err: Event)   => void}   onError    - Called if the WS errors/closes
 * @returns {{ disconnect: () => void }}         - Call disconnect() to clean up
 */
export function connectWebSocket(onMessage, onError) {
    if (USE_MOCK) {
        // Immediately emit one packet, then every 5 seconds
        onMessage(randomMockPacket());
        const intervalId = setInterval(() => {
            onMessage(randomMockPacket());
        }, 5000);

        return {
            disconnect: () => clearInterval(intervalId),
        };
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.info('[WS] Connected to', WS_URL);
    ws.onmessage = (event) => {
        try {
            const packet = JSON.parse(event.data);
            onMessage(packet);
        } catch {
            console.warn('[WS] Non-JSON message:', event.data);
        }
    };
    ws.onerror = (err) => {
        console.error('[WS] Error', err);
        onError?.(err);
    };
    ws.onclose = (evt) => {
        console.warn('[WS] Closed', evt.code, evt.reason);
        onError?.({ type: 'close', code: evt.code });
    };

    return {
        disconnect: () => ws.close(),
    };
}
