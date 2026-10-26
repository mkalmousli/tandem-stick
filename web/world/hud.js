// DOM overlay for the world: intro, station list, info card, minimap, joystick, fade.
const el = (tag, cls, html = "") => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };

export function createHud(stations, { fly, open, enter }) {
    const css = (c) => "#" + c.toString(16).padStart(6, "0");
    const root = document.body;
    const intro = el("div", "hud intro", `<div><img src="assets/logo.svg" alt=""><h1>Tandem Stick</h1><p>One stick per machine, one host to command them all. Walk the world to explore the product, plan, tests and downloads.</p><button>Enter the world</button><small>WASD or drag to move and look · <a href="overview.html">text version</a></small></div>`);
    intro.querySelector("button").onclick = enter;
    const list = el("div", "hud stations");
    stations.forEach((s) => { const b = el("button", "", `<kbd>${s.key}</kbd>${s.name}`); b.style.setProperty("--c", css(s.color)); b.onclick = () => fly(s.id); b.dataset.id = s.id; list.append(b); });
    const info = el("div", "hud info", `<div class="sub"></div><h2></h2><p></p><button class="card-open">Open page →</button>`);
    const hint = el("div", "hud hint", "WASD move · Shift run · R/F up/down · drag look · 1-4 fly · walk into a portal or press Enter to open");
    const map = el("canvas", "hud map"); map.width = map.height = 280;
    const pad = el("div", "hud pad", "<i></i>");
    const fade = el("div", "hud fade");
    const nogl = el("div", "hud nogl", `<div><h1>3D needs WebGL</h1>${stations.map((s) => `<a href="${s.href}">${s.name}</a>`).join("")}</div>`);
    root.append(intro, list, info, hint, map, pad, fade, nogl);

    let current = null, nearId = null;
    const show = (id) => {
        current = id; list.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
        const s = stations.find((x) => x.id === id);
        info.classList.toggle("on", !!s); if (!s) return;
        info.style.setProperty("--c", css(s.color));
        info.querySelector(".sub").textContent = s.sub; info.querySelector("h2").textContent = s.name; info.querySelector("p").textContent = s.blurb;
        info.querySelector("button").onclick = () => open(id);
    };

    let padCb = () => {}; const knob = pad.firstChild;
    const move = (e) => { const r = pad.getBoundingClientRect(), dx = e.clientX - r.left - 55, dy = e.clientY - r.top - 55, m = Math.min(1, Math.hypot(dx, dy) / 45), a = Math.atan2(dy, dx); const x = Math.cos(a) * m, y = Math.sin(a) * m; knob.style.transform = `translate(${x * 33}px,${y * 33}px)`; padCb(x, y); };
    pad.addEventListener("pointerdown", (e) => { pad.setPointerCapture(e.pointerId); move(e); pad.onpointermove = move; });
    pad.addEventListener("pointerup", () => { pad.onpointermove = null; knob.style.transform = ""; padCb(0, 0); });

    const g = map.getContext("2d"), S = 140 / 280; // world radius 175 → 140px in canvas coords
    return {
        show, onPad: (cb) => { padCb = cb; }, fade: (on) => fade.classList.toggle("on", on),
        play() { intro.classList.add("gone"); document.body.classList.add("playing"); setTimeout(() => intro.remove(), 900); },
        near(id) { if (id === nearId) return; nearId = id; if (id && current !== id) show(id); },
        get current() { return current; },
        fail() { nogl.classList.add("on"); },
        map(cam, yaw, fleet, landmarks) {
            const k = 125 / 175, cx = 140, cy = 140; g.clearRect(0, 0, 280, 280);
            g.save(); g.translate(cx, cy); g.rotate(yaw);
            g.fillStyle = "rgba(143,180,255,.55)"; fleet.forEach((p) => g.fillRect((p.x - cam.x) * k - 2, (p.z - cam.z) * k - 2, 4, 4));
            Object.values(landmarks).forEach((l) => { g.fillStyle = css(l.st.color); g.beginPath(); g.arc((l.st.pos[0] - cam.x) * k, (l.st.pos[2] - cam.z) * k, 7, 0, 7); g.fill(); });
            g.restore();
            g.fillStyle = "#fff"; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx - 6, cy + 6); g.lineTo(cx + 6, cy + 6); g.fill();
        },
    };
}
