// Default for any other project: a unique 3D knot. Its shape comes from the project name,
// so every project looks different – but always the same.
import type { SceneFactory } from './types';

export const knot: SceneFactory = ({ THREE, scene, camera, color, rand }) => {
    const p = 2 + Math.floor(rand() * 4);          // how often it winds around
    const q = 3 + Math.floor(rand() * 4);
    const geo = new THREE.TorusKnotGeometry(1, 0.28 + rand() * 0.12, 160, 18, p, q);

    const solid = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4, flatShading: true }));
    const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x3fb8af, transparent: true, opacity: 0.12 }),
    );
    wire.scale.setScalar(1.04);
    const group = new THREE.Group();
    group.add(solid, wire);
    scene.add(group);

    // a ring of small points around it
    const pts = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
        const a = rand() * Math.PI * 2, r = 2 + rand() * 0.6;
        pts.set([Math.cos(a) * r, (rand() - 0.5) * 0.6, Math.sin(a) * r], i * 3);
    }
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const ring = new THREE.Points(ptsGeo, new THREE.PointsMaterial({ color: 0x8797a3, size: 0.025 }));
    scene.add(ring);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 4, 5);
    scene.add(light);
    camera.position.set(0, 0.6, 5);

    return {
        update(t) {
            group.rotation.set(t * 0.2, t * 0.3, 0);
            ring.rotation.y = -t * 0.1;
        },
    };
};