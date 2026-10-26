(() => {
// Loads the Blender-made product model (tandem.glb): nodes with triangle meshes, PBR factors and embedded textures.
const { split, accessor } = app.scene.glbParse;
const URL_GLB = "assets/models/tandem.glb";
async function texture(doc, bin, index, srgb, cache) {
    if (index === undefined) return null;
    const key = `${index}:${srgb}`;
    if (!cache.has(key)) {
        cache.set(key, (async () => {
            const image = doc.images[doc.textures[index].source];
            const view = doc.bufferViews[image.bufferView];
            const start = view.byteOffset || 0;
            const bitmap = await createImageBitmap(new Blob([bin.slice(start, start + view.byteLength)], { type: image.mimeType }), { imageOrientation: "none" });
            const tex = new THREE.Texture(bitmap);
            tex.flipY = false;
            tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.anisotropy = 8;
            tex.needsUpdate = true;
            return tex;
        })());
    }
    return cache.get(key);
}

async function material(doc, bin, index, cache) {
    const def = doc.materials[index];
    const pbr = def.pbrMetallicRoughness || {};
    const color = pbr.baseColorFactor || [1, 1, 1, 1];
    const [map, mr] = await Promise.all([
        texture(doc, bin, pbr.baseColorTexture && pbr.baseColorTexture.index, true, cache),
        texture(doc, bin, pbr.metallicRoughnessTexture && pbr.metallicRoughnessTexture.index, false, cache),
    ]);
    const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(color[0], color[1], color[2], THREE.LinearSRGBColorSpace), map, metalnessMap: mr, roughnessMap: mr, metalness: pbr.metallicFactor ?? 1, roughness: pbr.roughnessFactor ?? 1 });
    mat.name = def.name;
    return mat;
}

// name -> { matrix (in the product frame), parts: [{ geometry, material name, make() }] }
async function loadGlb(url = URL_GLB) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const { json: doc, bin } = split(await res.arrayBuffer());
    const cache = new Map();
    const made = new Map();
    const nodes = new Map();
    const world = (index, parent) => {
        const node = doc.nodes[index];
        const local = new THREE.Matrix4().compose(
            new THREE.Vector3(...(node.translation || [0, 0, 0])),
            new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])),
            new THREE.Vector3(...(node.scale || [1, 1, 1])),
        );
        const matrix = parent.clone().multiply(local);
        if (node.mesh !== undefined) {
            const parts = doc.meshes[node.mesh].primitives.map((prim) => {
                const geometry = new THREE.BufferGeometry();
                const attrs = prim.attributes;
                geometry.setAttribute("position", new THREE.BufferAttribute(accessor(doc, bin, attrs.POSITION), 3));
                if (attrs.NORMAL !== undefined) geometry.setAttribute("normal", new THREE.BufferAttribute(accessor(doc, bin, attrs.NORMAL), 3));
                else geometry.computeVertexNormals();
                if (attrs.TEXCOORD_0 !== undefined) geometry.setAttribute("uv", new THREE.BufferAttribute(accessor(doc, bin, attrs.TEXCOORD_0), 2));
                if (prim.indices !== undefined) geometry.setIndex(new THREE.BufferAttribute(accessor(doc, bin, prim.indices), 1));
                const name = doc.materials[prim.material].name;
                return { geometry, name, make: () => { if (!made.has(prim.material)) made.set(prim.material, material(doc, bin, prim.material, cache)); return made.get(prim.material); } };
            });
            nodes.set(node.name, { matrix, parts });
        }
        (node.children || []).forEach((child) => world(child, matrix));
    };
    doc.scenes[doc.scene || 0].nodes.forEach((index) => world(index, new THREE.Matrix4()));
    // Materials are built up front so the model can be assembled synchronously.
    for (const node of nodes.values()) for (const part of node.parts) part.material = await part.make();
    return nodes;
}


// The model is fetched once, on first need; without it the 3D views draw the built-in shapes.
let ready = null;
const ensureModel = () => {
    if (!ready) ready = app.track(loadGlb()).then((model) => { app.assets.model = model; }, () => {});
    return ready;
};

app.scene.glb = { loadGlb, ensureModel };
})();
