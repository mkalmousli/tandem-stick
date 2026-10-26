"""Flat 2D shapes (board frame, mm) collected into one mesh and extruded."""
class Flat:
    """Collects flat 2D shapes (board frame, mm) and extrudes them into one mesh."""
    def __init__(self, origin):
        self.bm, self.ox, self.oy = bmesh.new(), origin[0], origin[1]

    def pt(self, x, y):
        return Vector((x - self.ox - W / 2, DEP / 2 - (y - self.oy), 0))

    def face(self, points):
        verts = [self.bm.verts.new(p) for p in points]
        try:
            self.bm.faces.new(verts)
        except ValueError:
            pass

    def disc(self, x, y, r):
        bmesh.ops.create_circle(self.bm, cap_ends=True, radius=r, segments=14, matrix=Matrix.Translation(self.pt(x, y)))

    def line(self, pts, width):
        half = width / 2
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            dx, dy = x1 - x0, y1 - y0
            n = math.hypot(dx, dy) or 1
            ox, oy = -dy / n * half, dx / n * half
            self.face([self.pt(x0 + ox, y0 + oy), self.pt(x1 + ox, y1 + oy), self.pt(x1 - ox, y1 - oy), self.pt(x0 - ox, y0 - oy)])
        for x, y in pts[:: max(1, len(pts) - 1)]:
            self.disc(x, y, half)

    def poly(self, loops):
        curve = bpy.data.curves.new("p", "CURVE")
        curve.dimensions, curve.fill_mode = "2D", "BOTH"
        for loop in loops:
            spline = curve.splines.new("POLY")
            spline.points.add(len(loop) - 1)
            for point, (x, y) in zip(spline.points, loop):
                point.co = (*self.pt(x, y), 1)
            spline.use_cyclic_u = True
        obj = bpy.data.objects.new("p", curve)
        scene.collection.objects.link(obj)
        mesh = bpy.data.meshes.new_from_object(obj)
        self.bm.from_mesh(mesh)
        bpy.data.objects.remove(obj)
        bpy.data.curves.remove(curve)
        bpy.data.meshes.remove(mesh)

    def solid(self, height):
        """Extrude every flat face by `height` (negative goes down) and cut away what lies beyond the board body."""
        cut = bmesh.ops.bisect_plane(self.bm, geom=self.bm.verts[:] + self.bm.edges[:] + self.bm.faces[:], plane_co=(W / 2, 0, 0), plane_no=(1, 0, 0), clear_outer=True)
        faces = self.bm.faces[:]
        res = bmesh.ops.extrude_face_region(self.bm, geom=faces)
        bmesh.ops.translate(self.bm, verts=[v for v in res["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, height))
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)

