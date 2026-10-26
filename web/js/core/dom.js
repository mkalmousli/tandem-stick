// Element helpers: creation, tracked listeners, theme painting, interaction states, disposable scopes.
(() => {
    const { state, subscribe, pal } = app.state;
    const { SIZE } = app.styles;

    const painters = new Set(); // every themed element; applyTheme() is the only thing that walks it
    let activeScope = null;

    // ---- scopes: everything registered while a scope is active is released by dispose() ----
    function createScope() {
        const cleanups = [];
        return {
            cleanups,
            dispose() { cleanups.splice(0).reverse().forEach((fn) => fn()); },
        };
    }

    function track(fn) {
        if (activeScope) activeScope.cleanups.push(fn);
    }

    function withScope(scope, build) {
        const previous = activeScope;
        activeScope = scope;
        try { return build(); } finally { activeScope = previous; }
    }

    // A container whose content can be rebuilt; the old content's listeners and painters are released first.
    function region(container) {
        let scope = null;
        const release = () => { if (scope) scope.dispose(); scope = null; };
        track(release);
        return {
            render(build) {
                release();
                container.replaceChildren();
                scope = createScope();
                withScope(scope, build);
            },
        };
    }

    // ---- creation ----
    function setAttrs(node, attrs) {
        Object.keys(attrs || {}).forEach((key) => node.setAttribute(key, attrs[key]));
    }

    function el(tag, style, attrs) {
        const node = document.createElement(tag);
        Object.assign(node.style, style || {});
        setAttrs(node, attrs);
        return node;
    }

    function svgEl(tag, attrs, style) {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
        setAttrs(node, attrs);
        Object.assign(node.style, style || {});
        return node;
    }

    function add(parent, ...children) {
        children.flat(Infinity).forEach((child) => {
            if (child === null || child === undefined || child === false) return;
            parent.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
        });
        return parent;
    }

    // ---- listeners ----
    function on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        const off = () => target.removeEventListener(type, handler, options);
        track(off);
        return off;
    }

    // ---- theme ----
    // map: { cssProperty: paletteKey | (palette) => value }
    function paint(node, draw) {
        const entry = { node, draw };
        painters.add(entry);
        draw(node, pal());
        track(() => painters.delete(entry));
        return () => draw(node, pal());
    }

    function themed(node, map) {
        return paint(node, (target, palette) => {
            Object.keys(map).forEach((prop) => {
                const rule = map[prop];
                target.style[prop] = typeof rule === "function" ? rule(palette) : palette[rule];
            });
        });
    }

    function applyTheme() {
        document.documentElement.style.colorScheme = state.theme;
        const palette = pal();
        painters.forEach((entry) => entry.draw(entry.node, palette));
    }

    // ---- viewport ----
    function watchViewport(fn) {
        fn(state.viewport);
        track(subscribe((patch) => { if ("viewport" in patch) fn(state.viewport); }));
    }

    // ---- interaction: hover, focus and press tracked in JS, painted by one function ----
    const modality = { keyboard: false };
    window.addEventListener("keydown", () => { modality.keyboard = true; }, true);
    window.addEventListener("pointerdown", () => { modality.keyboard = false; }, true);

    function interact(node, { onActivate, draw, role = "button", label, native = false }) {
        const flags = { hover: false, focus: false, press: false };
        const repaint = () => draw(node, pal(), { ...flags, ring: flags.focus && modality.keyboard });
        if (!native) node.tabIndex = 0; // anchors and inputs are already focusable
        node.style.cursor = "pointer";
        node.style.outline = "none";
        node.style.webkitTapHighlightColor = "transparent";
        node.style.userSelect = "none";
        if (role && !native) node.setAttribute("role", role);
        if (label) node.setAttribute("aria-label", label);
        const flag = (name, value) => () => { flags[name] = value; repaint(); };
        on(node, "pointerenter", flag("hover", true));
        on(node, "pointerleave", () => { flags.hover = false; flags.press = false; repaint(); });
        on(node, "pointerdown", flag("press", true));
        on(node, "pointerup", flag("press", false));
        on(node, "focus", flag("focus", true));
        on(node, "blur", flag("focus", false));
        on(node, "click", (evt) => onActivate(evt));
        if (!native) {
            on(node, "keydown", (evt) => {
                if (evt.key !== "Enter" && evt.key !== " ") return;
                evt.preventDefault();
                onActivate(evt);
            });
        }
        paint(node, repaint);
        return repaint;
    }

    const focusRing = (palette, ring) => (ring ? `2px solid ${palette.accent}` : "none");

    app.dom = { createScope, withScope, region, track, el, svgEl, add, on, paint, themed, applyTheme, watchViewport, interact, focusRing, SIZE };
})();
