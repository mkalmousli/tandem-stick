// Product definition: dimensions, ports, silicon, cost model. Rename here to rebrand.

// Real part sizes and printing rules. Every case dimension below is derived from these.
// Board numbers match hardware/build_board.py. The Würth 692112030100 plug sits on the board top, 15.35 mm past the edge.
const PART = { moduleLen: 20.5, moduleWid: 15.4, moduleH: 2.4, boardLen: 33, boardWid: 17.4, moduleAt: 13.3, plugW: 12, plugH: 4.5, plugBody: 18.8, plugBeyond: 15.35 };
const CASE = { wall: 1.2, floor: 1.2, boardLift: 0.3, gap: 0.3, headroom: 0.4, pcbT: 1.6 };

const pcbW = PART.boardLen;
const pcbD = PART.boardWid;
const w = pcbW + 2 * CASE.gap + 2 * CASE.wall;
const d = pcbD + 2 * CASE.gap + 2 * CASE.wall;
const pcbY = CASE.floor + CASE.boardLift + CASE.pcbT / 2;
const pcbTop = pcbY + CASE.pcbT / 2;
const plugY = pcbTop + PART.plugH / 2;
const plugOut = PART.plugBeyond - CASE.gap - CASE.wall;
const wallTop = pcbTop + Math.max(PART.moduleH, PART.plugH) + CASE.headroom;

export const DIM = {
    w, d, h: wallTop + CASE.wall, wallTop, pcbY, pcbTop, plugY, pcbW, pcbD,
    wall: CASE.wall, floor: CASE.floor, rib: pcbY - CASE.pcbT / 2 - CASE.floor, pcbT: CASE.pcbT,
    plugW: PART.plugW, plugH: PART.plugH, plugOut,
};

// Board-centre coordinates of the KiCad placements (x right, y down in KiCad).
const atX = (x) => x - PART.boardLen / 2;
const atY = (y) => y - PART.boardWid / 2;
const moduleX = atX(PART.moduleAt);
const mm = (value) => (Math.round(value * 10) / 10).toString();

export const PRODUCT = {
    name: "Tandem Stick",
    status: "Concept",
    tagline: "A tiny USB stick with no buttons. Plug one into every machine you want to control and one into your own. They pair on their own and talk by radio, like a wireless keyboard dongle.",
    stats: [
        ["20", "targets per host, one stick each"],
        ["~€14", "per stick, 5 built"],
        [`${mm(DIM.w)} × ${mm(DIM.d)} × ${mm(DIM.h)}`, `mm, ${mm(DIM.w + plugOut)} with the plug`],
        ["4 layers", "33 × 17.4 mm board, no buttons"],
    ],
};

// Rotation and u-axis sign per enclosure face (u = world x on front/rear, world z on the side).
export const FACE = {
    front: { rot: 0, sign: 1 },
    rear: { rot: Math.PI, sign: -1 },
    side: { rot: Math.PI / 2, sign: -1 },
    left: { rot: -Math.PI / 2, sign: 1 },
};

const port = (id, name, face, u, kind, blurb, specs) =>
    ({ id, name, face, u, kind, blurb, specs, section: "Connector", type: "port" });

export const PORTS = [
    port("p-plug", "USB-A plug", "side", 0, "plug",
        "The only connector: a Würth 692112030100 USB-A plug, hand-soldered on the board top. Plug it into a target, or into your own computer for the host role.",
        [["Plug", `USB-A male, ${PART.plugW} × ${PART.plugH} × ${PART.plugBody} mm, ${mm(plugOut)} mm outside the case`], ["Mount", "SMT plug on the board top, 2 shield tabs through-hole"], ["Power", "5 V from the port, about 150 mA average"]]),
];

const chip = (id, name, part, look, pos, size, blurb, specs, extra = {}) =>
    ({ id, name, part, look, pos, size, blurb, specs, type: "chip", ...extra });

export const CHIPS = [
    chip("esp", "Brain and radio", "ESP32-S3-MINI-1-N4", "module", [moduleX, 0], [PART.moduleLen, PART.moduleWid, PART.moduleH],
        "One pre-certified module does everything: it acts as the USB device, runs the firmware and talks to the other sticks. The meander antenna sits at the far end, away from the plug and the power parts.",
        [["USB", "Native full-speed device, any class in firmware"], ["Radio", "ESP-NOW, Wi-Fi 4 and BLE 5"], ["Flash", "4 MB inside the module"], ["Size", `${PART.moduleLen} × ${PART.moduleWid} × ${PART.moduleH} mm`]]),
    chip("pwr", "Regulator", "AP2112K-3.3", "ic", [atX(24.2), atY(4)], [1.6, 2.9, 1.1],
        "Makes 3.3 V from the port's 5 V. SOT-23-5 package.",
        [["Input", "5 V from the plug"], ["Output", "3.3 V, 600 mA"]], { legs: [[-0.95, 0, 0.95], [-0.95, 0.95]] }),
    chip("led", "Status LED", "WS2812B-2020", "led", [atX(24.2), atY(12.8)], [2, 2, 0.8],
        "The only indicator. One addressable RGB LED; the colour shows paired, linked or error.",
        [["Size", "2.0 × 2.0 × 0.8 mm"], ["Supply", "3.3 V, so it may be dim"], ["Use", "Pairing, link, errors"]]),
];

// Small parts drawn for realism only; not selectable.
export const PASSIVES = [
    { pos: [atX(26.9), atY(1.8)], size: [1.0, 1.6, 0.8], look: "cap" },
    { pos: [atX(24.2), atY(6.4)], size: [1.6, 0.8, 0.8], look: "cap" },
    { pos: [atX(26.3), atY(12.8)], size: [0.5, 1, 0.5], look: "cap" },
    { pos: [atX(22.3), atY(1.4)], size: [1, 0.5, 0.5], look: "cap" },
    { pos: [atX(24.2), atY(1.4)], size: [1, 0.5, 0.5], look: "cap" },
];

export const ITEMS = [...PORTS, ...CHIPS];
export const findItem = (id) => ITEMS.find((item) => item.id === id) || null;

export const MODES = [
    ["target", "Target", [
        ["Plugged into", "A machine you control"],
        ["It shows up as", "Keyboard, mouse, drive, serial port or network card"],
        ["Path", "Radio → brain → USB-A plug"],
        ["Timing", "Input reports in a few ms over ESP-NOW"],
    ]],
    ["host", "Host", [
        ["Plugged into", "Your own computer"],
        ["It shows up as", "A control device, no driver needed"],
        ["Path", "USB-A plug → brain → radio → every paired stick"],
        ["Use", "Pick a target in the web page and send keys, files or a screen request"],
    ]],
];

export const PAIRING = [
    ["1. First time", "Plug a blank stick into your computer once. The host stick gives it the fleet key."],
    ["2. Anywhere", "Plug it into any target. It joins the fleet by itself within a second or two."],
    ["3. Many", "Each target has its own stick. Up to about 20 per host, or run two hosts."],
    ["4. Updates", "Firmware goes out over the radio from the host stick."],
];

export const BOM = [
    ["ESP32-S3-MINI-1-N4", 1, 2.9],
    ["AP2112K-3.3 regulator", 1, 0.12],
    ["Würth 692112030100 USB-A plug (hand-soldered)", 1, 2],
    ["WS2812B-2020 RGB LED", 1, 0.1],
    ["Caps 10 µF, 1 µF, 100 nF", 4, 0.03],
    ["Resistor 10 k", 1, 0.01],
    [`PCB, 4 layers, ${mm(pcbW)} × ${mm(pcbD)} mm`, 1, 0.5],
    ["Assembly (SMT, 8 parts)", 1, 1.5],
    ["Case, 3D-printed (~2.4 g PETG)", 1, 0.05],
];

// Fixed costs paid once per order, whatever the quantity.
export const SETUP = [
    ["SMT setup and extended-part fees", 15, 30],
    ["Spare samples and a test jig", 0, 10],
];

export const BOARD_FACTS = [
    ["Stack-up", `4 layers, ${CASE.pcbT} mm: signal, GND, 3V3, GND`],
    ["USB", "D+ and D- straight from the plug to the module"],
    ["Case", "Two printed halves, snap-fit lid with an inner lip"],
    ["Print", "PETG, 0.2 mm layers, 0.4 mm nozzle, no supports"],
];

// How each case dimension follows from the parts.
export const SIZE_FACTS = [
    ["Board length", `${PART.moduleLen} module + antenna and power zone = ${mm(pcbW)} mm`],
    ["Board width", `${PART.moduleWid} module + 2 × 1.0 edge = ${mm(pcbD)} mm`],
    ["Case length", `${mm(pcbW)} + 2 × ${CASE.gap} gap + 2 × ${CASE.wall} wall = ${mm(w)} mm`],
    ["Case width", `${mm(pcbD)} + 2 × ${CASE.gap} gap + 2 × ${CASE.wall} wall = ${mm(d)} mm`],
    ["Case height", `${CASE.floor} floor + ${CASE.boardLift} lift + ${CASE.pcbT} board + ${PART.plugH} plug + ${CASE.headroom} air + ${CASE.wall} lid = ${mm(DIM.h)} mm`],
    ["Walls", `${CASE.wall} mm = 3 perimeters of a 0.4 mm nozzle`],
    ["With plug", `${mm(w + plugOut)} mm long`],
];

export const LAYER_INFO = [
    ["usb", "USB", "Plug to brain"],
    ["ctrl", "Control", "Brain to LED"],
    ["power", "Power", "5 V from the plug, 3.3 V rail"],
    ["radio", "Radio", "Antenna and links to the other sticks"],
];

// Guided tour: each step moves the camera and shows one idea.
export const TOUR = [
    { title: "The whole stick", text: "A USB-A plug on a 33 × 17.4 mm board in a printed case. No buttons, no screen. One stick per machine you want to control, plus one for you.", view: "iso", explode: 0 },
    { title: "The only connector", text: "A Würth USB-A plug carries power in and USB data both ways. Plug it into a target and it acts as a keyboard, mouse or drive. Plug it into your computer and it becomes the host.", focus: "p-plug", explode: 0, tab: "parts" },
    { title: "Open the case", text: "Two snap-fit halves, printed in PETG with no supports. Everything fits because every dimension is derived from the part sizes.", view: "iso", explode: 1, tab: "parts" },
    { title: "Brain and radio", text: "One pre-certified ESP32-S3 module is the USB device, the firmware and the radio. The antenna end of the board is a keep-out, so nothing else lives there.", focus: "esp", explode: 1, tab: "parts" },
    { title: "Power", text: "A 3.3 V regulator turns the port's 5 V into the module's supply. Bulk and decoupling capacitors sit next to it.", focus: "pwr", explode: 1, tab: "parts" },
    { title: "One light", text: "A single RGB LED is the whole interface: colour shows paired, linked or error.", focus: "led", explode: 1, tab: "parts" },
    { title: "Signals", text: "Host role: USB in, radio out to every paired stick. Target role: radio in, USB out to the machine. Toggle the layers to follow each path.", view: "top", explode: 0, tab: "signal", mode: "target" },
];
