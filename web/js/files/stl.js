// 3D mesh of an STL file, parsed from the real file.
(() => {
    const { el, add, on, track, region, themed } = app.dom;
    const { SPACE, RADIUS, FONT, px } = app.styles;
    const { para } = app.ui.text;
    const { button } = app.ui.button;
    const { stack, row } = app.ui.layout;
    const { table } = app.ui.table;
    const { zoomable } = app.ui.zoom;
    const { copyButton } = app.ui.copy;
    const g = app.files.gerber;
    const C = app.files.common;
    const { load, note, frame, previewWidth, GERBER_DIR } = C;
    const BACKDROP = "#0b1220", SPIN_SPEED = 0.006, STL_COLOR = 0xffb224;
    // The lid is coloured like the 3D view: yellow plate, cream diamond faces, dark ink for the rest of the raised mark.
    const PLATE_TOP = 2.05, CREAM = new THREE.Color(0xfff1c4), INK = new THREE.Color(0x2a1a00), PLATE = new THREE.Color(0xffc43a);
    const within = (x, y, cx, r) => Math.abs(x - cx) / r + Math.abs(y) / (r * 0.8) <= 1.02;
    const lidPaint = (p, at) => {
        const x = (p[at] + p[at + 3] + p[at + 6]) / 3, y = (p[at + 1] + p[at + 4] + p[at + 7]) / 3, z = (p[at + 2] + p[at + 5] + p[at + 8]) / 3;
        if (z <= PLATE_TOP) return PLATE;
        // Flat diamond tops sit at distinct heights: 2.45 dark, 2.5 cream, 2.55 cream, 2.6 dark.
        if (p[at + 2] === p[at + 5] && p[at + 5] === p[at + 8] && x < -4.2 && z > 2.4) return Math.abs(z - 2.5) < 0.03 || Math.abs(z - 2.55) < 0.03 ? CREAM : INK;
        return within(x, y, -11.6, 2.9) || (within(x, y, -7.4, 3.4) && !within(x, y, -7.4, 1.6)) ? CREAM : INK;
    };
    const CASE = { "mechanical/case-lid.stl": { color: 0xffffff, paint: lidPaint }, "mechanical/case-tray.stl": { color: 0xf0a010 } };

    function parseStl(buf, paint) {
        const view = new DataView(buf);
        const count = view.getUint32(80, true);
        const positions = [];
        if (84 + count * 50 === buf.byteLength) {
            for (let tri = 0; tri < count; tri++) {
                for (let vert = 0; vert < 3; vert++) {
                    const at = 84 + tri * 50 + 12 + vert * 12;
                    positions.push(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
                }
            }
        } else {
            for (const m of new TextDecoder().decode(buf).matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) positions.push(+m[1], +m[2], +m[3]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        if (paint) {
            const colors = [];
            for (let at = 0; at < positions.length; at += 9) {
                const hue = paint(positions, at);
                for (let vert = 0; vert < 3; vert++) colors.push(hue.r, hue.g, hue.b);
            }
            geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        }
        geometry.center();
        return geometry;
    }

    function stlView(buf, path) {
        const look = CASE[path] || {};
        const geometry = parseStl(buf, look.paint);
        geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere.radius;
        const width = previewWidth();
        const height = Math.round(width * 0.7);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(BACKDROP);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, radius * 20);
        camera.position.set(0, radius * 1.4, radius * 3.2);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.1));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(radius, radius * 2, radius);
        scene.add(sun);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: look.color || STL_COLOR, vertexColors: !!look.paint, roughness: 0.55, metalness: 0.05 }));
        mesh.rotation.x = -Math.PI / 2;
        const pivot = new THREE.Group();
        pivot.add(mesh);
        scene.add(pivot);
        let spinning = true, dragging = false, lastX = 0, lastY = 0, frameId = 0;
        const canvas = renderer.domElement;
        canvas.style.display = "block";
        canvas.style.touchAction = "none";
        canvas.style.cursor = "grab";
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        on(canvas, "pointerdown", (evt) => { dragging = true; spinning = false; lastX = evt.clientX; lastY = evt.clientY; canvas.setPointerCapture(evt.pointerId); });
        on(canvas, "pointermove", (evt) => {
            if (!dragging) return;
            pivot.rotation.y += (evt.clientX - lastX) * 0.01;
            pivot.rotation.x += (evt.clientY - lastY) * 0.01;
            lastX = evt.clientX; lastY = evt.clientY;
        });
        on(canvas, "pointerup", () => { dragging = false; });
        const tick = () => {
            if (spinning) pivot.rotation.y += SPIN_SPEED;
            renderer.render(scene, camera);
            frameId = requestAnimationFrame(tick);
        };
        tick();
        track(() => { cancelAnimationFrame(frameId); renderer.dispose(); geometry.dispose(); });
        const size = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
        const dims = size.getSize(new THREE.Vector3());
        return [frame(canvas), note(`${dims.x.toFixed(1)} × ${dims.y.toFixed(1)} × ${dims.z.toFixed(1)} mm · ${(geometry.attributes.position.count / 3).toLocaleString()} triangles · drag to rotate`)];
    }


    app.files.stl = { stlView, parseStl };
})();
