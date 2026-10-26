// Shared header, footer and theme for every page.
export const REPO = "https://github.com/mkalmousli/tandem-stick";
const KEY = "tandem-theme";
const PAGES = [["index.html", "How it works"], ["explore.html", "Explore 3D"], ["docs.html", "Design docs"], ["plan.html", "Plan"], ["downloads.html", "Downloads"]];

function storedTheme() {
    try { const t = localStorage.getItem(KEY); if (t === "dark" || t === "light") return t; } catch (err) { /* storage blocked */ }
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme, save) {
    document.documentElement.dataset.theme = theme;
    if (save) { try { localStorage.setItem(KEY, theme); } catch (err) { /* ignore */ } }
    window.dispatchEvent(new CustomEvent("tandem:theme", { detail: theme }));
}

// Runs before first paint when imported from <head>, so there is no theme flash.
document.documentElement.dataset.theme = storedTheme();

const here = location.pathname.split("/").pop() || "index.html";

function build() {
    if (!document.querySelector("link[rel=icon]")) { const l = document.createElement("link"); l.rel = "icon"; l.href = "assets/logo.svg"; document.head.append(l); }
    const header = document.createElement("header");
    header.className = "site";
    header.innerHTML = `<div class="wrap"><a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="28" height="28">Tandem Stick<small>DIY · untested</small></a>
        <nav aria-label="Main">${PAGES.map(([href, name]) => `<a href="${href}"${href === here ? ' aria-current="page"' : ""}>${name}</a>`).join("")}
        <a href="${REPO}">GitHub</a></nav>
        <button class="btn small" id="theme" type="button" aria-label="Toggle dark mode"></button></div>`;
    const warn = document.createElement("div");
    warn.className = "untested";
    warn.innerHTML = "<b>Untested.</b> A DIY design: no board has been built or checked on real hardware yet, and the firmware is not released.";
    document.body.prepend(header, warn);
    const skip = Object.assign(document.createElement("a"), { className: "skip", href: "#main", textContent: "Skip to content" });
    document.body.prepend(skip);
    const toggle = header.querySelector("#theme");
    const paint = () => { toggle.textContent = document.documentElement.dataset.theme === "dark" ? "Dark" : "Light"; };
    toggle.addEventListener("click", () => { setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true); paint(); });
    paint();
    if (!document.body.classList.contains("explorer")) {
        const footer = document.createElement("footer");
        footer.className = "site";
        footer.innerHTML = `<div class="wrap"><span>Tandem Stick · open hardware DIY design by <a href="https://github.com/mkalmousli">mkalmousli</a></span>
            <span><a href="${REPO}">Source</a> · <a href="${REPO}/issues">Issues</a> · MIT licence</span></div>`;
        document.body.append(footer);
    }
}
document.addEventListener("DOMContentLoaded", build);

// Fast, smooth navigation: warm up every page on idle and on hover, and cross-fade between pages.
const warm = new Set();
function prefetch(href) {
    if (warm.has(href)) return;
    warm.add(href);
    const l = document.createElement("link");
    l.rel = "prefetch"; l.href = href; document.head.append(l);
    if (href.endsWith("explore.html")) { const m = document.createElement("link"); m.rel = "modulepreload"; m.href = "explorer/src/app.js"; document.head.append(m); }
}
addEventListener("load", () => (window.requestIdleCallback || setTimeout)(() => PAGES.forEach(([href]) => href !== here && prefetch(href))));
document.addEventListener("pointerover", (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (a && a.origin === location.origin) prefetch(a.getAttribute("href")); }, { passive: true });
