// Ride sharing: cars drive through a small city and pick up passengers.
import type * as T from 'three';
import type { SceneFactory } from './types';

export const city: SceneFactory = ({ THREE, scene, camera, color, rand }) => {
    const N = 7;              // blocks per side
    const S = 0.6;            // block size
    const ROAD = 0.25;        // road width
    const STEP = S + ROAD;
    const half = ((N - 1) * STEP) / 2;

    // buildings: one instanced mesh with random heights
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const buildings = new THREE.InstancedMesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0x1c262e, roughness: 0.9 }),
        N * N,
    );
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const h = 0.15 + rand() * rand() * 1.4;
        m.makeScale(S, h, S).setPosition(i * STEP - half, 0, j * STEP - half);
        buildings.setMatrixAt(i * N + j, m);
    }
    scene.add(buildings);
    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(N * STEP, N * STEP, N, N)),
        new THREE.LineBasicMaterial({ color: 0x233039 }),
    );
    edges.rotation.x = -Math.PI / 2;
    scene.add(edges);

    // cars drive along the roads between the blocks
    type Car = { mesh: T.Mesh; horizontal: boolean; lane: number; offset: number; speed: number };
    const cars: Car[] = [];
    const carGeo = new THREE.BoxGeometry(0.16, 0.08, 0.09);
    for (let c = 0; c < 9; c++) {
        const mesh = new THREE.Mesh(carGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
        const lane = Math.floor(rand() * (N - 1));
        cars.push({ mesh, horizontal: rand() > 0.5, lane, offset: rand() * 10, speed: 0.6 + rand() * 0.6 });
        scene.add(mesh);
    }

    // passengers waiting at the roadside (teal pins that pulse)
    const pins: T.Mesh[] = [];
    const pinGeo = new THREE.ConeGeometry(0.06, 0.18, 12);
    pinGeo.rotateX(Math.PI);
    for (let p = 0; p < 5; p++) {
        const pin = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: 0x3fb8af, emissive: 0x3fb8af, emissiveIntensity: 0.6 }));
        pin.position.set((Math.floor(rand() * (N - 1)) + 0.5) * STEP - half, 0.25, Math.floor(rand() * N) * STEP - half);
        pins.push(pin);
        scene.add(pin);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const light = new THREE.DirectionalLight(0xffffff, 1.4);
    light.position.set(-3, 6, 2);
    scene.add(light);

    camera.position.set(4, 4.2, 4);
    const span = N * STEP;
    return {
        update(t) {
            for (const car of cars) {
                const along = ((t * car.speed + car.offset) % span) - span / 2;
                const across = (car.lane + 0.5) * STEP - half;
                if (car.horizontal) { car.mesh.position.set(along, 0.05, across); car.mesh.rotation.y = 0; }
                else { car.mesh.position.set(across, 0.05, along); car.mesh.rotation.y = Math.PI / 2; }
            }
            pins.forEach((pin, i) => { pin.position.y = 0.28 + Math.sin(t * 3 + i) * 0.05; });
        },
        target: [0, 0, 0],
    };
};