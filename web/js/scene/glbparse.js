(() => {
// GLB container and accessor decoding.
const CHUNK = { json: 0x4e4f534a, bin: 0x004e4942 };
const ARRAYS = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function split(buf) {
    const view = new DataView(buf);
    const chunks = {};
    for (let at = 12; at < buf.byteLength;) {
        const size = view.getUint32(at, true);
        chunks[view.getUint32(at + 4, true)] = buf.slice(at + 8, at + 8 + size);
        at += 8 + size;
    }
    return { json: JSON.parse(new TextDecoder().decode(chunks[CHUNK.json])), bin: chunks[CHUNK.bin] };
}

function accessor(doc, bin, index) {
    const acc = doc.accessors[index];
    const view = doc.bufferViews[acc.bufferView];
    const Type = ARRAYS[acc.componentType];
    const width = WIDTH[acc.type];
    const stride = view.byteStride;
    const start = (view.byteOffset || 0) + (acc.byteOffset || 0);
    if (!stride || stride === width * Type.BYTES_PER_ELEMENT) return new Type(bin.slice(start, start + acc.count * width * Type.BYTES_PER_ELEMENT));
    const out = new Type(acc.count * width);
    const src = new DataView(bin);
    for (let i = 0; i < acc.count; i++) {
        for (let k = 0; k < width; k++) out[i * width + k] = Type === Float32Array ? src.getFloat32(start + i * stride + k * 4, true) : src.getUint16(start + i * stride + k * 2, true);
    }
    return out;
}

app.scene.glbParse = { split, accessor };
})();
