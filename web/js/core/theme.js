// Colour palettes: shades of black and white plus one accent. The only place colours are written down.
(() => {
    const SCENE_DARK = {
        tray: "#dcdee3", lid: "#d99a1e", pcb: "#14532d", chip: "#0a0a0c", led: "#f2f2f4", cap: "#b8a070",
        metal: "#a4a8b0", hole: "#0a0a0b", trace: "#d9b45a", shadow: 0.55, env: 0.85,
        glow: ["#26262c", "#0c0c0e"],
    };
    const SCENE_LIGHT = {
        tray: "#dcdee3", lid: "#d99a1e", pcb: "#14532d", chip: "#0c0c0e", led: "#f2f2f4", cap: "#b8a070",
        metal: "#9ea2aa", hole: "#0a0a0b", trace: "#d9b45a", shadow: 0.3, env: 0.85,
        glow: ["#ffffff", "#dcdce0"],
    };

    const PALETTE = {
        dark: {
            bg: "#0c0c0d", surface: "#141416", raised: "#1d1d20", line: "#2c2c31", text: "#f3f3f4", muted: "#9a9aa2",
            accent: "#ffb224", onAccent: "#1a1204", shade: "rgba(0, 0, 0, 0.55)", scene: SCENE_DARK,
        },
        light: {
            bg: "#f4f4f5", surface: "#ffffff", raised: "#ebebed", line: "#d6d6da", text: "#111113", muted: "#5f5f67",
            accent: "#b45f06", onAccent: "#ffffff", shade: "rgba(255, 255, 255, 0.6)", scene: SCENE_LIGHT,
        },
    };

    const THEME_KEY = "tandem-theme";
    const MODES = ["dark", "light"];

    function savedTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            if (MODES.includes(saved)) return saved;
        } catch (err) {
            // storage blocked: fall back to the system preference
        }
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    function saveTheme(mode) {
        try { localStorage.setItem(THEME_KEY, mode); } catch (err) { /* preference just will not persist */ }
    }

    app.theme = { PALETTE, MODES, savedTheme, saveTheme };
})();
