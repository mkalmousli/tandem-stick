// Zoom: wraps an image-like node (canvas or svg) so a click opens a full-screen viewer with wheel, pinch, drag and keys.
(() => {
    const { el, add, on, themed, createScope, withScope } = app.dom;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { button } = app.ui.button;

    const LAYER = "5000";
    const SHADE = "rgba(6,6,8,0.92)";
    const FIT_SHARE = 0.92;
    const MAX_K = 12;
    const TAP_PX = 6;
    const TAP_MS = 500;
    const STEP = 1.25;
    const WHEEL_RATE = 0.0016;
    const DOUBLE_K = 2.5;

    const natural = (node) => {
        if (node.tagName.toLowerCase() === "svg") { const [, , w, h] = node.getAttribute("viewBox").split(" ").map(Number); return [w, h]; }
        return [node.width, node.height];
    };

    function openViewer(source, caption) {
        const scope = createScope();
        const opener = document.activeElement;
        const [natW, natH] = natural(source);
        const root = el("div", { position: "fixed", left: "0px", top: "0px", width: "100%", height: "100%", background: SHADE, zIndex: LAYER, touchAction: "none", outline: "none" }, { role: "dialog", "aria-modal": "true", "aria-label": caption, tabindex: "0" });
        const stage = el("div", { position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", overflow: "hidden", cursor: "grab" });
        const content = el("div", { position: "absolute", left: "0px", top: "0px", transformOrigin: "0 0", width: px(natW), height: px(natH), willChange: "transform" });
        const copy = source.tagName.toLowerCase() === "svg" ? source.cloneNode(true) : el("canvas", { width: "100%", height: "100%", display: "block" });
        if (copy.tagName.toLowerCase() === "canvas") { copy.width = source.width; copy.height = source.height; copy.getContext("2d").drawImage(source, 0, 0); }
        else { copy.style.width = "100%"; copy.style.height = "100%"; }
        add(content, copy);
        add(stage, content);
        const view = { k: 1, x: 0, y: 0 };
        const size = () => [stage.clientWidth, stage.clientHeight];
        const fitK = () => { const [w, h] = size(); return Math.min(w / natW, h / natH) * FIT_SHARE; };
        function paintView() { content.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`; }
        function zoomAt(factor, cx, cy) {
            const next = Math.min(MAX_K * fitK(), Math.max(fitK() * 0.5, view.k * factor));
            const ratio = next / view.k;
            view.x = cx - (cx - view.x) * ratio;
            view.y = cy - (cy - view.y) * ratio;
            view.k = next;
            paintView();
        }
        function fit() {
            const [w, h] = size();
            view.k = fitK();
            view.x = (w - natW * view.k) / 2;
            view.y = (h - natH * view.k) / 2;
            paintView();
        }
        const centre = (factor) => { const [w, h] = size(); zoomAt(factor, w / 2, h / 2); };
        const actual = () => { const [w, h] = size(); view.k = 1; view.x = (w - natW) / 2; view.y = (h - natH) / 2; paintView(); };

        const bar = el("div", { position: "absolute", top: px(SPACE.md), right: px(SPACE.md), display: "flex", gap: px(SPACE.xs), padding: px(SPACE.xs), borderRadius: px(RADIUS.md), background: "rgba(30,30,34,0.85)" });
        function close() { scope.dispose(); root.remove(); if (opener && opener.focus) opener.focus(); }
        withScope(scope, () => {
            [["−", "Zoom out", () => centre(1 / STEP)], ["+", "Zoom in", () => centre(STEP)], ["Fit", "Fit to screen", fit], ["100%", "Actual size", actual], ["Close", "Close viewer", close]]
                .forEach(([text, aria, fn]) => add(bar, button({ label: text, ariaLabel: aria, kind: text === "Close" ? "solid" : "ghost", onClick: fn })));
            const hint = el("div", { position: "absolute", left: px(SPACE.md), bottom: px(SPACE.md), color: "#c7ccd4", fontFamily: FONT.sans, fontSize: px(FONT.sm), pointerEvents: "none" });
            hint.textContent = `${caption} · scroll or pinch to zoom · drag to move · click to close · Esc to close`;
            add(root, stage, bar, hint);

            const pointers = new Map();
            let down = null;
            let pinch = 0;
            on(stage, "wheel", (evt) => {
                evt.preventDefault();
                const box = stage.getBoundingClientRect();
                zoomAt(Math.exp(-evt.deltaY * WHEEL_RATE * (evt.ctrlKey ? 4 : 1)), evt.clientX - box.left, evt.clientY - box.top);
            }, { passive: false });
            on(stage, "pointerdown", (evt) => { pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY }); stage.setPointerCapture(evt.pointerId); stage.style.cursor = "grabbing"; pinch = 0; down = { x: evt.clientX, y: evt.clientY, t: performance.now() }; });
            on(stage, "pointermove", (evt) => {
                const last = pointers.get(evt.pointerId);
                if (!last) return;
                const now = { x: evt.clientX, y: evt.clientY };
                pointers.set(evt.pointerId, now);
                if (pointers.size === 1) { view.x += now.x - last.x; view.y += now.y - last.y; paintView(); return; }
                const [a, b] = [...pointers.values()];
                const gap = Math.hypot(a.x - b.x, a.y - b.y);
                const box = stage.getBoundingClientRect();
                if (pinch) zoomAt(gap / pinch, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top);
                pinch = gap;
            });
            const lift = (evt) => {
                const tap = down && pointers.size === 1 && evt.type === "pointerup" && Math.hypot(evt.clientX - down.x, evt.clientY - down.y) < TAP_PX && performance.now() - down.t < TAP_MS;
                pointers.delete(evt.pointerId); pinch = 0; stage.style.cursor = "grab";
                if (pointers.size === 0) down = null;
                if (tap) close();
            };
            on(stage, "pointerup", lift);
            on(stage, "pointercancel", lift);
            on(root, "keydown", (evt) => {
                const keys = { Escape: close, "+": () => centre(STEP), "=": () => centre(STEP), "-": () => centre(1 / STEP), 0: fit };
                if (keys[evt.key]) { evt.preventDefault(); evt.stopPropagation(); keys[evt.key](); }
            });
            on(window, "resize", fit);
        });
        add(document.body, root);
        fit();
        root.focus();
    }

    // A frame with a small Zoom button; clicking the picture opens the viewer too.
    function zoomable(node, caption, getSource) {
        const box = el("div", { position: "relative" });
        const open = () => openViewer(getSource ? getSource() : node, caption);
        node.style.cursor = "zoom-in";
        on(node, "click", open);
        const zoom = button({ label: "Zoom", ariaLabel: `Zoom ${caption}`, onClick: open });
        Object.assign(zoom.style, { position: "absolute", right: px(SPACE.sm), top: px(SPACE.sm), height: px(26), opacity: "0.92" });
        add(box, node, zoom);
        return box;
    }

    app.ui.zoom = { zoomable, openViewer };
})();
