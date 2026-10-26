"""USB-A plug."""
stem = D["w"] / 2 - W / 2
plug = Part("p-plug", (D["w"] / 2, 0, D["plugY"]))
pw, ph, sw = D["plugW"], D["plugH"], 0.3
length = stem + D["plugOut"]
x0 = -stem
for sy, sz, cy, cz in ((pw, sw, 0, ph / 2 - sw / 2), (pw, sw, 0, -ph / 2 + sw / 2), (sw, ph - 2 * sw, pw / 2 - sw / 2, 0), (sw, ph - 2 * sw, -pw / 2 + sw / 2, 0)):
    plug.box((length, sy, sz), (x0 + length / 2, cy, cz), M["metal"], 0.03)
t_len, t_h, t_w, recess, drop = 8.5, 1.9, 10.4, 1.0, 0.5
t_z = -ph / 2 + sw + drop + t_h / 2
t_x = D["plugOut"] - recess - t_len / 2
plug.box((t_len, t_w, t_h), (t_x, 0, t_z), M["chip"])
for i in range(4):
    plug.box((6.5, 1.2, 0.04), (t_x + (t_len - 6.5) / 2 - 1.8 + recess, (i - 1.5) * 2.4, t_z + t_h / 2 + 0.02), M["metal"])
plug_obj = plug.build(smooth=False)
PARTS.append(plug_obj)
PRODUCT += PARTS

