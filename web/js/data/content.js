// Page copy as data: the plan, the design docs and the downloads. Pages only lay it out.
(() => {
    const ROLES = {
        lead: "Host and target are the same board, the same case and the same parts. The only difference is a role the firmware stores when you pair the stick. A target does less work than the host, but it still has to look like a USB device, so it needs the same chip.",
        head: ["", "Host stick", "Target stick"],
        rows: [
            ["Plugged into", "Your own computer", "Any machine you want to control"],
            ["Job", "Reads your keys and clicks, encrypts them, sends them by radio", "Checks and decrypts what it hears, replays it as a USB keyboard, mouse or drive"],
            ["Hardware", "The standard board", "The same board"],
            ["Firmware", "Host role", "Target role (the default for a blank stick)"],
            ["Optional saving", "None", "Leave off the LED and C4 if you never need to see its state (about €0.12)"],
        ],
        why: "A target has to present itself to the machine as a USB device. Chips with a radio and USB device mode are rare and small; the ESP32-S3 module is the cheapest one that also comes pre-certified, so a simpler target board would not be cheaper.",
    };

    const ARCHITECTURE = {
        title: "Block diagram: computer, host stick, radio, target stick, target machine",
        boxes: [["Your computer", "web page"], ["Host stick", "USB control device"], ["Target stick", "USB keyboard, mouse, drive"], ["Target machine", "no software"]],
        links: ["USB-A", "radio", "USB-A"],
    };

    const PLAN = {
        lead: "The idea, the requirements, how the parts fit together and what is still to do. Nothing here has been built yet.",
        status: "Status: untested DIY design. The board and case are designed and pass automatic design-rule checks; nothing has been built, and firmware is not written. Sections marked planned are intent, not results.",
        vision: "Control several computers from one without cables, a KVM or software on the targets. A tiny USB stick goes into each target and appears as an ordinary keyboard, mouse, drive, serial port or network card. One more stick goes into your own computer. They find each other by radio, so you pick a target in a web page and drive it.",
        requirements: [
            ["R1", "No buttons, no screen; one RGB LED is the only UI.", "Design review"],
            ["R2", "Target needs no driver or software: standard USB classes only.", "Bring-up on Windows, macOS, Linux"],
            ["R3", "One host controls up to about 20 targets.", "Pairing simulation, then range test"],
            ["R4", "Input latency of a few ms over ESP-NOW.", "Latency test with a logic analyser"],
            ["R5", "Powered only from the USB port, about 150 mA average.", "Current measurement"],
            ["R6", "Case printable in PETG (supports only under the lid plate); every size derives from part sizes.", "STL and dimension checks"],
            ["R7", "Fab-ready board: 4 layers, 33 × 17.4 mm, DRC clean.", "Gerber checks, hardware/drc.py"],
            ["R8", "Parts for one stick around €14 when building five.", "BOM total, quotes"],
            ["R9", "Only paired sticks may send input to a target.", "Security review (see below)"],
        ],
        architecture: "Both sticks are the same hardware. Firmware decides the role: the host shows up on your computer as a control device and fans commands out to paired sticks; the target receives commands and presents the matching USB device to the machine it is plugged into.",
        hardware: [
            "*Module:* ESP32-S3-MINI-1-N4, pre-certified, native full-speed USB device, ESP-NOW, Wi-Fi 4, BLE 5.",
            "*Power:* AP2112K-3.3 from the port's 5 V; 600 mA budget against about 150 mA average.",
            "*Board:* 33 × 17.4 mm, 4 layers (signal, GND, 3V3, GND), 1.6 mm. The antenna end is a keep-out on all layers.",
            "*Connector:* USB-A plug formed by the board itself: a 12 mm tab with four pads on the bottom face. Order ENIG (gold) finish.",
            "*Case:* two PETG halves, snap-fit lid, 3 perimeters, 0.2 mm layers, supports under the lid plate only.",
            "*Known gaps:* the LED runs at 3.3 V and may be dim; no schematic or ERC (the nets live in build_board.py).",
        ],
        firmware: [
            ["usb", "TinyUSB device stack: HID keyboard and mouse first, then mass storage, CDC serial, network. The role decides the descriptors."],
            ["radio", "ESP-NOW framing, acknowledgements, retries, channel selection."],
            ["pair", "Fleet key provisioning and the join flow (see pairing below)."],
            ["ota", "Firmware updates sent over the radio from the host stick."],
            ["led", "Status colours: unpaired, pairing, linked, error."],
            ["host-api", "Vendor-class USB interface plus a WebUSB descriptor so the web page can talk to the host stick without a driver."],
        ],
        security: {
            lead: "A target stick that obeys the air is a remote keyboard, so pairing is the whole security model.",
            rules: [
                "Frames are encrypted and authenticated with the fleet key; unpaired senders are dropped.",
                "Provisioning only happens over USB, never over the air.",
                "Replay protection with a monotonic counter per sender.",
                "Lost sticks: re-key the fleet from the host, which invalidates every stick that missed the rotation.",
                "Firmware images must be signed before an over-the-air update is accepted.",
            ],
            caveat: "Planned, not implemented. A threat model review should come before any public firmware release.",
        },
        roadmap: [
            { done: true, title: "Phase 0 · Idea", text: "What it does, derived case dimensions, 3D explorer." },
            { done: true, title: "Phase 1 · Board and case design", text: "KiCad board generated by script, DRC clean, Gerbers, BOM, placement, printable STL. Open gate: a fab preview accepts the files." },
            { title: "Phase 2 · First article", text: "Order the minimum quantity, fill supplier part numbers, check rotation offsets. Assemble the small parts. Gate: the stick enumerates on USB and powers the module." },
            { title: "Phase 3 · Bring-up firmware", text: "Flash via the BOOT/GND short, LED, USB HID keyboard, ESP-NOW ping between two sticks. Gate: a keystroke crosses the radio." },
            { title: "Phase 4 · Fleet", text: "Pairing, encryption, multiple targets, host web page over WebUSB. Gate: five sticks, measured latency and range." },
            { title: "Phase 5 · Hardening", text: "ESD diode and board respin, LED supply fix, signed updates. Gate: threat-model review passed." },
            { title: "Phase 6 · Share", text: "Write up what worked, tag a release of the files and firmware." },
        ],
        costNote: "Rough estimates at hobby quantities, ±30%, not quotes. Generated from the same data as the explorer.",
        buildQuantities: [2, 5, 10, 20, 30],
        risks: [
            ["Board has an error not caught by DRC", "Respin", "Order the minimum quantity; add a schematic and ERC"],
            ["Antenna detuned by case or hand", "Poor range", "Keep-out, range test with and without the case"],
            ["OS refuses or limits composite devices", "Feature gaps", "Check per OS in Phase 3; one class per role first"],
            ["Unauthorised radio control", "Remote keystroke injection", "Encrypted fleet key, replay counters, USB-only provisioning"],
            ["Part availability or price shift", "Cost", "Check stock before ordering; alternates for passives"],
        ],
        open: [
            "Which USB classes ship first beyond HID keyboard and mouse?",
            "WebUSB on the host stick versus a small native helper.",
            "Whether to keep ESP-NOW only or add a BLE fallback for range.",
            "Open-source licence for firmware once it exists.",
        ],
    };

    const DOCS = {
        lead: "Everything a designer or builder needs on one page: drawings with dimensions, pinout, parts, build steps and print settings.",
        pinout: [
            ["3V3", "3", "Regulator output, module supply"],
            ["USB_DM / USB_DP", "23 / 24", "Plug D− and D+, straight through (native USB, no hub)"],
            ["LED_DIN", "25", "Status LED data in"],
            ["EN", "45", "10 k pull-up to 3V3 and a 1 µF cap to GND (reset delay)"],
            ["IO0 (BOOT)", "4", "Test point TP1. Short TP1 to TP2 (GND) while plugging in to enter the bootloader"],
        ],
        gaps: "Known gaps: the LED runs from 3.3 V so it may be dim, and there is no schematic yet (the nets live in the build script).",
        tools: [
            ["To order", "A board from a PCB fab (4 layers, 1.6 mm). Parts from your usual supplier. Optional: an assembly service for the small parts."],
            ["To solder", "Hot air or reflow for the module and regulator, a fine-tip iron for the plug, flux, tweezers, magnification."],
            ["To print", "Any FDM printer with a 0.4 mm nozzle and PETG. Two small parts, supports only under the lid plate."],
            ["To flash", "A computer with a USB port. Firmware is not released yet, so this step has to wait."],
        ],
        build: [
            "*Check the files.* Open the board in KiCad, look at the Gerbers in your fab's online viewer, and compare the board with the 3D explorer.",
            "*Order the board.* Upload tandem-gerbers.zip. Choose 4 layers, 1.6 mm, and order the minimum quantity first.",
            "*Order the parts* from the parts list, plus a few spare passives.",
            "*Print the case.* Tray and lid, PETG, settings below. Test-fit the lid before you solder anything.",
            "*Solder the small parts.* Regulator, LED and passives first, then the ESP32 module.",
            "*Check the USB tab.* The plug is the bare end of the board, so there is nothing to solder. Make sure the gold pads are clean and the edge is not chipped.",
            "*Look it over.* Under magnification, check for bridges. Use a multimeter to confirm 3V3 is not shorted to GND before power.",
            "*Fit the case.* Board into the tray on its ribs, plug through the slot, lid snaps on.",
        ],
        print: [
            ["Material", "PETG"],
            ["Nozzle and layer", "0.4 mm nozzle, 0.2 mm layers"],
            ["Walls", "3 perimeters (1.2 mm), 15% infill"],
            ["Supports", "Under the lid plate only"],
            ["Orientation", "Tray open side up. Lid logo side up, lip on the bed."],
            ["Fit", "0.3 mm gap around the board. If the lid is tight, scale the lid by 99%, not the tray."],
        ],
        checklist: [
            "No solder bridges on the module, regulator or plug",
            "3V3 to GND is not a short",
            "5 V to GND is not a short",
            "USB tab pads are clean and the board edge is not chipped",
            "Antenna end is clear of the case wall",
            "Plug it into a computer through a powered hub first, not your main port",
        ],
        files: [
            ["Gerbers and drill", "Upload to the PCB fab", "files/bundles/tandem-gerbers.zip"],
            ["KiCad project", "Board, footprints, generator and DRC scripts", "files/bundles/tandem-kicad-project.zip"],
            ["Case STL", "Tray and lid for printing", "files/bundles/tandem-case-stl.zip"],
            ["BOM and placement", "For SMT assembly", "files/bundles/tandem-assembly.zip"],
        ],
    };

    const DOWNLOADS = {
        lead: "Everything needed to order the board and print the case.",
        warning: "These files have never been built or checked on real hardware. Fill the supplier column in the BOM and check rotation offsets in your fab's preview before ordering. Order the minimum quantity first.",
        bundles: {
            "bundles/tandem-gerbers.zip": ["Gerbers and drill", "Upload to the PCB fab"],
            "bundles/tandem-assembly.zip": ["BOM and placement", "For SMT assembly"],
            "bundles/tandem-case-stl.zip": ["Case STL", "Tray and lid for printing"],
            "bundles/tandem-kicad-project.zip": ["KiCad project", "Board, footprints, generator and DRC scripts"],
        },
        firmware: "Not written or released yet. It will appear here once the first board has been built and checked. Until then you can only build the hardware.",
        order: [
            "Upload tandem-gerbers.zip to a fab (4 layers, 1.6 mm, 33 × 17.4 mm).",
            "For assembly, upload bom.csv and pos.csv from the assembly bundle and add supplier part numbers.",
            "Print case-tray.stl and case-lid.stl in PETG, 0.2 mm layers. Both files are already oriented for printing: the lid logo side up with supports under its plate.",
            "Choose ENIG (gold) surface finish so the plug pads survive repeated insertions.",
        ],
        flash: "Flash: short TP1 (BOOT) to TP2 (GND) while plugging in, then flash over native USB.",
    };

    const HOME = {
        title: "One stick controls many PCs.",
        lead: "Plug one USB stick into your computer and one into each machine you want to control. Drive one machine, several, or all at once, over radio. Nothing to install on the others. Use our app or script it with the API.",
        facts: [["46.5 mm", "About half a credit card, plug included"], ["0 buttons", "Nothing to press or configure"], ["Scriptable", "Own app and open API"], ["~€10", "Parts for one stick"]],
        steps: [
            ["Build or order sticks", "Order the board, solder eight parts, print the case. Every file is on the Downloads page."],
            ["Plug one into your computer", "It is the host. Your computer sees a normal USB device."],
            ["Pair the others once", "Plug a target stick into each machine you want to control. Pairing is one short step."],
            ["Type once, control all", "Your keyboard and mouse reach every paired machine at once. Or run a script."],
        ],
        why: [
            ["Nothing to install", "The target only sees a normal USB keyboard, mouse or drive. No app, no driver, no account."],
            ["Works on anything with USB", "Windows, macOS, Linux, kiosks, signage players, locked-down machines, even a BIOS screen."],
            ["No cables, no network", "Sticks talk by radio directly. No Wi-Fi, no cloud, no remote desktop on the targets."],
            ["Same stick everywhere", "Host and target are the same board. The role comes from pairing, not from a different part."],
            ["One, many or all", "Send input to a single machine, a chosen group, or every paired one at once. Planned: the firmware is not written yet."], ["Two-way link", "Targets answer back, so the host knows a keystroke arrived. The radio is two-way but not full duplex: it sends and listens in turns."], ["App and API", "Control it from our app, or script it: send keys, clicks and commands from your own code."], ["Open and hackable", "Schematic, board, case and firmware plan are open. Change anything and build your own."],
            ["Honest status", "This is an untested DIY design. Nothing here is sold, and nobody promises it works until you test it."],
        ],
        cases: [
            ["Home office", "Everyday users", "One keyboard and mouse drive your desktop, mini PC and laptop, even when each runs a different system.", "home"],
            ["Automated installs", "IT, labs, repair shops", "Replay a keystroke script to install Windows or Linux on many bare machines at once, with no network boot.", "install"],
            ["Present on every screen", "Teachers, speakers", "Click through slides once and every classroom or lobby screen follows.", "present"],
            ["Fix many computers", "IT admins, labs", "Run the same command on a row of machines with no remote tools installed.", "admin"],
            ["Shop and sign displays", "Shops, cafés", "Update menus and promos across every screen without visiting each one.", "kiosk"],
            ["Test on every system", "Developers, QA", "Drive a bench of phones, boxes and PCs together while you test.", "qa"],
            ["Fill in spreadsheets", "Offices, data entry", "Type a value once and enter it on several machines.", "office"],
            ["Server rooms", "Sysadmins", "Reach a BIOS or boot menu on racks that have no KVM."],
            ["Streaming and video walls", "Creators, events", "Start the same scene, clip or playlist on many players at once."],
            ["Gaming and sim rigs", "Hobbyists", "Run one input across a group of PCs for local test sessions."],
            ["Classrooms and workshops", "Teachers", "Demonstrate a task once and let the whole room's machines follow."],
            ["Accessibility", "Assistive setups", "Use one adaptive device to drive every machine at home or work."],
            ["Demo and retail units", "Stores, trade shows", "Reset or restart every demo machine from the front desk."],
        ],
        faq: [
            ["Is it for sale?", "No. This is a DIY design with open files. You order the board and build it yourself."],
            ["Does it work yet?", "Not proven. No board has been built or checked, and the firmware is not released. Treat it as a design to test."],
            ["Do I need Wi-Fi?", "No. The sticks use ESP-NOW, a direct radio link. There is no router, cloud or account."],
            ["What is the difference between host and target?", "Nothing in hardware. The stick plugged into your computer is the host; the ones in the machines you control are targets."],
            ["How many targets can one host drive?", "The plan is several at once. The real limit is not measured until the firmware exists."],
            ["Is the radio link secure?", "The plan is encrypted pairing with per-pair keys. It is not audited, so do not use it for anything sensitive yet."],
        ],
    };

    app.content = { ROLES, ARCHITECTURE, PLAN, DOCS, DOWNLOADS, HOME };
})();
