"""The logo mark, raised on the lid: the word TANDEM, small and spaced out, in our own letters. Joined into the lid mesh."""
M["mark"] = principled("mark", "#2a1a00", 0.5)
TOP = D["wallTop"] + D["wall"]

def raised(name, mat, verts, height):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    face = [(x, y, TOP - 0.02) for x, y in verts]
    mesh.from_pydata(face, [], [list(range(len(face)))])
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("up", "SOLIDIFY")
    mod.thickness = height
    mod.offset = 1
    mesh.materials.append(mat)
    obj.data.update()
    return obj

# The name in our own angular letters, small and spaced out on the yellow lid.
exec(open(os.path.join(HERE, "glyphs.py")).read())
parts = []

def stroke(name, a, b, width):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = (dx * dx + dy * dy) ** 0.5
    ux, uy = dx / length * width / 2, dy / length * width / 2
    p, q = (a[0] - ux, a[1] - uy), (b[0] + ux, b[1] + uy)
    nx, ny = -uy, ux
    return raised(name, M["mark"], [(p[0] - nx, p[1] - ny), (q[0] - nx, q[1] - ny), (q[0] + nx, q[1] + ny), (p[0] + nx, p[1] + ny)], 0.5)

def word(text, x0, y0, sx, sy, pitch, width):
    for at, letter in enumerate(text):
        for k, (a, b) in enumerate(GLYPHS[letter]):
            pt = lambda v: (x0 + at * pitch + v[0] * sx, y0 + v[1] * sy)
            parts.append(stroke(f"{text}{at}{k}", pt(a), pt(b), width))

word("TANDEM", -11.9, -2.4, 0.9, 1.2, 4.4, 0.7)
bpy.ops.object.select_all(action="DESELECT")
for obj in parts + [lid]:
    obj.select_set(True)
    if obj is not lid:
        bpy.context.view_layer.objects.active = obj
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active = lid
bpy.ops.object.join()

# The printable lid is the lid exactly as shown, logo included, logo side up with the lip on the bed.
bpy.ops.object.select_all(action="DESELECT")
blank = lid.copy()
blank.data = lid.data.copy()
bpy.context.collection.objects.link(blank)
blank.data.transform(Matrix.Translation((0, 0, -(TOP - 2.0))))
blank.select_set(True)
bpy.context.view_layer.objects.active = blank
bpy.ops.export_mesh.stl(filepath=os.path.join(ROOT, "mechanical", "case-lid.stl"), use_selection=True)
bpy.data.objects.remove(blank)
