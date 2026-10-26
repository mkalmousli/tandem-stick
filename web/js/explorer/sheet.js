// Phone layout: the panel is a bottom sheet over the 3D view. One tap on the handle opens or closes it; dragging resizes it to any height.
(() => {
    const { el, add, on, themed } = app.dom;
    const { SPACE, RADIUS, px } = app.styles;

    const HANDLE = 26;
    const PEEK = 128;
    const HALF = 0.5;
    const FULL = 0.9;
    const EASE = "transform .28s cubic-bezier(.2,.8,.2,1)";

    function createSheet(panel, onSettle) {
        let active = false, height = 0, shown = PEEK, lastOpen = 0, drag = null;
        const handle = el("div", { display: "flex", justifyContent: "center", alignItems: "center", height: px(HANDLE), margin: `-${px(SPACE.sm)} 0 -${px(SPACE.xs)}`, flexShrink: "0", touchAction: "none", cursor: "grab" });
        const grab = el("div", { width: px(44), height: px(5), borderRadius: px(3) });
        themed(grab, { background: "line" });
        add(handle, grab);

        const place = (value, animate) => {
            panel.style.transition = animate ? EASE : "none";
            panel.style.transform = `translate3d(0, ${height - value}px, 0)`;
        };
        // `visible` is how many pixels of the sheet show above the bottom edge.
        const go = (visible, animate = true) => {
            shown = Math.min(height, Math.max(PEEK, Math.round(visible)));
            if (shown > PEEK) lastOpen = shown;
            place(shown, animate);
            panel.bodyNode.style.paddingBottom = px(height - shown); // everything stays reachable by scrolling
            onSettle(shown);
        };
        const release = () => {
            if (!drag) return;
            const moved = drag.moved;
            drag = null;
            go(moved ? shown : shown > PEEK ? PEEK : lastOpen);
        };

        on(handle, "pointerdown", (e) => { handle.setPointerCapture(e.pointerId); drag = { y: e.clientY, from: shown, moved: false }; });
        on(handle, "pointermove", (e) => {
            if (!drag) return;
            drag.moved = drag.moved || Math.abs(e.clientY - drag.y) > 4;
            if (!drag.moved) return;
            shown = Math.min(height, Math.max(PEEK, drag.from - (e.clientY - drag.y)));
            place(shown, false);
        });
        // Touching a peeking sheet opens it; the touch still reaches whatever was under it.
        panel.addEventListener("pointerdown", (e) => { if (active && shown === PEEK && !handle.contains(e.target)) go(lastOpen); }, true);
        on(handle, "pointerup", release);
        on(handle, "pointercancel", release);

        return {
            attach() {
                active = true;
                if (handle.parentNode !== panel) panel.insertBefore(handle, panel.firstChild);
                Object.assign(panel.style, { left: "0px", bottom: "0px", borderRadius: `${px(RADIUS.md * 2)} ${px(RADIUS.md * 2)} 0 0`, willChange: "transform" });
            },
            detach() {
                active = false;
                if (handle.parentNode === panel) handle.remove();
                Object.assign(panel.style, { left: "auto", bottom: "auto", transform: "none", transition: "none", borderRadius: px(RADIUS.md), willChange: "auto" });
                panel.bodyNode.style.paddingBottom = "0px";
            },
            open(full) { if (active && full) go(height); else if (active && shown === PEEK) go(lastOpen); }, // `full` asks for the whole height
            layout(stageH) {
                height = Math.round(stageH * FULL);
                if (!lastOpen) shown = Math.round(stageH * HALF); // first layout starts half open
                lastOpen = Math.min(lastOpen || shown, height);
                panel.style.height = px(height);
                go(shown, false);
            },
        };
    }

    app.ex.sheet = { createSheet };
})();
