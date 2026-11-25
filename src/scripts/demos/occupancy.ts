// OccupancyMapper: a phone moves through a room and scans it.
// Rays shoot out of the phone, and voxels appear where they hit walls and furniture.
import type * as T from 'three';
import type { SceneFactory } from './types';

export const occupancy: SceneFactory = ({ THREE, scene, camera, color, rand }) => {
    const V = 0.25;                              // voxel size
    const W = 16, D = 12, H = 8;                 // room size in voxels
    const cells: [number, number, number][] = [];

    // the room: floor, back wall, left wall, right wall (front is open so we can look in)
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) cells.push([x, 0, z]);
    for (let x = 0; x < W; x++) for (let y = 1; y < H; y++) cells.push([x, y, 0]);
    for (let z = 1; z < D; z++) for (let y = 1; y < H; y++) { cells.push([0, y, z]); cells.push([W - 1, y, z]); }
    // furniture: a table and a cupboard
    for (let x = 5; x < 10; x++) for (let z = 4; z < 7; z++) cells.push([x, 3, z]);
    for (const [x, z] of [[5, 4], [9, 4], [5, 6], [9, 6]]) for (let y = 1; y < 3; y++) cells.push([x, y, z]);
    for (let x = 12; x < 14; x++) for (let z = 2; z < 4; z++) for (let y = 1; y < 6; y++) cells.push([x, y, z]);

    const toWorld = ([x, y, z]: [number, number, number]) =>
        new THREE.Vector3((x - W / 2) * V, y * V, (z - D / 2) * V);

    // all voxels as one "instanced" mesh (fast: one draw call for hundreds of cubes)
    const box = new THREE.BoxGeometry(V * 0.92, V * 0.92, V * 0.92);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
    const voxels = new THREE.InstancedMesh(box, mat, cells.length);
    const seen = new Float32Array(cells.length);   // 0 = unknown, grows to 1 when scanned
    const m = new THREE.Matrix4();
    scene.add(voxels);

    // the phone
    const phone = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.24, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xdde6ec, emissive: 0x3fb8af, emissiveIntensity: 0.4 }),
    );
    scene.add(phone);

    // rays: short-lived lines from the phone to the hit voxels
    const RAYS = 14;
    const rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAYS * 6), 3));
    const rays = new THREE.LineSegments(rayGeo, new THREE.LineBasicMaterial({ color: 0x3fb8af, transparent: true, opacity: 0.55 }));
    scene.add(rays);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(3, 5, 4);
    scene.add(light);

    camera.position.set(3.4, 3.0, 4.2);

    let cycle = 0;
    return {
        update(t, dt) {
            // the phone walks on a figure-eight through the room
            const s = t * 0.35;
            phone.position.set(Math.sin(s) * 1.1, 1.0 + Math.sin(s * 2) * 0.1, Math.sin(s * 2) * 0.5 + 0.3);
            phone.lookAt(Math.sin(s + 0.6) * 1.1, 0.9, -1.5);

            // cast rays to random voxels; only a few of them per frame count as a new "hit",
            // so the room is discovered step by step
            const pos = rayGeo.attributes.position as T.BufferAttribute;
            for (let r = 0; r < RAYS; r++) {
                const i = Math.floor(rand() * cells.length);
                if (r < 2) seen[i] = Math.max(seen[i], 0.01);
                const p = toWorld(cells[i]);
                pos.setXYZ(r * 2, phone.position.x, phone.position.y, phone.position.z);
                pos.setXYZ(r * 2 + 1, p.x, p.y, p.z);
            }
            pos.needsUpdate = true;

            // seen voxels "pop" in (grow to full size)
            for (let i = 0; i < cells.length; i++) {
                if (seen[i] > 0 && seen[i] < 1) seen[i] = Math.min(1, seen[i] + dt * 3);
                const k = seen[i];
                const p = toWorld(cells[i]);
                m.makeScale(k, k, k).setPosition(p);
                voxels.setMatrixAt(i, m);
            }
            voxels.instanceMatrix.needsUpdate = true;

            // start again every ~18 seconds
            cycle += dt;
            if (cycle > 18) { cycle = 0; seen.fill(0); }
        },
        target: [0, 0.6, 0],
    };
};