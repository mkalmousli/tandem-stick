// Element-creation helpers plus bookkeeping so listeners and painters never leak.
import { registerPainter } from "./theme.js";

const registry = new Map(); // node -> { listeners, unpaint }

function entryFor(node) {
    let entry = registry.get(node);
    if (!entry) {
        entry = { listeners: [], unpaint: [] };
        registry.set(node, entry);
    }
    return entry;
}

export function el(tag, style = {}, attrs = {}) {
    const node = document.createElement(tag);
    node.style.boxSizing = "border-box";
    Object.assign(node.style, style);
    for (const [name, value] of Object.entries(attrs)) {
        if (name === "text") node.textContent = value;
        else node.setAttribute(name, value);
    }
    return node;
}

export function add(parent, ...kids) {
    kids.forEach((kid) => parent.appendChild(kid));
    return parent;
}

export function on(node, type, fn, opts) {
    node.addEventListener(type, fn, opts);
    entryFor(node).listeners.push([type, fn, opts]);
}

// Registers fn(palette) as a theme painter owned by node.
export function paint(node, fn) {
    entryFor(node).unpaint.push(registerPainter(fn));
}

// Shorthand: { cssProp: paletteKey } painted on every theme change.
export function themed(node, map) {
    paint(node, (p) => {
        for (const [prop, key] of Object.entries(map)) node.style[prop] = p[key];
    });
    return node;
}

export function dispose(node) {
    const nodes = [node, ...node.querySelectorAll("*")];
    nodes.forEach((item) => {
        const entry = registry.get(item);
        if (!entry) return;
        entry.listeners.forEach(([type, fn, opts]) => item.removeEventListener(type, fn, opts));
        entry.unpaint.forEach((unpaint) => unpaint());
        registry.delete(item);
    });
}

export function clear(node) {
    Array.from(node.children).forEach((child) => {
        dispose(child);
        child.remove();
    });
    node.textContent = "";
}
