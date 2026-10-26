"""Generates stick.kicad_pcb with KiCad's pcbnew API. Run: python3 build_board.py"""
import pcbnew
from pcbnew import FromMM, VECTOR2I, PCB_TRACK, PCB_VIA, ZONE, PAD

HERE = __file__.rsplit("/", 1)[0]
STD = "/usr/share/kicad/footprints/"
F, B = pcbnew.F_Cu, pcbnew.B_Cu

BOARD_W, BOARD_H = 33.0, 17.4          # mm; plug end at x = BOARD_W
CY = BOARD_H / 2
MODULE_AT = (13.3, CY)
TAB_LEN, TAB_W = 13.5, 12.0              # USB-A plug is the board tab itself, pads on the bottom face
TAB_TIP = BOARD_W + TAB_LEN
ANCHOR_X, VIA_X = 30.0, 31.5            # small F.Cu pads where the old connector pins were; vias hop to the tab pads on B.Cu
TAB_PADS = {"1": (-3.5, 1.5), "2": (-1.0, 1.0), "3": (1.0, 1.0), "4": (3.5, 1.5)}   # pin: (dy, width); VBUS, D-, D+, GND
SIGNAL, POWER, VIA_D, VIA_DRILL = 0.2, 0.4, 0.6, 0.3

board = pcbnew.BOARD()
ds = board.GetDesignSettings()
ds.SetCopperLayerCount(4)
ds.SetBoardThickness(FromMM(1.6))
ds.m_MinClearance = FromMM(0.15)
ds.m_CopperEdgeClearance = FromMM(0.3)
ds.GetDefaultZoneSettings if False else None
board.GetAllNetClasses() if False else None
ds.m_NetSettings.m_DefaultNetClass.SetClearance(FromMM(0.15))
ds.m_TrackMinWidth = FromMM(0.15)
ds.m_ViasMinSize = FromMM(0.5)
ds.m_MinThroughDrill = FromMM(0.3)

mm = lambda v: FromMM(v)
pt = lambda x, y: VECTOR2I(mm(x), mm(y))
nets = {}


def net(name):
    if name not in nets:
        item = pcbnew.NETINFO_ITEM(board, name)
        board.Add(item)
        nets[name] = item
    return nets[name]


def place(ref, lib, name, x, y, rot=0, value="", flip=False):
    fp = pcbnew.FootprintLoad(lib, name)
    fp.SetReference(ref)
    fp.SetValue(value or name)
    board.Add(fp)
    fp.SetPosition(pt(x, y))
    if rot:
        fp.SetOrientationDegrees(rot)
    if flip:
        fp.Flip(pt(x, y), False)
    return fp


def assign(fp, mapping):
    for pad in fp.Pads():
        number = pad.GetNumber()
        if number in mapping:
            pad.SetNet(net(mapping[number]))


def padpos(fp, number):
    return next(p for p in fp.Pads() if p.GetNumber() == number).GetPosition()


def track(netname, layer, width, *points):
    for a, b in zip(points, points[1:]):
        t = PCB_TRACK(board)
        t.SetStart(pt(*a)); t.SetEnd(pt(*b)); t.SetWidth(mm(width)); t.SetLayer(layer)
        t.SetNet(net(netname)); board.Add(t)


def via(netname, x, y):
    v = PCB_VIA(board)
    v.SetPosition(pt(x, y)); v.SetWidth(mm(VIA_D)); v.SetDrill(mm(VIA_DRILL))
    v.SetViaType(pcbnew.VIATYPE_THROUGH); v.SetNet(net(netname)); board.Add(v)


def mmpos(p):
    return p if isinstance(p, tuple) else (p.x / 1e6, p.y / 1e6)


IN1, IN2 = pcbnew.In1_Cu, pcbnew.In2_Cu
SOT5 = STD + "Package_TO_SOT_SMD.pretty"
CAP, RES = STD + "Capacitor_SMD.pretty", STD + "Resistor_SMD.pretty"
LOCAL = HERE + "/tandem.pretty"

# ---- parts ----
u1 = place("U1", LOCAL, "ESP32-S3-MINI-1", *MODULE_AT, rot=90, value="ESP32-S3-MINI-1-N4")
j1 = pcbnew.FOOTPRINT(board)
j1.SetReference("J1"); j1.SetValue("USB-A edge plug")
board.Add(j1)


def add_pad(number, x, y, w, h, layers, shape=pcbnew.PAD_SHAPE_RECT):
    pad = pcbnew.PAD(j1)
    pad.SetNumber(number); pad.SetShape(shape); pad.SetAttribute(pcbnew.PAD_ATTRIB_SMD)
    pad.SetSize(pcbnew.VECTOR2I(mm(w), mm(h)))
    ls = pcbnew.LSET()
    [ls.AddLayer(l) for l in layers]
    pad.SetLayerSet(ls)
    j1.Add(pad)
    pad.SetPosition(pt(x, y)); pad.SetPos0(pt(x, y))


for number, (dy, width) in TAB_PADS.items():
    anchor_dy = {"1": -3, "2": -1, "3": 1, "4": 3}[number]
    add_pad(number, ANCHOR_X, CY + anchor_dy, 0.8, 0.8, (pcbnew.F_Cu, pcbnew.F_Mask), pcbnew.PAD_SHAPE_CIRCLE)
    add_pad("T" + number, TAB_TIP - 1.0 - 4.0, CY + dy, 8.0, width, (pcbnew.B_Cu, pcbnew.B_Mask))
u2 = place("U2", SOT5, "SOT-23-5", 24.2, 4.0, rot=180, value="AP2112K-3.3")
d1 = place("D1", STD + "LED_SMD.pretty", "LED_WS2812B-2020_PLCC4_2.0x2.0mm", 24.2, 12.8, value="WS2812B-2020")
c1 = place("C1", CAP, "C_0603_1608Metric", 26.9, 1.8, rot=90, value="10uF")
c2 = place("C2", CAP, "C_0603_1608Metric", 24.2, 6.4, value="10uF")
c4 = place("C4", CAP, "C_0402_1005Metric", 26.3, 12.8, rot=90, value="100nF")
c5 = place("C5", CAP, "C_0402_1005Metric", 22.3, 1.4, value="1uF")
r1 = place("R1", RES, "R_0402_1005Metric", 24.2, 1.4, value="10k")
tp_boot = place("TP1", STD + "TestPoint.pretty", "TestPoint_Pad_D1.0mm", 22.8, 16.6, value="BOOT")
tp_gnd = place("TP2", STD + "TestPoint.pretty", "TestPoint_Pad_D1.0mm", 25.0, 16.6, value="GND")

esp = {str(n): "GND" for n in [1, 2, 42, 43, 61, 62, 63, 64, 65] + list(range(46, 61))}
esp.update({"3": "3V3", "4": "IO0", "23": "USB_DM", "24": "USB_DP", "25": "LED_DIN", "45": "EN"})
assign(u1, esp)
assign(j1, {"1": "VBUS", "2": "USB_DM", "3": "USB_DP", "4": "GND", "T1": "VBUS", "T2": "USB_DM", "T3": "USB_DP", "T4": "GND"})
assign(u2, {"1": "VBUS", "2": "GND", "3": "VBUS", "5": "3V3"})
assign(d1, {"2": "GND", "3": "LED_DIN", "4": "3V3"})
assign(c1, {"1": "VBUS", "2": "GND"})
assign(c2, {"1": "3V3", "2": "GND"})
assign(c4, {"1": "3V3", "2": "GND"})
assign(c5, {"1": "EN", "2": "GND"})
assign(r1, {"1": "3V3", "2": "EN"})
assign(tp_boot, {"1": "IO0"})
assign(tp_gnd, {"1": "GND"})


def drop(netname, pad, x, y, width=0.2):
    """Short stub from a pad to a via placed at (x, y); the via reaches the inner plane."""
    track(netname, F, width, mmpos(pad), (x, y))
    via(netname, x, y)


P = lambda fp, n: padpos(fp, n)
# power
track("VBUS", F, POWER, mmpos(P(u2, "3")), (26.4, 3.05), (26.4, 5.7), (ANCHOR_X, 5.7))
track("VBUS", F, POWER, mmpos(P(u2, "1")), (26.4, 4.95))
drop("GND", P(u2, "2"), 24.2, 4.0, POWER)
drop("GND", P(c1, "2"), 28.0, 1.0)
drop("3V3", P(u2, "5"), 22.2, 4.95, POWER)
track("3V3", F, SIGNAL, mmpos(P(c2, "1")), (22.6, 5.9), (22.2, 4.95))
drop("GND", P(c2, "2"), 24.97, 7.1)
drop("3V3", P(r1, "1"), 23.7, 2.25)
track("GND", F, SIGNAL, mmpos(P(c5, "2")), (22.78, 2.3), (21.6, 2.3))
via("GND", 21.6, 2.3)
track("GND", F, SIGNAL, mmpos(P(u1, "64")), (21.2, 1.7), (21.2, 3.2))
via("GND", 21.2, 3.2)
drop("GND", P(d1, "2"), 23.28, 14.2)
drop("3V3", P(d1, "4"), 25.12, 11.3)
drop("3V3", P(c4, "1"), 26.3, 14.0)
drop("GND", P(c4, "2"), 26.3, 11.6)
drop("GND", P(j1, "4"), VIA_X, 11.7, POWER)
# module power and ground
drop("3V3", P(u1, "3"), 9.05, 14.6, POWER)
for n, x in (("1", 7.35), ("2", 8.2)): drop("GND", P(u1, n), x, 14.6)
for n, x in (("43", 9.05), ("42", 9.9)): drop("GND", P(u1, n), x, 2.8)
track("GND", F, 0.3, (6.3, CY - 5.95), (6.3, CY + 5.95))
for y in (CY - 3.0, CY + 3.0): drop("GND", (6.3, y), 7.4, y, 0.3)
# EN: module pad -> top strip -> RC network
track("EN", F, SIGNAL, mmpos(P(u1, "45")), (7.35, 0.55), (21.82, 0.55), (21.82, 1.4))
track("EN", F, SIGNAL, (21.82, 0.55), (24.71, 0.55), (24.71, 1.4))
# BOOT test pads
track("IO0", F, SIGNAL, mmpos(P(u1, "4")), (9.9, 16.6), (22.8, 16.6))
drop("GND", mmpos(P(tp_gnd, "1")), 26.4, 16.8)
# USB: D+ hops to the bottom layer to swap order with D-
track("USB_DM", F, SIGNAL, mmpos(P(u1, "23")), (25.6, 8.7), (26.4, 7.7), mmpos(P(j1, "2")))
track("USB_DP", F, SIGNAL, mmpos(P(u1, "24")), (25.0, 7.85)); via("USB_DP", 25.0, 7.85)
track("USB_DP", B, SIGNAL, (25.0, 7.85), (26.4, 9.7)); via("USB_DP", 26.4, 9.7)
track("USB_DP", F, SIGNAL, (26.4, 9.7), mmpos(P(j1, "3")))
# LED data crosses the USB lanes on the bottom layer
track("LED_DIN", F, SIGNAL, mmpos(P(u1, "25")), (21.2, 7.0)); via("LED_DIN", 21.2, 7.0)
track("LED_DIN", B, SIGNAL, (21.2, 7.0), (21.2, 15.2), (25.12, 15.2)); via("LED_DIN", 25.12, 15.2)
track("LED_DIN", F, SIGNAL, (25.12, 15.2), mmpos(P(d1, "3")))

# ---- USB tab: F anchor -> via -> B track -> tab pad ----
B = pcbnew.B_Cu
TAB_PAD_X = TAB_TIP - 5.0 - 4.0
for number, net_name in (("1", "VBUS"), ("2", "USB_DM"), ("3", "USB_DP")):
    ay = CY + {"1": -3, "2": -1, "3": 1}[number]
    ty = CY + TAB_PADS[number][0]
    track(net_name, F, SIGNAL, (ANCHOR_X, ay), (VIA_X, ay))
    via(net_name, VIA_X, ay)
    track(net_name, B, SIGNAL, (VIA_X, ay), (VIA_X + 2.0, ay), (VIA_X + 3.0, ty), (TAB_PAD_X, ty))
track("GND", B, POWER, (TAB_PAD_X, CY + 3.5), (BOARD_W - 1.0, CY + 3.5))

# ---- outline, planes, keepout ----
def line(layer, a, b):
    seg = pcbnew.PCB_SHAPE(board)
    seg.SetShape(pcbnew.SHAPE_T_SEGMENT); seg.SetLayer(layer); seg.SetWidth(mm(0.1))
    seg.SetStart(pt(*a)); seg.SetEnd(pt(*b)); board.Add(seg)

c = 0.5   # tab tip chamfer
corners = [(0, 0), (BOARD_W, 0), (BOARD_W, CY - TAB_W / 2), (TAB_TIP - c, CY - TAB_W / 2), (TAB_TIP, CY - TAB_W / 2 + c),
           (TAB_TIP, CY + TAB_W / 2 - c), (TAB_TIP - c, CY + TAB_W / 2), (BOARD_W, CY + TAB_W / 2), (BOARD_W, BOARD_H), (0, BOARD_H)]
for a, b in zip(corners, corners[1:] + corners[:1]):
    line(pcbnew.Edge_Cuts, a, b)


def zone(netname, layer, outline, keepout=False):
    z = ZONE(board)
    z.SetLayer(layer)
    if keepout:
        z.SetIsRuleArea(True)
        z.SetDoNotAllowCopperPour(True); z.SetDoNotAllowTracks(True); z.SetDoNotAllowVias(True)
        z.SetDoNotAllowPads(False); z.SetDoNotAllowFootprints(False)
        ls = pcbnew.LSET(); [ls.AddLayer(l) for l in (F, IN1, IN2, B)]
        z.SetLayerSet(ls)
    else:
        z.SetNet(net(netname))
        z.SetMinThickness(mm(0.2))
        z.SetLocalClearance(mm(0.2))
        z.SetPadConnection(pcbnew.ZONE_CONNECTION_FULL)
    ring = pcbnew.SHAPE_LINE_CHAIN()
    for x, y in outline:
        ring.Append(pt(x, y))
    ring.SetClosed(True)
    z.Outline().AddOutline(ring)
    board.Add(z)
    return z


full = [(0.2, 0.2), (BOARD_W - 0.2, 0.2), (BOARD_W - 0.2, BOARD_H - 0.2), (0.2, BOARD_H - 0.2)]
zone("GND", F, full); zone("GND", IN1, full); zone("3V3", IN2, full); zone("GND", B, full)
zone("", F, [(0, 0), (5.9, 0), (5.9, BOARD_H), (0, BOARD_H)], keepout=True)   # antenna: no copper on any layer


# Silkscreen: drop the library clutter, keep two clean labels on the back (reads correctly from behind).
SILK = (F_SILK, B_SILK) = (pcbnew.F_SilkS, pcbnew.B_SilkS)
for fp in board.GetFootprints():
    fp.Reference().SetVisible(False)
    fp.Value().SetVisible(False)
    for item in list(fp.GraphicalItems()):
        if item.GetLayer() in SILK:
            fp.Remove(item)


def label(text, x, y, layer, size=1.0):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetLayer(layer)
    t.SetPosition(pt(x, y))
    t.SetTextSize(pcbnew.VECTOR2I(mm(size), mm(size)))
    t.SetTextThickness(mm(0.15))
    t.SetMirrored(layer == B_SILK)
    board.Add(t)


label("TANDEM", 16.5, 8.7, B_SILK, 1.6)
label("TP1 BOOT  TP2 GND", 16.5, 14.5, B_SILK, 0.9)

board.Save(HERE + "/stick.kicad_pcb")
print("saved")
