// App-wide state. The theme lives here and nowhere else.
(() => {
    const state = { theme: app.theme.savedTheme(), route: "home", viewport: { w: document.documentElement.clientWidth, h: innerHeight } };
    const listeners = new Set();

    function subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    function setState(patch) {
        Object.assign(state, patch);
        listeners.forEach((fn) => fn(patch));
    }

    const pal = () => app.theme.PALETTE[state.theme];

    app.state = { state, subscribe, setState, pal };
})();
