// Deep links: #/explore?tab=parts&part=esp&explode=1&mode=host&view=top keeps a view shareable.
(() => {
    const { state, setState, subscribe, emit, onCommand } = app.ex;
    const { findItem } = app.data;
    const { selectItem, goTour } = app.ex.actions;
    const { track } = app.dom;

    const TABS = ["tour", "parts", "signal"];
    const VIEWS = ["front", "rear", "top", "iso"];
    const MODE_NAMES = ["host", "target"];
    const COPIED_MS = 1400;

    function readLink(query) {
        const patch = {};
        if (TABS.includes(query.get("tab"))) patch.tab = query.get("tab");
        if (MODE_NAMES.includes(query.get("mode"))) patch.mode = query.get("mode");
        if (query.toString()) {
            patch.explode = Math.min(1, Math.max(0, Number(query.get("explode")) || 0));
            patch.spin = query.get("spin") === "1";
        }
        patch.isolate = query.get("isolate") === "1";
        setState(patch);
        if (query.has("step")) goTour(Number(query.get("step")) || 0);
        else if (findItem(query.get("part"))) selectItem(query.get("part"), { fly: true });
        else if (VIEWS.includes(query.get("view"))) emit("preset", query.get("view"));
    }

    function toQuery() {
        const query = new URLSearchParams();
        query.set("tab", state.tab);
        if (state.tab === "tour") query.set("step", String(state.tour));
        if (state.selected) query.set("part", state.selected);
        if (state.explode > 0.5) query.set("explode", "1");
        if (state.mode !== "target") query.set("mode", state.mode);
        if (state.spin) query.set("spin", "1");
        if (state.isolate) query.set("isolate", "1");
        return query;
    }

    function copyLink(btn) {
        const url = `${location.origin}${location.pathname}${app.router.format("explore", toQuery())}`;
        const done = (text) => {
            const prev = btn.textContent;
            btn.textContent = text;
            const timer = setTimeout(() => { btn.textContent = prev; }, COPIED_MS);
            track(() => clearTimeout(timer));
        };
        if (!navigator.clipboard) return done("Link in address bar");
        navigator.clipboard.writeText(url).then(() => done("Copied"), () => done("Link in address bar"));
    }

    function syncLink() {
        subscribe(() => app.router.replaceQuery(toQuery()));
        onCommand("share", copyLink);
    }

    app.ex.link = { readLink, syncLink };
})();
