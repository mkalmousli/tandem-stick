"""PCB layers as real geometry: KiCad's vector layer plots (SVG) become extruded copper, mask openings and silkscreen.
Each layer is also written as its own STL (hardware/3d) so every layer can be downloaded and printed or inspected as a 3D object."""
import re
SVG_TAG = re.compile(r"<(/?)(g|path|circle)\b([^>]*)>", re.S)
STACK = {"F.Cu": (1, 0.0, 0.035), "F.Mask": (1, 0.0, 0.05), "F.Silkscreen": (1, 0.035, 0.03),
         "B.Cu": (-1, 0.0, 0.035), "B.Mask": (-1, 0.0, 0.05), "B.Silkscreen": (-1, 0.035, 0.03),
         "In1.Cu": (1, -0.53, 0.035), "In2.Cu": (1, -1.07, 0.035)}
HALF_T = D["pcbT"] / 2

def style_of(attrs, inherited):
    now = dict(inherited)
    text = re.search(r'style="([^"]*)"', attrs, re.S)
    if text:
        for key, value in re.findall(r"([\w-]+)\s*:\s*([^;]+);?", text.group(1)):
            now[key] = value.strip()
    return now

def read_svg(path):
    """-> [(kind, data, stroke width)] with kind 'poly' (list of loops), 'disc' ((x, y, r)) or 'line' (points)."""
    out, stack = [], [{}]
    for close, tag, attrs in SVG_TAG.findall(open(path).read()):
        if tag == "g":
            stack.pop() if close else stack.append(style_of(attrs, stack[-1]))
            continue
        style = style_of(attrs, stack[-1])
        fill, width = float(style.get("fill-opacity", 0)) > 0, float(style.get("stroke-width", 0))
        if tag == "circle":
            x, y, r = (float(re.search(k + r'="([^"]*)"', attrs).group(1)) for k in ("cx", "cy", "r"))
            out.append(("disc", (x, y, r + width / 2), 0))
            continue
        loops = []
        for sub in re.findall(r"M[^M]*", re.search(r'\bd="([^"]*)"', attrs, re.S).group(1)):
            pts = [tuple(map(float, p)) for p in re.findall(r"(-?[\d.]+)[ ,]+(-?[\d.]+)", sub)]
            if len(pts) > 1:
                loops.append((pts, "Z" in sub))
        if fill:
            out.append(("poly", [pts for pts, _ in loops], 0))
        if width > 0.05:
            out += [("line", pts + (pts[:1] if closed else []), width) for pts, closed in loops]
    return out

def layer_object(name, shapes, origin, z0, height, mat):
    flat = Flat(origin)
    for kind, data_, width in shapes:
        {"poly": flat.poly, "disc": lambda d: flat.disc(*d), "line": lambda d: flat.line(d, width)}[kind](data_)
    flat.solid(height)
    mesh = bpy.data.meshes.new(name)
    flat.bm.to_mesh(mesh)
    flat.bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (0, 0, z0)
    scene.collection.objects.link(obj)
    return obj

def export_stl(obj, name):
    path = os.path.join(ROOT, "hardware", "3d", name + ".stl")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_mesh.stl(filepath=path, use_selection=True)

edge = [pt for kind, d, w in read_svg(os.path.join(tex_dir, "Edge.Cuts.svg")) if kind == "line" for pt in d]
origin = (min(p[0] for p in edge), min(p[1] for p in edge))
layer_objs = []
for name, (sign, rise, height) in STACK.items():
    svg = os.path.join(tex_dir, name + ".svg")
    if not os.path.exists(svg):
        continue
    kind = name.split(".")[1]
    mat = M["copper"] if kind == "Cu" else M["gold"] if kind == "Mask" else M["silk"]
    obj = layer_object(name.replace(".", "_"), read_svg(svg), origin, sign * (HALF_T + rise), sign * height, mat)
    export_stl(obj, name.replace(".", "_"))
    if name.startswith("In"):
        bpy.data.objects.remove(obj)
    else:
        layer_objs.append(obj)

# The finished board gets its layers as real geometry, in the same mesh as the substrate.
for obj in layer_objs:
    obj.location.z += PCB_Z
bpy.ops.object.select_all(action="DESELECT")
for obj in layer_objs + [board_obj]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = board_obj
bpy.ops.object.join()
