// Build paths: each is a list of steps [title, plain-words text, part to show, exploded?, tint, extras: { links, todo, watch, show }].
(() => {
    const { HUE } = app.ex.buildArt;
    const FULL = [
        ["Check the files", "Before spending money, look at what you are about to make.", "pcb", 1, HUE.module, { links: [["KiCad project (zip)", "bundles/tandem-kicad-project.zip"], ["Board layers as 3D (zip)", "bundles/tandem-layers-3d.zip"]], todo: ["Open the board in KiCad, or look at the Gerbers in the Files tab.", "Turn the 3D model here and compare."], watch: "Nothing has been built or tested yet. Treat every step as a first try." }],
        ["Order the board", "A PCB fab makes the green board for you from the Gerber files.", "pcb", 1, HUE.module, { links: [["Gerbers + drill (zip)", "bundles/tandem-gerbers.zip"]], todo: ["Upload the Gerber zip below to a PCB maker.", "Choose 4 layers, 1.6 mm thick, ENIG (gold) finish.", "Order the smallest quantity first (usually 5)."], watch: "ENIG matters: the gold pads on the USB tab wear well. Cheaper finishes wear out." }],
        ["Order the parts", "Everything that goes on the board comes from an electronics supplier.", "esp", 1, HUE.passive, { links: [["Bill of materials (CSV)", "hardware/fab/bom.csv"], ["Placement (CSV)", "hardware/fab/pos.csv"]], todo: ["Order each line below. Buy a few extra tiny parts: they are easy to lose.", "Check the part number matches before you pay."], show: "bom" }],
        ["Print the case", "A 3D printer makes the two-piece case.", "case-tray", 1, HUE.plug, { links: [["Case tray (STL)", "mechanical/case-tray.stl"], ["Case lid (STL)", "mechanical/case-lid.stl"]], todo: ["Print the tray and the lid in PETG. Only the lid needs supports (see below).", "Test-fit the lid before you solder anything."], show: "print" }],
        ["Learn the soldering routine", "Soldering is melting metal to join two pads. Four moves cover every part on this board.", "pcb", 1, HUE.led, { todo: ["Heat the pad and the part together for about 2 to 3 seconds, then feed solder to the joint, not to the iron.", "Remove the solder first, then the iron.", "Do not move the part until the solder turns from liquid to shiny."], watch: "Practise on a spare board or scrap first. Too hot or too long lifts pads off the board.", show: "solder" }],
        ["Solder the small parts", "Go in this order: regulator, capacitors and resistor, then the LED. The colours match the board map.", "pwr", 1, HUE.reg, { todo: ["Regulator U2 first: it has five tiny legs. Tin one pad, tack one leg, then do the rest.", "Capacitors and R1 next. They have no direction, so either way round is fine.", "LED D1 last. Match the small corner mark on the LED to the mark on the board.", "C3 goes on the bottom side."], watch: "A part that is crooked but connected still works. A bridge between legs does not: wick it away with braid and flux.", show: "board" }],
        ["Solder the ESP32 module", "The biggest part, and the one with a hidden ground pad underneath.", "esp", 1, HUE.module, { todo: ["Easiest is a hot plate or hot air with solder paste. With an iron only: tin every pad on the board first.", "Line up the module with the pad outline on the board. Tack one corner and check the alignment.", "Solder the side pads, then press the centre down while you heat from the board edge."], watch: "If you are unsure, order the board with the module already assembled by the fab.", show: "board" }],
        ["Check every connection", "Use the multimeter in continuity mode. It beeps when two points are joined.", "pcb", 1, HUE.data, { todo: ["Beep test: each coloured wire below should connect where the table says.", "No beep allowed between 3V3 and GND, or between 5 V and GND.", "A beep where there should be none means a bridge: find it under the magnifier."], show: "wiring" }],
        ["First power-up", "Plug the board into a powered USB hub, not your main computer port.", "led", 0, HUE.led, { todo: ["Plug in. Unplug at once if anything smells hot.", "The LED should light or blink within a second or two."], show: "checklist" }],
        ["Close the case", "Board into the tray on its ribs, plug through the slot, lid snaps on.", "case-lid", 0, HUE.plug, { todo: ["Slide the board into the tray.", "Snap the lid on. If it is tight, print the lid at 99% size."] }],
    ];
    const BENCH = [
        ["Plug in", "No target machine needed. Plug one finished stick into a powered USB hub or a spare port.", "p-plug", 0, HUE.plug, {}],
        ["Look at the LED", "The status LED should light or blink within a second or two. If nothing happens, unplug at once and re-check 5 V and 3V3 for shorts.", "led", 0, HUE.led, {}],
        ["See it on your computer", "A new USB serial device should appear (Linux: ls /dev/ttyACM*, Windows: Device Manager, macOS: ls /dev/cu.usb*). That proves power, USB data lines and the module all work.", "esp", 1, HUE.module, {}],
        ["Flash the firmware", "Firmware is not released yet. When it is, you will flash it over this same USB connection with esptool, no target needed.", "esp", 1, HUE.module, {}],
        ["Pair two sticks", "Plug a second stick into another port of the same computer. Make one the host and one the target, and watch the target's LED react to commands from the host.", "led", 0, HUE.led, {}],
    ];
    
    const GERBER = ["Gerbers + drill (zip)", "bundles/tandem-gerbers.zip"];
    const ASSEMBLY = ["Assembly bundle: BOM + placement (zip)", "bundles/tandem-assembly.zip"];
    const CASE = [["Case tray (STL)", "mechanical/case-tray.stl"], ["Case lid (STL)", "mechanical/case-lid.stl"], ["Both as one zip", "bundles/tandem-case-stl.zip"]];
    const FAB = [
        ["Pick an assembly service", "Skip soldering: a fab places and solders every part for you. You only print the case.", "pcb", 1, HUE.module, { todo: ["Choose a PCB maker that offers assembly (PCBA) with 4 layers, 1.6 mm, ENIG.", "Upload the board files and the assembly files from below.", "Check each part number in the preview the service shows you."], links: [GERBER, ASSEMBLY], watch: "Not every service stocks the ESP32-S3 module. If one part is missing, ask for a substitute before you accept." }],
        ["Check the placement", "The service will show where each part lands. Compare it with the 3D model.", "esp", 1, HUE.passive, { todo: ["Look at the placement file: it lists every part and where it goes in millimetres.", "The LED and C3 rotation are the usual mistakes. C3 sits on the bottom side."], links: [["Placement (CSV)", "hardware/fab/pos.csv"]] }],
        ["Print the case", "While the board is being made, print the case.", "case-tray", 1, HUE.plug, { todo: ["Print the tray and the lid in PETG. Only the lid needs supports (see below)."], links: CASE, show: "print" }],
        ["Assemble", "When the board arrives, it only needs the case.", "pcb", 1, HUE.led, { todo: ["Plug the board into a powered hub and wait for the LED.", "Slide it into the tray on its ribs and snap the lid on."], show: "checklist" }],
    ];
    const PRINT = [
        ["Download the case", "The case is two printed parts. You need no electronics to print and look at them.", "case-tray", 1, HUE.plug, { todo: ["Download both STL files below.", "Open them in your slicer."], links: CASE }],
        ["Slice and print", "Use the settings below. Supports only under the lid.", "case-tray", 1, HUE.plug, { todo: ["Print the tray flat on its floor.", "Print the lid with the logo facing up and supports under its flat plate (the lip stands on the bed)."], show: "print" }],
        ["Test-fit the lid", "The lid snaps onto the tray. Check it before you build anything inside.", "case-lid", 0, HUE.plug, { todo: ["If the lid is tight, print it at 99% size.", "A 33 mm board fits inside with a small gap on each side."] }],
    ];
    const SETS = { full: FULL, fab: FAB, print: PRINT, bench: BENCH };
    const KINDS = [["full", "DIY soldering"], ["fab", "Assembled by a fab"], ["print", "Just print the case"], ["bench", "Bench test"]];
    // The first thing the Build tab asks: how do you want to make it?
    const CHOICES = [
        ["full", "Solder it myself", "Order the bare board and parts, then solder them. Cheapest, most hands-on.", "Needs: soldering iron · about €25 · a weekend"],
        ["fab", "Have a fab assemble it", "A service places and solders every part. You only print the case.", "Needs: 3D printer · about €45 for 5 boards · a few weeks of waiting"],
        ["print", "Only print the case", "No electronics. Print the two parts and see how it fits.", "Needs: 3D printer · an hour or two"],
        ["bench", "Test a finished stick", "You already have a stick. Plug it in and check that it works.", "Needs: one stick and a computer"],
    ];
    app.ex.buildSteps = { SETS, KINDS, CHOICES };
})();
