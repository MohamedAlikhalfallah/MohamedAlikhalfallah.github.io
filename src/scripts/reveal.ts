// Scroll animations: when a section scrolls into view, an amber "scan line" sweeps over it
// and its contents rise up out of a slight 3D tilt, one after another.
// Elements that are already visible when the page opens are left alone (no flicker),
// and nothing moves for visitors who turned off animations in their system settings.

const SECTIONS = 'main .section, main .block';
const ITEMS = [
    'main h2',
    'main .card',
    'main .stats',
    'main .cols > *',
    'main .timeline > li',
    'main .skills > div',
    'main .channels > div',
    'main .intro',
    'main .prose > *',
    'main .demo3d.interactive',
    'main .contact-form',
].join(', ');

export function setupReveal(signal: AbortSignal) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    signal.addEventListener('abort', () => observer.disconnect());

    const belowTheFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;

    document.querySelectorAll(SECTIONS).forEach((el) => {
        if (!belowTheFold(el)) return;
        el.classList.add('reveal-scan');
        observer.observe(el);
    });

    document.querySelectorAll<HTMLElement>(ITEMS).forEach((el) => {
        if (!belowTheFold(el)) return;
        // elements next to each other start a little after one another
        const index = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
        el.style.setProperty('--delay', `${(index % 6) * 90}ms`);
        el.classList.add('reveal');
        observer.observe(el);
    });
}