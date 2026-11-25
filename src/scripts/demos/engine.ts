// Starts one 3D demo inside a container and returns a function that stops it again.
// This file (and three.js) is only downloaded when a demo scrolls into view.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneFactory } from './types';
import { occupancy } from './occupancy';
import { robotArm } from './robotArm';
import { city } from './city';
import { network } from './network';
import { knot } from './knot';

const SCENES: Record<string, SceneFactory> = {
    occupancy,
    'robot-arm': robotArm,
    city,
    network,
    knot,
};

// random numbers that are always the same for the same text (e.g. the repo name)
function seeded(text: string) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return () => {
        h = (h + 0x6d2b79f5) | 0;
        let x = Math.imul(h ^ (h >>> 15), 1 | h);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

export interface DemoOptions {
    scene: string;          // which scene: occupancy, robot-arm, city, network, knot
    seed: string;           // usually the repo name
    color: string;          // main colour, e.g. "#f5b841"
    interactive: boolean;   // true on the project page: you can drag to turn it
}

export function mountDemo(container: HTMLElement, opts: DemoOptions): () => void {
    const canvas = container.querySelector('canvas')!;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    const factory = SCENES[opts.scene] ?? knot;
    const demo = factory({ THREE, scene, camera, color: new THREE.Color(opts.color), rand: seeded(opts.seed) });

    // the camera slowly circles around; on the project page you can also drag it
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...(demo.target ?? [0, 0, 0]));
    controls.enabled = opts.interactive;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    controls.update();

    // keep the canvas sharp when the container changes size
    const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const clock = new THREE.Clock();
    if (reduceMotion) {
        // no animation: let the scene run for a few "virtual" seconds, then show one still picture
        for (let t = 0; t < 6; t += 1 / 30) demo.update(t, 1 / 30);
        renderer.render(scene, camera);
    } else {
        renderer.setAnimationLoop(() => {
            const delta = Math.min(clock.getDelta(), 0.05);
            demo.update(clock.elapsedTime, delta);
            controls.update();
            renderer.render(scene, camera);
        });
    }

    // clean up everything (important: browsers only allow a few 3D canvases at the same time)
    return () => {
        renderer.setAnimationLoop(null);
        ro.disconnect();
        controls.dispose();
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();
            const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
            (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => m.dispose());
        });
        renderer.dispose();
    };
}