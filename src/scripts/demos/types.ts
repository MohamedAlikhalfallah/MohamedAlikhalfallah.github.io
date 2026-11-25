import type * as THREE_NS from 'three';

// Everything a scene needs to build itself
export interface SceneContext {
    THREE: typeof THREE_NS;
    scene: THREE_NS.Scene;
    camera: THREE_NS.PerspectiveCamera;
    color: THREE_NS.Color;     // main colour (amber, or the colour of the project's language)
    rand: () => number;        // random numbers 0…1, always the same for the same project
}

// A scene only has to say what happens every frame
export interface DemoScene {
    update(time: number, delta: number): void;
    target?: [number, number, number];   // the point the camera looks at and turns around
}

export type SceneFactory = (ctx: SceneContext) => DemoScene;