// Robotics: a robot arm picks up a box and places it somewhere else (pick and place).
import type { SceneFactory } from './types';

export const robotArm: SceneFactory = ({ THREE, scene, camera, color }) => {
    const metal = new THREE.MeshStandardMaterial({ color: 0x8797a3, roughness: 0.4, metalness: 0.6 });
    const accent = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });

    // floor grid
    const grid = new THREE.GridHelper(6, 24, 0x233039, 0x233039);
    scene.add(grid);

    // the arm: base → shoulder → upper arm → elbow → forearm → gripper
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.25, 32), metal);
    base.position.y = 0.125;
    scene.add(base);

    const turn = new THREE.Group();          // rotates around the vertical axis
    turn.position.y = 0.25;
    scene.add(turn);

    const shoulder = new THREE.Group();
    shoulder.position.y = 0.15;
    turn.add(shoulder);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), accent);
    upper.position.y = 0.55;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = 1.1;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.9, 0.13), accent);
    fore.position.y = 0.45;
    elbow.add(fore);

    const wrist = new THREE.Group();
    wrist.position.y = 0.9;
    elbow.add(wrist);
    const fingerGeo = new THREE.BoxGeometry(0.04, 0.2, 0.12);
    const f1 = new THREE.Mesh(fingerGeo, metal);
    const f2 = new THREE.Mesh(fingerGeo, metal);
    wrist.add(f1, f2);

    // the box that gets picked up
    const cargo = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x3fb8af, roughness: 0.5 }),
    );
    scene.add(cargo);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(2, 4, 3);
    scene.add(light);

    // joint angles for each phase: [turn, shoulder, elbow, gripper open]
    const pick = [0.9, 0.9, 1.5, 0];     // the gripper reaches the floor about 1.47 away from the base
    const place = [-0.9, 0.9, 1.5, 0];
    const up = [0, -0.1, 1.2, 0];
    const keys = [
        { t: 0, pose: up, open: 1, carry: false },
        { t: 1.5, pose: pick, open: 1, carry: false },
        { t: 2.1, pose: pick, open: 0, carry: true },
        { t: 3.6, pose: up, open: 0, carry: true },
        { t: 5.1, pose: place, open: 0, carry: true },
        { t: 5.7, pose: place, open: 1, carry: false },
        { t: 7.2, pose: up, open: 1, carry: false },
    ];
    const LOOP = 7.2;
    const ease = (x: number) => x * x * (3 - 2 * x);
    const tmp = new THREE.Vector3();
    let side = 1;   // the box moves back and forth between the two spots
    let lastPhase = 0;

    camera.position.set(2.6, 2.0, 3.0);

    return {
        update(t) {
            const local = t % LOOP;
            const phase = Math.floor(t / LOOP);
            if (phase !== lastPhase) { lastPhase = phase; side *= -1; }

            let k = 0;
            while (k < keys.length - 2 && local > keys[k + 1].t) k++;
            const a = keys[k], b = keys[k + 1];
            const f = ease(Math.min(1, (local - a.t) / (b.t - a.t)));
            const lerp = (i: number) => a.pose[i] + (b.pose[i] - a.pose[i]) * f;

            turn.rotation.y = lerp(0) * side;
            shoulder.rotation.z = lerp(1);
            elbow.rotation.z = lerp(2);
            wrist.rotation.z = Math.PI - shoulder.rotation.z - elbow.rotation.z; // keep the gripper pointing down
            const open = a.open + (b.open - a.open) * f;
            f1.position.set(0, 0.1, -0.08 - open * 0.06);
            f2.position.set(0, 0.1, 0.08 + open * 0.06);

            const R = 1.47;   // distance of the two spots from the base
            if (a.carry && b.carry) {
                // the box hangs in the gripper
                wrist.getWorldPosition(tmp);
                cargo.position.set(tmp.x, tmp.y - 0.31, tmp.z);
            } else {
                // the box stands on the floor: at the start spot before grabbing, at the end spot after
                const angle = (local < 2.1 ? 0.9 : -0.9) * side;
                cargo.position.set(-Math.cos(angle) * R, 0.11, Math.sin(angle) * R);
            }
        },
        target: [0, 0.6, 0],
    };
};