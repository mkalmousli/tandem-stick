// Entry point: loads only what the first screen needs, then fetches the rest on demand (no modules, no bundler).
window.app = { scene: {}, ui: {}, pages: {}, ex: {}, story: {}, files: {}, assets: {} };

const GROUPS = {
    base: [
        "js/core/styles.js", "js/core/theme.js", "js/core/state.js", "js/core/dom.js", "js/core/router.js",
        "js/data/product.js", "js/data/content.js",
        "js/ui/text.js", "js/ui/button.js", "js/ui/layout.js", "js/ui/card.js", "js/ui/copy.js", "js/ui/table.js", "js/ui/svg.js", "js/ui/review.js", "js/ui/download.js", "js/ui/zoom.js", "js/ui/live3d.js",
        "js/ui/wordmark.js", "js/ui/header.js", "js/ui/notice.js", "js/ui/page.js", "js/explorer/state.js",
        "js/pages/homeui.js", "js/pages/homefaq.js", "js/pages/homehero.js", "js/ui/sections.js", "js/pages/features.js", "js/pages/stories.js", "js/pages/software.js", "js/pages/home.js", "js/pages/downloads.js", "js/app.js",
    ],
    three: [
        "vendor/three.js", "js/scene/glbparse.js", "js/scene/glb.js", "js/scene/studio.js", "js/scene/materials.js", "js/scene/ports.js", "js/scene/enclosure.js",
        "js/scene/board.js", "js/scene/flow.js", "js/scene/fleet.js", "js/scene/blendermodel.js", "js/scene/stick.js", "js/scene/model.js", "js/scene/orbit.js", "js/scene/showcase.js", "js/scene/mini.js", "js/scene/miniscenes.js", "js/scene/inputscenes.js",
    ],
    files: ["js/files/gerber.js", "js/files/common.js", "js/files/stl.js", "js/files/board.js", "js/files/sheet.js", "js/files/tables.js", "js/files/bundle.js", "js/files/layers.js", "js/files/list.js", "js/files/thumbs.js", "js/files/preview.js"],
    explore: ["js/explorer/guide.js", "js/explorer/filecards.js", "js/explorer/relatedfiles.js", "js/explorer/files.js", "js/explorer/actions.js", "js/explorer/viewer.js", "js/explorer/buildart.js", "js/explorer/buildsteps.js", "js/explorer/build.js", "js/explorer/panel.js", "js/explorer/link.js", "js/pages/explore.js"],
};
const DEPS = { files: ["three"], explore: ["three", "files"] };
const loading = new Map();
const count = { total: 0, done: 0 };

function paint() {
    const bar = document.getElementById("bar");
    if (!bar) return;
    bar.style.width = `${count.total ? (100 * count.done) / count.total : 0}%`;
    bar.style.opacity = count.done >= count.total ? "0" : "1";
}

// Counts any promise (a script, the 3D model) toward the progress bar.
app.track = (promise) => {
    count.total += 1;
    paint();
    const step = () => { count.done += 1; paint(); };
    promise.then(step, step);
    return promise;
};

function script(src) {
    return app.track(new Promise((resolve, reject) => {
        const tag = document.createElement("script");
        tag.src = src;
        tag.async = false; // downloads in parallel, runs in insertion order
        tag.onload = resolve;
        tag.onerror = () => reject(new Error(src));
        document.head.appendChild(tag);
    }));
}

function fetchGroup(name) {
    if (!loading.has(name)) {
        const deps = (DEPS[name] || []).map(fetchGroup);
        loading.set(name, Promise.all([...deps, ...GROUPS[name].map(script)]));
    }
    return loading.get(name);
}

app.need = (...names) => Promise.all(names.map(fetchGroup));
fetchGroup("base").then(() => app.start());
