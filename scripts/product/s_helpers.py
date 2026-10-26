"""Mesh helpers: STL import and the Part box builder."""
class Part:
    """One mesh object assembled from boxes/prisms with per-face materials."""
    def __init__(self, name, location=(0, 0, 0)):
        self.name, self.location = name, Vector(location)
        self.bm = bmesh.new()
        self.slots = []

    def slot(self, mat):
        if mat not in self.slots:
            self.slots.append(mat)
        return self.slots.index(mat)

    def box(self, size, center, mat, bevel=0.0):
        sx, sy, sz = size
        res = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Matrix.Translation(center) @ Matrix.Diagonal((sx, sy, sz, 1)))
        verts = res["verts"]
        faces = {f for v in verts for f in v.link_faces}
        edges = {e for v in verts for e in v.link_edges if all(w in verts for w in e.verts)}
        for f in faces:
            f.material_index = self.slot(mat)
        if bevel:
            bmesh.ops.bevel(self.bm, geom=list(edges), offset=min(bevel, min(sx, sy, sz) / 3), segments=2, affect="EDGES")
        return faces

    def build(self, smooth=True):
        mesh = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mat in self.slots:
            mesh.materials.append(mat)
        obj = bpy.data.objects.new(self.name, mesh)
        obj.location = self.location
        scene.collection.objects.link(obj)
        if smooth:
            for poly in mesh.polygons:
                poly.use_smooth = True
        return obj

PRODUCT = []

def smooth_import(path, name, mat, matrix, flat_tops=False):
    bpy.ops.wm.stl_import(filepath=path)
    obj = bpy.context.selected_objects[0]
    obj.name = name
    obj.data.transform(matrix)
    mesh_bm = bmesh.new()
    mesh_bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(mesh_bm, verts=mesh_bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(mesh_bm, faces=mesh_bm.faces)
    mesh_bm.to_mesh(obj.data)
    mesh_bm.free()
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        # Round the corners but keep big flat faces flat: their long sliver triangles shade black when smoothed.
        poly.use_smooth = abs(poly.normal.z) < 0.9 if flat_tops else True
    obj.data.use_auto_smooth = True
    obj.data.auto_smooth_angle = math.radians(35)
    obj.select_set(False)
    return obj

# Site frame (y up, tray floor at 0) to Blender: (x, y, z) -> (x, -z, y).
tray = smooth_import(os.path.join(ROOT, "mechanical/case-tray.stl"), "case-tray", M["tray"], Matrix.Identity(4), True)
lid = smooth_import(os.path.join(ROOT, "scripts/product/base/case-lid.stl"), "case-lid", M["lid"], Matrix(((1, 0, 0, 0), (0, -1, 0, 0), (0, 0, -1, D["wallTop"] + D["wall"]), (0, 0, 0, 1))))
PRODUCT += [tray, lid]

