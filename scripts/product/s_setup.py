"""Blender setup: arguments, data, a clean scene."""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix
tex_dir, out_dir = sys.argv[sys.argv.index("--") + 1:][:2]

data = json.load(open(os.path.join(tex_dir, "data.json")))

D = data["DIM"]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.scale_length = 0.001


