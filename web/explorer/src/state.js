// Single source of truth for UI state, plus a tiny event bus for one-shot commands.
const THEME_KEY = "tandem-theme";

function initialTheme() {
    const forced = document.documentElement.dataset.theme;
    if (forced === "dark" || forced === "light") return forced;
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "dark" || saved === "light") return saved;
    } catch (err) {
        // storage unavailable: fall through to the system preference
    }
    const light = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    return light ? "light" : "dark";
}

export const state = {
    theme: initialTheme(),
    tab: "tour",
    tour: 0,
    spin: true,
    selected: null,
    isolate: false,
    mode: "target",
    explode: 1,
    layers: { usb: true, ctrl: true, power: true, radio: true },
    qty: 4,
};

const subscribers = new Set();

export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

export function setState(patch) {
    Object.assign(state, patch);
    subscribers.forEach((fn) => fn(patch));
}

export function saveTheme() {
    try {
        localStorage.setItem(THEME_KEY, state.theme);
    } catch (err) {
        // ignore: preference just won't persist
    }
}

const handlers = {};

export function onCommand(name, fn) {
    (handlers[name] = handlers[name] || []).push(fn);
}

export function emit(name, arg) {
    (handlers[name] || []).forEach((fn) => fn(arg));
}
