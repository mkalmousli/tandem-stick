// Entry point: loads every script in order (no modules, no bundler), then starts the app.
window.app = { scene: {}, ui: {}, pages: {}, ex: {}, story: {}, files: {} };

const SCRIPTS = [
    "vendor/three.js",
    "js/core/styles.js", "js/core/theme.js", "js/core/state.js", "js/core/dom.js", "js/core/router.js",
    "js/data/product.js", "js/data/content.js", "js/data/scenarios.js",
    "js/ui/text.js", "js/ui/button.js", "js/ui/layout.js", "js/ui/card.js", "js/ui/table.js", "js/ui/svg.js", "js/ui/download.js", "js/ui/zoom.js", "js/ui/copy.js",
    "js/ui/header.js", "js/ui/notice.js", "js/ui/page.js",
    "js/explorer/state.js",
    "js/scene/studio.js", "js/scene/materials.js", "js/scene/ports.js", "js/scene/enclosure.js", "js/scene/board.js", "js/scene/flow.js", "js/scene/fleet.js", "js/scene/model.js", "js/scene/orbit.js",
    "js/files/gerber.js", "js/explorer/guide.js", "js/explorer/files.js", "js/explorer/actions.js", "js/explorer/viewer.js", "js/explorer/build.js", "js/explorer/panel.js", "js/explorer/link.js",
    "js/story/screens.js", "js/story/stage.js", "js/story/steps.js", "js/story/player.js",
    "js/pages/scrolldemo.js", "js/pages/home.js", "js/pages/explore.js", "js/pages/downloads.js",
    "js/app.js",
];

function loadScripts(list, done) {
    let pending = list.length;
    list.forEach((src) => {
        const tag = document.createElement("script");
        tag.src = src;
        tag.async = false; // downloads in parallel, runs in list order
        tag.onload = () => { pending -= 1; if (pending === 0) done(); };
        document.head.appendChild(tag);
    });
}

loadScripts(SCRIPTS, () => window.app.start());
