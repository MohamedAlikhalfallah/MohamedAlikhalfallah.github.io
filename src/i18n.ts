export const languages = ['en', 'de'] as const;
export type Lang = (typeof languages)[number];

// Pick the right language from a { en, de } object (falls back to English)
export function t(value: { en?: string; de?: string } | undefined, lang: Lang): string {
    if (!value) return '';
    return value[lang] || value.en || '';
}

// Fixed texts of the website (menus, buttons, headings)
export const ui = {
    en: {
        'nav.about': 'About',
        'nav.projects': 'Projects',
        'nav.experience': 'Experience',
        'nav.contact': 'Contact',
        'switch': 'Deutsch',
    },
    de: {
        'nav.about': 'Über mich',
        'nav.projects': 'Projekte',
        'nav.experience': 'Werdegang',
        'nav.contact': 'Kontakt',
        'switch': 'English',
    },
} as const;

export function useUI(lang: Lang) {
    return (key: keyof (typeof ui)['en']) => ui[lang][key];
}