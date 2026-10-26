// Buttons: solid (key action), ghost (secondary), tab (toggle). Hover, focus and pressed are painted from JS.
(() => {
    const { el, interact, focusRing } = app.dom;
    const { FONT, SPACE, RADIUS, SIZE, px } = app.styles;

    function drawButton(node, palette, flags) {
        const { kind, pressed } = node._cfg;
        const on = kind === "solid" || (kind === "tab" && pressed);
        const base = on ? palette.accent : palette.raised;
        node.style.background = base;
        node.style.color = on ? palette.onAccent : palette.text;
        node.style.borderColor = flags.hover && !on ? palette.muted : on ? palette.accent : palette.line;
        node.style.opacity = flags.press ? "0.8" : "1";
        node.style.outline = focusRing(palette, flags.ring);
        node.setAttribute("aria-pressed", kind === "tab" ? String(pressed) : "false");
        if (kind !== "tab") node.removeAttribute("aria-pressed");
    }

    function button({ label, kind = "ghost", pressed = false, onClick, ariaLabel, grow = false }) {
        const node = el("div", {
            display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", height: px(SIZE.control),
            padding: `0 ${px(SPACE.lg)}`, borderRadius: px(RADIUS.sm), borderWidth: "1px", borderStyle: "solid",
            fontFamily: FONT.sans, fontSize: px(FONT.sm), fontWeight: String(FONT.medium), whiteSpace: "nowrap",
            flexGrow: grow ? "1" : "0", transition: "background .1s, border-color .1s",
        });
        node._cfg = { kind, pressed };
        node.textContent = label;
        const repaint = interact(node, { onActivate: onClick, draw: drawButton, label: ariaLabel });
        node.setPressed = (value) => { node._cfg.pressed = value; repaint(); };
        return node;
    }

    app.ui.button = { button };
})();
