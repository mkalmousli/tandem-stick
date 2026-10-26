// What the target screens show: small canvas drawings of real-looking apps. They have their own look, independent of the site theme.
(() => {
    const W = 640;
    const H = 400;
    const BAR = 34;
    const PAD = 24;
    const MS = 1000;
    const CARET_MS = 500;
    const C = {
        ink: "#1d1d20", paper: "#f4f4f2", dim: "#8a8a92", line: "#d5d5d8", dark: "#101114", bar: "#e6e6e9", term: "#0e1512", green: "#4ade80",
        accent: "#2f6df6", warn: "#ffb224", red: "#ff5f57", yellow: "#febc2e", ok: "#28c840", wall: "#243b55", wall2: "#0f2027",
    };
    const FONT_UI = "15px -apple-system, Segoe UI, Roboto, sans-serif";
    const FONT_MONO = "16px ui-monospace, Menlo, Consolas, monospace";
    const OS_CHROME = { Windows: "right", macOS: "left", Linux: "center" };

    const clamp01 = (value) => Math.min(1, Math.max(0, value));

    function newModel() {
        return { typed: "", slide: 0, page: 0, run: null };
    }

    // Applies one visitor action (or the scripted demo) to a screen's model.
    function applyAction(model, action, now) {
        if (action.kind === "text") model.typed += action.text;
        if (action.kind === "erase") model.typed = model.typed.slice(0, -1);
        if (action.kind === "step") model[action.key] = (model[action.key] + 1) % action.mod;
        if (action.kind === "run") model.run = { start: now, seconds: action.seconds };
    }

    function runProgress(model, now) {
        return model.run ? clamp01((now - model.run.start) / (model.run.seconds * MS)) : 0;
    }

    const fill = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    const text = (ctx, str, x, y, color, font, align = "left") => {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = align;
        ctx.fillText(str, x, y);
    };

    // Title bar in the style of each operating system.
    function chrome(ctx, title, os, color) {
        fill(ctx, color, 0, 0, W, BAR);
        const style = OS_CHROME[os] || "center";
        if (style === "left") [C.red, C.yellow, C.ok].forEach((dot, idx) => { ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(20 + idx * 20, BAR / 2, 6, 0, Math.PI * 2); ctx.fill(); });
        if (style === "right") ["–", "☐", "✕"].forEach((mark, idx) => text(ctx, mark, W - 60 + idx * 22, 23, C.ink, FONT_UI, "center"));
        text(ctx, title, style === "right" ? 14 : W / 2, 23, C.ink, FONT_UI, style === "right" ? "left" : "center");
    }

    function wrap(ctx, str, maxWidth) {
        const out = [];
        str.split("\n").forEach((line) => {
            let cur = "";
            Array.from(line).forEach((ch) => {
                if (ctx.measureText(cur + ch).width > maxWidth) { out.push(cur); cur = ch; } else cur += ch;
            });
            out.push(cur);
        });
        return out;
    }

    const caret = (now) => (Math.floor(now / CARET_MS) % 2 ? "▌" : " ");

    function drawDesktop(ctx, name) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, C.wall);
        grad.addColorStop(1, C.wall2);
        fill(ctx, grad, 0, 0, W, H);
        fill(ctx, "#00000066", 0, H - 36, W, 36);
        text(ctx, name, W / 2, H / 2, "#ffffffcc", "26px -apple-system, Segoe UI, sans-serif", "center");
        text(ctx, "Waiting for input", W / 2, H / 2 + 28, "#ffffff77", FONT_UI, "center");
    }

    function drawSlides(ctx, scenario, model) {
        fill(ctx, C.dark, 0, 0, W, H);
        const [title, ...bullets] = scenario.slides[model.slide];
        fill(ctx, C.warn, 0, 0, 10, H);
        text(ctx, title, 60, 120, "#ffffff", "bold 44px -apple-system, Segoe UI, sans-serif");
        bullets.forEach((line, idx) => text(ctx, `•  ${line}`, 64, 190 + idx * 44, "#c9c9d0", "24px -apple-system, Segoe UI, sans-serif"));
        text(ctx, `${model.slide + 1} / ${scenario.slides.length}`, W - PAD, H - PAD, C.dim, FONT_UI, "right");
    }

    function drawTerminal(ctx, label, model, now) {
        fill(ctx, C.term, 0, 0, W, H);
        chrome(ctx, `${label} — bash`, "Linux", C.bar);
        const lines = [`${label} ready.`, ""];
        const shown = wrap(ctx, `$ ${model.typed}`, W - 2 * PAD);
        shown.forEach((line) => lines.push(line));
        const prog = runProgress(model, now);
        let y = BAR + PAD + 8;
        lines.forEach((line) => { text(ctx, line, PAD, y, C.green, FONT_MONO); y += 24; });
        if (model.run) {
            const done = prog >= 1;
            const cells = 24;
            const bar = `[${"#".repeat(Math.round(prog * cells)).padEnd(cells, ".")}] ${Math.round(prog * 100)}%`;
            text(ctx, done ? "3 packages updated. Done." : "Updating packages...", PAD, y, C.green, FONT_MONO);
            text(ctx, bar, PAD, y + 24, done ? C.green : C.warn, FONT_MONO);
        } else {
            text(ctx, caret(now), PAD + ctx.measureText(`$ ${model.typed.split("\n").pop()}`).width, y - 24, C.green, FONT_MONO);
        }
    }

    function drawBrowser(ctx, scenario, model) {
        fill(ctx, C.paper, 0, 0, W, H);
        fill(ctx, C.bar, 0, 0, W, 70);
        const [url, headline, sub] = scenario.pages[model.page];
        fill(ctx, "#ffffff", 70, 36, W - 100, 26);
        text(ctx, url, 82, 54, C.ink, FONT_UI);
        text(ctx, "‹  ›  ⟳", 18, 54, C.dim, FONT_UI);
        fill(ctx, C.accent, 0, 70, W, 150);
        text(ctx, headline, W / 2, 160, "#ffffff", "bold 42px -apple-system, Segoe UI, sans-serif", "center");
        text(ctx, sub, W / 2, 200, "#ffffffcc", "22px -apple-system, Segoe UI, sans-serif", "center");
        [0, 1, 2].forEach((idx) => fill(ctx, "#ffffff", PAD + idx * 200, 250, 180, 110));
    }

    function drawEditor(ctx, label, model, now) {
        fill(ctx, C.paper, 0, 0, W, H);
        chrome(ctx, `Untitled — Notes`, label, C.bar);
        const lines = wrap(ctx, model.typed + caret(now), W - 2 * PAD - 30);
        lines.slice(-12).forEach((line, idx) => {
            text(ctx, String(idx + 1), PAD + 16, BAR + 36 + idx * 26, C.dim, FONT_MONO, "right");
            text(ctx, line, PAD + 30, BAR + 36 + idx * 26, C.ink, FONT_MONO);
        });
        text(ctx, label, W - PAD, H - 14, C.dim, FONT_UI, "right");
    }

    function drawSheet(ctx, model) {
        fill(ctx, "#ffffff", 0, 0, W, H);
        chrome(ctx, "Budget — Sheet", "Linux", C.bar);
        const cols = ["", "Item", "Amount"];
        const rows = ["Rent", "Supplies", "Travel"];
        const values = model.typed.split("\t");
        const colW = [50, 280, 160];
        const top = BAR + PAD;
        cols.forEach((name, idx) => {
            const x = PAD + colW.slice(0, idx).reduce((sum, w) => sum + w, 0);
            fill(ctx, C.bar, x, top, colW[idx], 28);
            text(ctx, idx ? String.fromCharCode(64 + idx) : "", x + colW[idx] / 2, top + 20, C.ink, FONT_UI, "center");
        });
        rows.concat(["Total"]).forEach((name, ridx) => {
            const y = top + 28 + ridx * 34;
            const value = ridx < rows.length ? values[ridx] : String(values.reduce((sum, item) => sum + (Number(item) || 0), 0));
            [String(ridx + 1), name, value || ""].forEach((cell, cidx) => {
                const x = PAD + colW.slice(0, cidx).reduce((sum, w) => sum + w, 0);
                ctx.strokeStyle = C.line;
                ctx.strokeRect(x, y, colW[cidx], 34);
                text(ctx, cell, cidx === 2 ? x + colW[cidx] - 10 : x + 10, y + 23, ridx === rows.length && cidx ? C.accent : C.ink, FONT_UI, cidx === 2 ? "right" : "left");
            });
        });
    }

    // The host laptop: a small controller window that shows what you are sending.
    function drawHost(ctx, scenario, model, count) {
        fill(ctx, C.paper, 0, 0, W, H);
        chrome(ctx, "Tandem controller", "macOS", C.bar);
        text(ctx, scenario.hostDoes, PAD, BAR + 50, C.ink, FONT_UI);
        text(ctx, `Sending to ${count} stick${count === 1 ? "" : "s"}`, PAD, BAR + 90, C.accent, "bold 20px -apple-system, Segoe UI, sans-serif");
        scenario.actions.forEach((action, idx) => {
            const x = PAD + idx * 170;
            fill(ctx, C.accent, x, BAR + 130, 156, 44);
            text(ctx, action.label, x + 78, BAR + 158, "#ffffff", FONT_UI, "center");
        });
        if (model.typed) text(ctx, `Last input: ${model.typed.slice(-28).replace(/\n/g, "↵").replace(/\t/g, "⇥")}`, PAD, H - PAD, C.dim, FONT_UI);
    }

    // One call draws the right app for the scenario; `live` is false before the stick is plugged in.
    function drawScreen(ctx, scenario, label, model, now, live) {
        ctx.save();
        if (!live) drawDesktop(ctx, label);
        else if (scenario.app === "slides") drawSlides(ctx, scenario, model);
        else if (scenario.app === "terminal") drawTerminal(ctx, label, model, now);
        else if (scenario.app === "browser") drawBrowser(ctx, scenario, model);
        else if (scenario.app === "editor") drawEditor(ctx, label, model, now);
        else drawSheet(ctx, model);
        ctx.restore();
    }

    function createScreen() {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        return { canvas, ctx: canvas.getContext("2d") };
    }

    app.story.screens = { W, H, newModel, applyAction, createScreen, drawScreen, drawHost };
})();
