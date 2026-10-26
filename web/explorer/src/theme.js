// All colors and layout constants live here. One accent hue, everything else is grey.
import { state } from "./state.js";

export const ACCENT = { dark: "#5b9bff", light: "#2563eb" };

const SCENE_DARK = {
    bg: "#1d212b", tray: "#c9ccd3", lid: "#3f74d6", pcb: "#0e0e10",
    chip: "#0a0a0c", led: "#f2f2f4", cap: "#b8a070", metal: "#a4a8b0", hole: "#0a0a0b", trace: "#6a7080",
    shadow: 0.55, env: 0.85,
};

const SCENE_LIGHT = {
    bg: "#d6dbe4", tray: "#dcdee3", lid: "#3f74d6", pcb: "#26262b",
    chip: "#0c0c0e", led: "#f2f2f4", cap: "#b8a070", metal: "#9ea2aa", hole: "#0a0a0b", trace: "#5a5a62",
    shadow: 0.3, env: 0.85,
};

export const PALETTE = {
    dark: {
        bg: "#0b0b0c", surface: "#131315", raised: "#1b1b1e", line: "#2a2a2e",
        text: "#f4f4f5", muted: "#92929a", accent: ACCENT.dark, onAccent: "#06101f", scene: SCENE_DARK,
    },
    light: {
        bg: "#f3f3f4", surface: "#ffffff", raised: "#ececee", line: "#d8d8dc",
        text: "#111113", muted: "#62626a", accent: ACCENT.light, onAccent: "#ffffff", scene: SCENE_LIGHT,
    },
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const RADIUS = { sm: 6, md: 10, pill: 999 };
export const FONT = {
    family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    xs: 11, sm: 12, md: 14, lg: 17, xl: 22,
};
export const LAYOUT = { topbar: 0, panelWidth: 400, breakpoint: 860, narrowViewerShare: 0.5, control: 34 };
export const MOTION = { flyMs: 700, hoverMs: 120 };

export const pal = () => PALETTE[state.theme];

// Painters re-apply theme colors; applyTheme() is the only place that walks them.
const painters = new Set();

export function registerPainter(fn) {
    painters.add(fn);
    fn(pal());
    return () => painters.delete(fn);
}

export function applyTheme() {
    const palette = pal();
    painters.forEach((fn) => fn(palette));
}
