"""GLB export for the site."""
def export_glb(path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in PRODUCT:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=88, export_apply=True, export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT")

os.makedirs(out_dir, exist_ok=True)
export_glb(os.path.join(out_dir, "tandem.glb"))
print("glb written")
