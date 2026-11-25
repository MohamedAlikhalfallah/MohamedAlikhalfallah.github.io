// Chooses the 3D scene and its colour for a project. Runs when the site is built (no three.js here).

// GitHub's colours for the most common languages
const LANGUAGE_COLORS: Record<string, string> = {
    java: '#b07219',
    typescript: '#3178c6',
    javascript: '#f1e05a',
    python: '#3572a5',
    'c++': '#f34b7d',
    c: '#8f8f8f',
    'c#': '#178600',
    swift: '#f05138',
    kotlin: '#a97bff',
    go: '#00add8',
    rust: '#dea584',
    html: '#e34c26',
    css: '#663399',
    dart: '#00b4ab',
};
const ACCENT = '#f5b841';

interface ProjectLike {
    repo: string;
    demo3d: string;
    language: string;
    tags: string[];
}

// "auto" looks at the repo name, the tags and the language to guess the kind of project
export function pickScene(p: ProjectLike): string {
    if (p.demo3d && p.demo3d !== 'auto') return p.demo3d;
    const words = [p.repo, p.language, ...p.tags].join(' ').toLowerCase();
    if (/ros|robot|moveit|grasp|manipulat/.test(words)) return 'robot-arm';
    if (/ride|taxi|drive|route|uber|maps?\b/.test(words)) return 'city';
    if (/angular|react|vue|svelte|spring|web|api|html|javascript|typescript|node|express/.test(words)) return 'network';
    return 'knot';
}

// hand-picked scenes use the amber accent; automatic ones use the colour of the language
export function pickColor(p: ProjectLike): string {
    if (p.demo3d && p.demo3d !== 'auto') return ACCENT;
    return LANGUAGE_COLORS[p.language.toLowerCase()] ?? ACCENT;
}