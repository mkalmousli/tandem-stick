// Small reusable controls and text blocks. Every control owns its hover/focus/pressed painting.
import { el, add, on, paint, themed } from "./dom.js";
import { FONT, RADIUS, SPACE, LAYOUT, pal } from "./theme.js";

export const px = (value) => `${value}px`;

const NO_TAP = "transparent";

export function label(str, { size = FONT.md, tone = "text", weight = 400, mono = false } = {}) {
    const node = el("div", {
        fontSize: px(size), fontWeight: String(weight), lineHeight: "1.45",
        fontFamily: mono ? FONT.mono : FONT.family,
    }, { text: str });
    return themed(node, { color: tone });
}

export function stack(gap = SPACE.md, style = {}) {
    return el("div", { display: "flex", flexDirection: "column", gap: px(gap), ...style });
}

export function wrapRow(gap = SPACE.sm, style = {}) {
    return el("div", { display: "flex", flexWrap: "wrap", gap: px(gap), alignItems: "center", ...style });
}

export function card(...kids) {
    const node = el("div", {
        borderWidth: "1px", borderStyle: "solid", borderRadius: px(RADIUS.md),
        padding: px(SPACE.lg), display: "flex", flexDirection: "column", gap: px(SPACE.sm),
    });
    themed(node, { background: "surface", borderColor: "line" });
    return add(node, ...kids);
}

export function section(title, ...kids) {
    const box = stack(SPACE.sm);
    add(box, label(title.toUpperCase(), { size: FONT.xs, tone: "muted", weight: 600 }), ...kids);
    return box;
}

export function kvList(rows) {
    const box = stack(SPACE.xs);
    rows.forEach(([key, value]) => {
        const row = el("div", { display: "flex", justifyContent: "space-between", gap: px(SPACE.lg) });
        const keyEl = label(key, { size: FONT.sm, tone: "muted" });
        const valEl = label(String(value), { size: FONT.sm });
        valEl.style.textAlign = "right";
        add(row, keyEl, valEl);
        add(box, row);
    });
    return box;
}

// kind: "default" (accent when pressed), "tab" (same, flex-grows) or "row" (list entry, accent border when pressed)
export function button({ label: text, onClick, kind = "default", pressed, ariaLabel, grow = false }) {
    const isRow = kind === "row";
    const node = el("button", {
        height: px(LAYOUT.control), padding: `0 ${px(SPACE.md)}`, borderRadius: px(RADIUS.sm),
        borderWidth: "1px", borderStyle: "solid", fontSize: px(FONT.md), fontFamily: FONT.family,
        cursor: "pointer", textAlign: isRow ? "left" : "center", width: isRow ? "100%" : "auto",
        flexGrow: grow ? "1" : "0", outlineOffset: "2px", webkitTapHighlightColor: NO_TAP,
        display: "flex", alignItems: "center", justifyContent: isRow ? "space-between" : "center", gap: px(SPACE.sm),
    }, { type: "button", text });
    if (ariaLabel) node.setAttribute("aria-label", ariaLabel);
    const flags = { hover: false, focus: false, pressed: !!pressed };
    if (pressed !== undefined) node.setAttribute("aria-pressed", String(!!pressed));

    const draw = (p) => {
        const lit = flags.pressed && !isRow;
        node.style.background = lit ? p.accent : (flags.hover ? p.line : (isRow ? "transparent" : p.raised));
        node.style.color = lit ? p.onAccent : p.text;
        node.style.borderColor = flags.pressed ? p.accent : (isRow ? "transparent" : p.line);
        node.style.outline = flags.focus ? `2px solid ${p.accent}` : "none";
    };
    const set = (key, value) => () => { flags[key] = value; draw(pal()); };
    paint(node, draw);
    on(node, "pointerenter", set("hover", true));
    on(node, "pointerleave", set("hover", false));
    on(node, "focus", set("focus", true));
    on(node, "blur", set("focus", false));
    on(node, "click", () => onClick && onClick());
    node.setPressed = (value) => {
        flags.pressed = value;
        node.setAttribute("aria-pressed", String(value));
        draw(pal());
    };
    return node;
}

export function slider({ min, max, step, value, onInput, ariaLabel }) {
    const input = el("input", {
        width: "100%", margin: "0", height: px(LAYOUT.control), cursor: "pointer",
        borderRadius: px(RADIUS.sm), outlineOffset: "2px", webkitTapHighlightColor: NO_TAP,
    }, { type: "range", min, max, step, value, "aria-label": ariaLabel });
    const flags = { focus: false };
    const draw = (p) => {
        input.style.accentColor = p.accent;
        input.style.outline = flags.focus ? `2px solid ${p.accent}` : "none";
    };
    const set = (value2) => () => { flags.focus = value2; draw(pal()); };
    paint(input, draw);
    on(input, "focus", set(true));
    on(input, "blur", set(false));
    on(input, "input", () => onInput(Number(input.value)));
    return input;
}
