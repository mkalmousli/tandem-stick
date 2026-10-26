// Sky dome, circuit-trace ground, fireflies. All procedural shaders, no textures.
import * as THREE from "../explorer/src/scene/three.js";

export function buildSky() {
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, uniforms: { uTime: { value: 0 } },
        vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: `varying vec3 vD; uniform float uTime;
            float hash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
            void main(){
                float y = vD.y;
                vec3 col = mix(vec3(.05,.10,.22), vec3(.008,.012,.035), pow(clamp(y, 0., 1.), .45));
                if (y < 0.) col = vec3(.03,.06,.13);
                vec3 f = fract(vD * 200.) - .5; float h = hash(floor(vD * 200.));
                float star = step(.9965, h) * smoothstep(.5, .0, length(f)) * smoothstep(.02, .3, y) * (.6 + .4 * sin(uTime * 2. + h * 60.));
                col += vec3(star);
                float a = sin(atan(vD.z, vD.x) * 3. + uTime * .15 + sin(vD.x * 5. + uTime * .1) * 2.);
                float band = smoothstep(.02, .25, y) * smoothstep(.6, .25, y) * (.5 + .5 * a);
                col += vec3(.05, .38, .5) * band * .22;
                vec3 m = normalize(vec3(-.4, .42, -.8)); float d = dot(vD, m);
                col += vec3(.8,.9,1.) * smoothstep(.9985, .9992, d) + vec3(.25,.35,.6) * pow(max(d, 0.), 48.) * .5;
                gl_FragColor = vec4(col, 1.);
            }`,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return { mesh, mat };
}

// stations: array of THREE.Vector2 (x,z). Traces run from the origin to each one with a travelling pulse.
export function buildGround(stations) {
    const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uS: { value: stations } },
        vertexShader: "varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }",
        fragmentShader: `uniform float uTime; uniform vec2 uS[${stations.length}]; varying vec3 vW;
            void main(){
                vec2 p = vW.xz; float r = length(p);
                vec2 q = p / 4.; vec2 g = abs(fract(q - .5) - .5) / max(fwidth(q), vec2(.0001));
                float grid = 1. - min(min(g.x, g.y), 1.);
                float ring = smoothstep(.92, 1., sin(r * .32 - uTime * 1.5)) * exp(-r * .025);
                vec3 col = vec3(.018, .03, .062);
                col += vec3(.10, .26, .6) * grid * .38 * exp(-r * .011);
                col += vec3(.2, .55, 1.) * ring * .4;
                for (int i = 0; i < ${stations.length}; i++) {
                    vec2 b = uS[i]; float L = length(b);
                    float h = clamp(dot(p, b) / dot(b, b), 0., 1.); float d = length(p - b * h);
                    float s = fract(h * L / 20. - uTime * .3);
                    float pulse = smoothstep(.78, 1., s) * smoothstep(.0, .05, h);
                    col += vec3(.25, .85, 1.) * (smoothstep(.45, .0, d) * (.35 + pulse * 1.6) + smoothstep(3.5, .0, d) * .07);
                }
                float dist = length(vW - cameraPosition);
                col = mix(col, vec3(.03, .06, .13), smoothstep(90., 300., dist));
                gl_FragColor = vec4(col, 1.);
            }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), mat);
    mesh.rotation.x = -Math.PI / 2;
    return { mesh, mat };
}

export function buildFireflies(count = 450, range = 150) {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        pos.set([(Math.random() - .5) * range * 2, 0.5 + Math.random() * 22, (Math.random() - .5) * range * 2], i * 3);
        seed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
        vertexShader: `attribute float seed; uniform float uTime; varying float vA;
            void main(){
                vec3 p = position; p.x += sin(uTime * .4 + seed) * 2.5; p.z += cos(uTime * .35 + seed * 1.3) * 2.5; p.y += sin(uTime * .6 + seed * 2.) * 1.2;
                vec4 mv = modelViewMatrix * vec4(p, 1.); vA = .35 + .65 * (.5 + .5 * sin(uTime * 1.7 + seed * 5.));
                gl_PointSize = clamp(90. / -mv.z, 1.5, 9.); gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(.5, 1., .9, smoothstep(.5, .0, d) * vA); }",
    });
    return { points: new THREE.Points(geo, mat), mat };
}
