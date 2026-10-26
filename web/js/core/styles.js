// Layout, type and motion constants. Colours live in theme.js.
(() => {
    const FONT = {
        sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        xs: 11, sm: 12, md: 14, lg: 17, xl: 22, hero: 34,
        regular: 400, medium: 500, bold: 700,
    };
    const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 };
    const RADIUS = { sm: 4, md: 8, pill: 999 };
    const SIZE = { header: 52, notice: 30, content: 1040, panel: 380, control: 34, icon: 28, stageRatio: 0.58, tocWidth: 180 };
    const BREAKPOINT = { phone: 640, tablet: 960 };
    const MOTION = { flyMs: 700, fadeMs: 140, hoverMs: 100 };
    const px = (value) => `${Math.round(value)}px`;

    app.styles = { FONT, SPACE, RADIUS, SIZE, BREAKPOINT, MOTION, px };
})();
