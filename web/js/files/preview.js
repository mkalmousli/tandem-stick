// Previews for the Files tab and the review dialog: the real file contents.
(() => {
    const { add, region } = app.dom;
    const { SPACE } = app.styles;
    const { stack, row } = app.ui.layout;
    const { load, note, frame, kindOf, sizeText, BASE } = app.files.common;
    const { button } = app.ui.button;
    const { stlView } = app.files.stl;
    const { boardView, loadBoard } = app.files.board;
    const { csvView, textView, zipView, binaryView, imageView } = app.files.tables;
    const { layerView, drillView } = app.files.layers;

    const RENDER = {
        layer: async (file) => layerView(file),
        drill: async (file) => drillView(file),
        zip: async (file) => app.files.bundle.bundleView(await load(file.path, true)),
        image: async (file) => imageView(file),
        board: async () => boardView(await loadBoard()),
        stl: async (file) => { const flat = app.files.thumbs.gerberOf(file); return flat ? layerView(flat) : stlView(await load(file.path, true), file.path); },
        csv: async (file) => csvView(await load(file.path)),
        text: async (file) => {
            const buf = await load(file.path, true);
            const sample = new Uint8Array(buf, 0, Math.min(buf.byteLength, 2048));
            return sample.includes(0) ? binaryView(file, buf) : [...textView(new TextDecoder().decode(buf))];
        },
        later: async (file) => [note(file.note)],
    };

    // The dialog shows what is really inside the file. The board file and its generator also get a picture of the board.
    const BOARD_TAB = ["hardware/stick.kicad_pcb", "hardware/build_board.py"];
    function preview(file) {
        const holder = stack(SPACE.sm);
        const view = region(holder);
        const show = (builder) => {
            view.render(() => add(holder, note("Loading preview…")));
            builder(file).then((nodes) => view.render(() => add(holder, nodes))).catch(() => {
                view.render(() => add(holder, note("Preview needs the published site (the files are added at build time). Use the download button instead.")));
            });
        };
        const choices = BOARD_TAB.includes(file.path) ? [[file.path.endsWith(".py") ? "Board it makes" : "Board", RENDER.board], ["Source", RENDER.text]] : [[null, RENDER[file.kind]]];
        show(choices[0][1]);
        if (choices.length < 2) return holder;
        const tabs = row(SPACE.xs);
        const buttons = choices.map(([title, builder], idx) => button({ label: title, kind: "tab", pressed: idx === 0, onClick: () => { buttons.forEach((other, at) => other.setPressed(at === idx)); show(builder); } }));
        add(tabs, buttons);
        return add(stack(SPACE.sm), tabs, holder);
    }

    app.files.preview = { preview, thumbOf: (file) => app.files.thumbs.thumbOf(file, RENDER), kindOf, sizeText, load, BASE };
})();
