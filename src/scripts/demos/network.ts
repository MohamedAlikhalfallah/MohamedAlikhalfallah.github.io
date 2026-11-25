// Web projects: a client–server network. Requests travel as glowing dots along the connections.
import type * as T from 'three';
import type { SceneFactory } from './types';

export const network: SceneFactory = ({ THREE, scene, camera, color, rand }) => {
    // nodes on a sphere-like cloud; the first one is the "server" in the middle
    const nodes: T.Vector3[] = [new THREE.Vector3(0, 0, 0)];
    for (let i = 0; i < 18; i++) {
        const theta = rand() * Math.PI * 2, phi = Math.acos(2 * rand() - 1), r = 1.3 + rand() * 0.9;
        nodes.push(new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.7, r * Math.sin(phi) * Math.sin(theta)));
    }
    const group = new THREE.Group();
    scene.add(group);

    const nodeMat = new THREE.MeshStandardMaterial({ color: 0x8797a3, roughness: 0.5 });
    nodes.forEach((p, i) => {
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(i === 0 ? 0.28 : 0.07, i === 0 ? 1 : 0), i === 0
            ? new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, flatShading: true })
            : nodeMat);
        mesh.position.copy(p);
        group.add(mesh);
    });

    // connections: every node to the server, plus some between neighbours
    const links: [number, number][] = [];
    for (let i = 1; i < nodes.length; i++) {
        links.push([0, i]);
        if (rand() > 0.6) links.push([i, 1 + Math.floor(rand() * (nodes.length - 1))]);
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(links.flatMap(([a, b]) => [nodes[a], nodes[b]]));
    group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x233039 })));

    // "requests": small dots that travel along the links
    const pulses = links.map(() => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3fb8af }));
        group.add(dot);
        return { dot, offset: rand() * 3, speed: 0.4 + rand() * 0.5 };
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.PointLight(0xffffff, 8);
    light.position.set(2, 3, 3);
    scene.add(light);
    camera.position.set(0, 0.8, 4.6);

    return {
        update(t) {
            pulses.forEach(({ dot, offset, speed }, i) => {
                const [a, b] = links[i];
                const k = (t * speed + offset) % 1;
                const forward = Math.floor(t * speed + offset) % 2 === 0;   // request goes out, response comes back
                dot.position.lerpVectors(nodes[forward ? b : a], nodes[forward ? a : b], k);
            });
        },
    };
};