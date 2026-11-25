// Occupancy grid animation (used in the hero and in the top bar).
// A sensor sweeps rays across a map. Cells along a ray become "free" (teal),
// the cell where the ray hits a wall becomes "occupied" (amber).
// Each cell stores a log-odds value, exactly like in the thesis, and slowly fades back.

export interface GridOptions {
    cell: number;                                // cell size in pixels
    layout: 'room' | 'corridor';                 // room = hero, corridor = slim top bar
    sensor: () => { x: number; y: number };      // sensor position in pixels, relative to the canvas
    rays?: number;                               // rays per frame
    maxOccupied?: number;                        // max opacity of occupied cells
    maxFree?: number;                            // max opacity of free cells
    followSensor?: boolean;                      // re-read the sensor position every frame (it moves)
    signal?: AbortSignal;                        // stop everything when the page is left
}

export function startOccupancyGrid(canvas: HTMLCanvasElement, opts: GridOptions) {
    const ctx = canvas.getContext('2d')!;
    const CELL = opts.cell;
    const RAYS = opts.rays ?? 24;
    const MAX_OCC = opts.maxOccupied ?? 0.45;
    const MAX_FREE = opts.maxFree ?? 0.12;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cols = 0, rows = 0;
    let logOdds = new Float32Array(0);
    let walls = new Uint8Array(0);
    let sensor = { x: 0, y: 0 };
    let angle = 0;
    let visible = false;   // canvas is on screen
    let active = true;     // allowed to run (the top bar switches this on and off)
    let running = false;

    function build() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.ceil(canvas.clientWidth / CELL);
        rows = Math.ceil(canvas.clientHeight / CELL);
        logOdds = new Float32Array(cols * rows);
        walls = new Uint8Array(cols * rows);

        const wall = (x: number, y: number) => {
            if (x >= 0 && y >= 0 && x < cols && y < rows) walls[y * cols + x] = 1;
        };
        const rect = (x0: number, y0: number, w: number, h: number) => {
            for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) wall(x, y);
        };

        if (opts.layout === 'room') {
            // outer walls with a door gap, plus some furniture
            for (let x = 1; x < cols - 1; x++) { wall(x, 1); if (x < cols * 0.4 || x > cols * 0.48) wall(x, rows - 2); }
            for (let y = 1; y < rows - 1; y++) { wall(1, y); wall(cols - 2, y); }
            rect(Math.floor(cols * 0.12), Math.floor(rows * 0.2), 4, 3);
            rect(Math.floor(cols * 0.35), Math.floor(rows * 0.68), 6, 2);
            rect(Math.floor(cols * 0.86), Math.floor(rows * 0.25), 2, 6);
            rect(Math.floor(cols * 0.55), Math.floor(rows * 0.15), 3, 2);
        } else {
            // a long corridor: walls on top and bottom, with small pillars
            for (let x = 0; x < cols; x++) { wall(x, 0); wall(x, rows - 1); }
            for (let x = 9; x < cols; x += 17) rect(x, x % 2 ? 1 : rows - 3, 2, 2);
        }

        const s = opts.sensor();
        sensor = { x: s.x / CELL, y: s.y / CELL };
    }

    // Walk along a ray cell by cell until it hits a wall
    function castRay(a: number) {
        const dx = Math.cos(a), dy = Math.sin(a);
        let x = sensor.x, y = sensor.y;
        for (let step = 0; step < 2 * (cols + rows); step++) {
            x += dx * 0.5; y += dy * 0.5;
            const cx = Math.floor(x), cy = Math.floor(y);
            if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
            const i = cy * cols + cx;
            if (walls[i]) { logOdds[i] = Math.min(3.5, logOdds[i] + 0.9); return; } // occupied
            logOdds[i] = Math.max(-2, logOdds[i] - 0.25);                              // free
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const v = logOdds[y * cols + x];
                if (v > 0.05) ctx.fillStyle = `rgba(245,184,65,${Math.min(MAX_OCC, v * 0.14)})`;
                else if (v < -0.05) ctx.fillStyle = `rgba(63,184,175,${Math.min(MAX_FREE, -v * 0.06)})`;
                else ctx.fillStyle = 'rgba(35,48,57,0.35)';
                ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
            }
        }
    }

    function tick() {
        if (!visible || !active || opts.signal?.aborted) { running = false; return; }
        for (let i = 0; i < logOdds.length; i++) logOdds[i] *= 0.996;   // slowly forget
        for (let k = 0; k < RAYS; k++) castRay(angle + k * 0.01);       // a fan of rays
        angle += 0.04;
        if (opts.followSensor) { const s = opts.sensor(); sensor = { x: s.x / CELL, y: s.y / CELL }; }
        draw();
        requestAnimationFrame(tick);
    }

    function update() {
        if (reduceMotion) return;
        if (visible && active && !running) { running = true; requestAnimationFrame(tick); }
    }

    build();
    if (reduceMotion) {
        // no animation: scan everything once and show the finished map
        for (let a = 0; a < Math.PI * 2; a += 0.004) castRay(a);
        draw();
    }

    // only animate while the canvas is on screen
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(canvas);
    window.addEventListener('resize', () => { build(); draw(); }, { signal: opts.signal });
    opts.signal?.addEventListener('abort', () => observer.disconnect());

    return {
        setActive(value: boolean) { active = value; update(); },
        rebuild() { build(); draw(); },
    };
}