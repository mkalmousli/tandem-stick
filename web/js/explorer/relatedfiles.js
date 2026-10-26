// The files that belong to a part or a build step, as preview cards right where they are mentioned.
(() => {
    const { add } = app.dom;
    const { SPACE } = app.styles;
    const { stack } = app.ui.layout;
    const { describe } = app.files.list;
    const { fileCard } = app.ex.fileCard;

    // pairs: [[text, "files/path"]]. Each distinct file becomes one card.
    function relatedFiles(pairs) {
        const box = stack(SPACE.sm);
        const seen = new Set();
        pairs.forEach(([, href]) => { if (!seen.has(href)) { seen.add(href); add(box, fileCard(describe(href))); } });
        return box;
    }

    app.ex.relatedFiles = { relatedFiles };
})();
