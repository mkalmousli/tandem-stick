// Pairing/latency model for the planned protocol (not firmware). Deterministic for a given seed.
export function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Each blank target is plugged in at a random time and sends JOIN every `beaconMs` until the host's ACK arrives.
// A frame is lost with probability `loss`; two JOINs in the same 1 ms slot collide.
export function simulateJoin({ targets, loss, beaconMs = 100, seed = 1, horizonMs = 20000 }) {
    const rand = rng(seed);
    const state = Array.from({ length: targets }, () => ({ plugged: Math.floor(rand() * 1000), joined: null, next: 0 }));
    state.forEach((s) => { s.next = s.plugged; });
    for (let t = 0; t < horizonMs && state.some((s) => s.joined === null); t++) {
        const talking = state.filter((s) => s.joined === null && s.next === t);
        talking.forEach((s) => { s.next = t + beaconMs + Math.floor(rand() * 20); });
        if (talking.length !== 1) continue; // idle slot or collision
        const [s] = talking;
        if (rand() >= loss && rand() >= loss) s.joined = t;
    }
    const times = state.filter((s) => s.joined !== null).map((s) => s.joined - s.plugged).sort((a, b) => a - b);
    const pct = (p) => times.length ? times[Math.min(times.length - 1, Math.floor(p * times.length))] : null;
    return { joined: times.length, targets, p50: pct(0.5), p95: pct(0.95), max: times[times.length - 1] ?? null, times };
}

// Input report path: one frame plus acknowledgement, up to `retries` resends after an ack timeout.
export function simulateInput({ loss, retries = 3, ackMs = 2, airMs = 1, n = 20000, seed = 7 }) {
    const rand = rng(seed);
    const lat = [];
    let dropped = 0;
    for (let i = 0; i < n; i++) {
        let t = 0, ok = false;
        for (let a = 0; a <= retries && !ok; a++) {
            t += airMs;
            if (rand() >= loss && rand() >= loss) { ok = true; t += airMs; } else t += ackMs;
        }
        if (ok) lat.push(t); else dropped++;
    }
    lat.sort((a, b) => a - b);
    const pct = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
    return { delivered: lat.length / n, p50: pct(0.5), p99: pct(0.99), dropped };
}
