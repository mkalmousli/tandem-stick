"""Materials."""
def principled(name, color, rough=0.5, metal=0.0, **extra):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes["Principled BSDF"]
    node.inputs["Base Color"].default_value = (*hex_rgb(color), 1)
    node.inputs["Roughness"].default_value = rough
    node.inputs["Metallic"].default_value = metal
    for key, value in extra.items():
        node.inputs[key.replace("_", " ")].default_value = value
    return mat

def hex_rgb(value):
    value = value.lstrip("#")
    lin = lambda c: ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92
    return tuple(lin(int(value[i:i + 2], 16) / 255) for i in (0, 2, 4))

M = {
    "tray": principled("tray", "#f0a010", 0.55),
    "lid": principled("lid", "#ffc43a", 0.32, Coat_Weight=0.5, Coat_Roughness=0.2),
    "pcb": principled("pcb", "#134d38", 0.42, Coat_Weight=0.2, Coat_Roughness=0.3),
    "pcb_edge": principled("pcb_edge", "#c9b77a", 0.7),
    "copper": principled("copper", "#1f7a55", 0.4),
    "gold": principled("gold", "#e6b24e", 0.28, 1.0),
    "silk": principled("silk", "#f2efe4", 0.6),
    "chip": principled("chip", "#0a0a0c", 0.35, Coat_Weight=0.3),
    "led": principled("led", "#f2f2f4", 0.4),
    "cap": principled("cap", "#b8a070", 0.5),
    "metal": principled("metal", "#c9ccd2", 0.22, 1.0),
    "flow": principled("flow", "#ffb224", 0.3, Emission_Strength=0.6),
}
M["flow"].node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (*hex_rgb("#ffb224"), 1)

