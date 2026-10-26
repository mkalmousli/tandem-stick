// Assembles dist/: the static site, the downloadable files, zip bundles and a checksum manifest.
// Run: node scripts/build-site.mjs   (needs the `zip` command for bundles)
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");
const files = join(dist, "files");

rmSync(dist, { recursive: true, force: true });
cpSync(join(root, "web"), dist, { recursive: true });

const copy = (from, to = from) => { mkdirSync(join(files, to, ".."), { recursive: true }); cpSync(join(root, from), join(files, to), { recursive: true }); };
["hardware/fab", "hardware/renders", "hardware/tandem.pretty", "hardware/stick.kicad_pcb", "hardware/stick.kicad_pro", "hardware/build_board.py", "hardware/drc.py", "mechanical/case-tray.stl", "mechanical/case-lid.stl"].forEach((p) => copy(p));

const bundle = (name, paths) => {
    mkdirSync(join(files, "bundles"), { recursive: true });
    execFileSync("zip", ["-qr", "-X", join(files, "bundles", name), ...paths], { cwd: files });
};
bundle("tandem-gerbers.zip", ["hardware/fab/gerbers"]);
bundle("tandem-assembly.zip", ["hardware/fab/bom.csv", "hardware/fab/pos.csv"]);
bundle("tandem-case-stl.zip", ["mechanical"]);
bundle("tandem-kicad-project.zip", ["hardware/stick.kicad_pcb", "hardware/stick.kicad_pro", "hardware/tandem.pretty", "hardware/build_board.py", "hardware/drc.py"]);

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const manifest = walk(files).sort().map((f) => {
    const data = readFileSync(f);
    return { path: relative(files, f), bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
});
writeFileSync(join(files, "manifest.json"), JSON.stringify({ generated: new Date().toISOString(), files: manifest }, null, 1));
writeFileSync(join(dist, ".nojekyll"), "");
console.log(`dist/ ready: ${manifest.length} files`);
