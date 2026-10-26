"""PCB, chips, passives and the imported case."""
W, DEP, T = D["pcbW"], D["pcbD"], D["pcbT"]
PCB_Z = D["pcbY"]
board = Part("pcb", (0, 0, PCB_Z))
board.slot(M["pcb"]); board.slot(M["pcb_edge"])
res = bmesh.ops.create_cube(board.bm, size=1.0, matrix=Matrix.Diagonal((W, DEP, T, 1)))
for f in board.bm.faces:
    f.material_index = 0 if abs(f.normal.z) > 0.5 else 1

def surface(side_up):
    return T / 2 if side_up else -T / 2

def chip_origin(item, back=False):
    x, z = item["pos"]
    return (x, -z, PCB_Z + (-T / 2 if back else T / 2))

PARTS = []
for item in data["chips"]:
    part = Part(item["id"], chip_origin(item))
    sx, sz, h = item["size"]
    if item["look"] == "module":
        base_h, ant, inset = 0.8, 6.2, 0.4
        part.box((sx, sz, base_h), (0, 0, base_h / 2), M["chip"], 0.05)
        can_len, can_h = sx - ant, h - base_h
        part.box((can_len, sz - 2 * inset, can_h), (ant / 2, 0, base_h + can_h / 2), M["metal"], 0.12)
        reach, pitch = sz / 2 - 1.5, 1.1
        for bar in range(5):
            x = -sx / 2 + pitch + bar * pitch
            part.box((0.3, 2 * reach, 0.04), (x, 0, base_h + 0.02), M["metal"])
            if bar < 4:
                end = reach if bar % 2 == 0 else -reach
                part.box((pitch, 0.3, 0.04), (x + pitch / 2, end, base_h + 0.02), M["metal"])
    elif item["look"] == "ic":
        part.box((sx, sz, h), (0, 0, h / 2), M["chip"], 0.08)
        for side, row in enumerate(item.get("legs") or []):
            for z in row:
                x = (-1 if side == 0 else 1) * (sx / 2 + 0.25)
                part.box((0.5, 0.4, 0.15), (x, -z, 0.175), M["metal"])
    else:
        part.box((sx, sz, h), (0, 0, h / 2), M["led"], 0.06)
        part.box((1.1, 1.1, 0.04), (0, 0, h + 0.02), M["flow"])
    PARTS.append(part.build())

for item in data["passives"]:
    sx, sz, h = item["size"]
    sign = -1 if item.get("back") else 1
    part = Part(item["id"], chip_origin(item, bool(item.get("back"))))
    part.box((sx, sz, h), (0, 0, sign * h / 2), M["cap"], 0.04)
    long_x = sx >= sz
    cap = (0.2, sz + 0.02, h + 0.02) if long_x else (sx + 0.02, 0.2, h + 0.02)
    for end in (-1, 1):
        off = (end * (sx / 2 - 0.1), 0) if long_x else (0, end * (sz / 2 - 0.1))
        part.box(cap, (off[0], off[1], sign * h / 2), M["metal"], 0.03)
    PARTS.append(part.build())
board_obj = board.build()
board_obj.location = (0, 0, PCB_Z)
PARTS.append(board_obj)

