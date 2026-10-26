// The files that make the product: curated entries plus whatever the published manifest adds, grouped for the Files tab.
(() => {
    const { kindOf, load, BASE } = app.files.common;

    const FILES = [
        { id: "board", name: "PCB (Gerbers)", kind: "board", note: "11 layers, rendered from the real fab files", get: [["Gerbers + drill (zip)", "bundles/tandem-gerbers.zip"]] },
        { id: "tray", name: "Case tray", kind: "stl", path: "mechanical/case-tray.stl", note: "Print this one first" },
        { id: "lid", name: "Case lid", kind: "stl", path: "mechanical/case-lid.stl", note: "Snaps on the tray" },
        { id: "bom", name: "BOM", kind: "csv", path: "hardware/fab/bom.csv", note: "Parts list for assembly" },
        { id: "pos", name: "Placement", kind: "csv", path: "hardware/fab/pos.csv", note: "Pick-and-place positions in mm" },
        { id: "kicad", name: "KiCad board", kind: "text", path: "hardware/stick.kicad_pcb", note: "Open in KiCad 7 or newer", get: [["KiCad project (zip)", "bundles/tandem-kicad-project.zip"]] },
        { id: "gen", name: "Board generator", kind: "text", path: "hardware/build_board.py", note: "Python script that writes the KiCad board" },
        { id: "drc", name: "DRC runner", kind: "text", path: "hardware/drc.py", note: "Checks the board against fab rules" },
        { id: "fw", name: "Firmware", kind: "later", note: "Not written yet. It will appear here as a .bin you can flash." },
    ];
    const BUNDLES = {
        "bundles/tandem-gerbers.zip": ["Fab bundle", "Order the bare board: upload this zip to a PCB maker. Gerbers and drill files."],
        "bundles/tandem-assembly.zip": ["Assembly bundle", "Have parts soldered for you: BOM and placement files for an assembly service."],
        "bundles/tandem-case-stl.zip": ["Case bundle", "Print the case: tray and lid as STL, ready to slice."],
        "bundles/tandem-layers-3d.zip": ["Layer STLs", "Every copper, mask and silkscreen layer as an STL, for 3D tools."],
        "bundles/tandem-kicad-project.zip": ["KiCad project", "Edit the design: board, footprint and the scripts that make it."],
    };

    // Only what you need to build the product. Pictures, the manifest and fab job metadata stay out of the way.
    const HIDDEN = /(^manifest\.json$|^hardware\/renders\/|\.gbrjob$|\.(png|jpe?g|gif|webp|svg)$)/i;
    const GROUPS = [["Case", ["stl"]], ["Board", ["board", "layer", "drill"]], ["Layer STLs", []], ["Assembly", ["csv"]], ["KiCad and code", ["text"]], ["Bundles", ["zip"]], ["Firmware", ["later"]]];
    const shortName = (item) => (item.kind === "layer" || item.kind === "drill" ? item.name.replace(/^stick-/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ") : item.name);
    const sizes = new Map();

    async function listFiles() {
        const { files } = JSON.parse(await load("manifest.json"));
        files.forEach((file) => sizes.set(file.path, file.bytes));
        const known = new Set(FILES.map((file) => file.path).filter(Boolean));
        const extra = files.filter((file) => !known.has(file.path) && !HIDDEN.test(file.path)).map((file) => {
            const bundle = BUNDLES[file.path];
            const layer = /^hardware\/3d\//.test(file.path);
            const name = bundle ? bundle[0] : layer ? file.path.split("/").pop().replace(/\.stl$/, "").replace(/_/g, " ") : file.path.split("/").pop();
            return { id: file.path, name, kind: kindOf(file.path), path: file.path, group: layer ? "Layer STLs" : null, note: layer ? "This board layer as a 3D object (STL)" : bundle ? bundle[1] : file.path.split("/").slice(0, -1).join("/"), extra: true };
        });
        return FILES.concat(extra);
    }

    const downloadsOf = (file) => [...(file.path ? [[file.path.split("/").pop(), BASE + file.path]] : []), ...(file.get || []).map(([text, href]) => [text, BASE + href])];

    // The dialog also opens from plain links elsewhere (parts panel, downloads page): describe a path the same way.
    function describe(href) {
        const path = href.replace(/^files\//, "");
        const curated = FILES.find((file) => file.path === path);
        const bundle = BUNDLES[path];
        return curated || { id: path, name: bundle ? bundle[0] : path.split("/").pop(), kind: kindOf(path), path, note: bundle ? bundle[1] : "" };
    }

    app.files.list = { FILES, GROUPS, sizes, listFiles, describe, downloadsOf, shortName };
})();
