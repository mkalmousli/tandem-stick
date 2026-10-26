#!/usr/bin/env bash
# Rebuilds the 3D model the site renders live: PCB textures from KiCad, then web/assets/models/tandem.glb from Blender.
# Needs: blender, kicad-cli, inkscape, python3 with Pillow, node.  Run: npm run product
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
work="${WORK:-$(mktemp -d)}"
export PATH=/usr/bin:/bin:$PATH   # Blender's glTF exporter needs the system Python, not a venv one
mkdir -p "$work/tex"
for layer in F.Cu B.Cu In1.Cu In2.Cu F.Mask B.Mask F.Silkscreen B.Silkscreen Edge.Cuts; do
  kicad-cli pcb export svg -o "$work/tex/$layer.svg" -l "$layer$([ "$layer" = Edge.Cuts ] || echo ,Edge.Cuts)" --black-and-white --exclude-drawing-sheet --page-size-mode 2 "$root/hardware/stick.kicad_pcb" >/dev/null
done
node "$here/dump-data.mjs" > "$work/tex/data.json"
mkdir -p "$root/web/assets/models"
blender -b -P "$here/scene.py" -- "$work/tex" "$root/web/assets/models" >/dev/null
echo "tandem.glb ready"
