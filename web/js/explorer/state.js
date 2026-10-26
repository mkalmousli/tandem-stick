// Explorer state and one-shot commands. The theme is not here: it lives in app.state.
(() => {
    const { track } = app.dom;

    const state = {
        tab: "tour", tour: 0, guide: "glance", file: "board", spin: true, selected: null, isolate: false, mode: "target", explode: 1,
        layers: { usb: true, ctrl: true, power: true, radio: true },
    };
    const subscribers = new Set();
    const handlers = {};

    function subscribe(fn) {
        subscribers.add(fn);
        const off = () => subscribers.delete(fn);
        track(off);
        return off;
    }

    function setState(patch) {
        Object.assign(state, patch);
        subscribers.forEach((fn) => fn(patch));
    }

    function onCommand(name, fn) {
        (handlers[name] = handlers[name] || []).push(fn);
        track(() => { handlers[name] = handlers[name].filter((item) => item !== fn); });
    }

    const emit = (name, arg) => (handlers[name] || []).forEach((fn) => fn(arg));

    Object.assign(app.ex, { state, subscribe, setState, onCommand, emit });
})();
