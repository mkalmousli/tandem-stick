"""Blender scene for the finished Tandem Stick: builds case, board and parts and exports tandem.glb for the site's 3D views.

Run: blender -b -P scene.py -- <textures dir (with data.json)> <out dir>
Units: 1 Blender unit = 1 mm. Axes: x right, y = -z of the site's three.js scene, z up.
The steps share one namespace, so they run in order inside this script's globals.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
for step in ("setup", "materials", "helpers", "board", "plug", "flat", "layers", "mark", "export"):
    path = os.path.join(HERE, f"s_{step}.py")
    exec(compile(open(path).read(), path, "exec"))
