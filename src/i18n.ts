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
        'nav.skills': 'Skills',
        'nav.contact': 'Contact',
        'switch.label': 'Deutsch',
        'hero.projects': 'See my projects',
        'hero.contact': 'Get in touch',
        'about.location': 'Location',
        'about.degree': 'Degree',
        'about.languages': 'Languages',
        'projects.featured': 'Featured',
        'projects.code': 'Source code',
        'projects.demo': 'Live demo',
        'projects.empty': 'Projects from GitHub will appear here.',
        'projects.details': 'Read more',
        'project.back': 'All projects',
        'project.overview': 'About this project',
        'project.demo': 'Demo',
        'project.demoHint': 'Drag to turn the 3D view.',
        'exp.work': 'Work',
        'exp.education': 'Education',
        'contact.text': 'I’m looking for a junior software engineering role. Write me an email or connect on LinkedIn.',
        'contact.email': 'Email',
        'contact.phone': 'Phone',
        'form.title': 'Send me a message',
        'form.name': 'Your name',
        'form.email': 'Your email',
        'form.message': 'Your message',
        'form.send': 'Send message',
        'form.sending': 'Sending…',
        'form.success': 'Thank you! Your message was sent. I’ll reply as soon as I can.',
        'form.error': 'The message could not be sent. Please try again, or write me an email directly.',
        'form.privacy': 'Your message is sent to me through the service Web3Forms. Details are in the',
        'form.privacyLink': 'privacy policy',
        'footer.built': 'Built with Astro. Projects sync from GitHub.',
    },
    de: {
        'nav.about': 'Über mich',
        'nav.projects': 'Projekte',
        'nav.experience': 'Werdegang',
        'nav.skills': 'Kenntnisse',
        'nav.contact': 'Kontakt',
        'switch.label': 'English',
        'hero.projects': 'Zu meinen Projekten',
        'hero.contact': 'Kontakt aufnehmen',
        'about.location': 'Standort',
        'about.degree': 'Abschluss',
        'about.languages': 'Sprachen',
        'projects.featured': 'Hervorgehoben',
        'projects.code': 'Quellcode',
        'projects.demo': 'Live-Demo',
        'projects.empty': 'Hier erscheinen Projekte von GitHub.',
        'projects.details': 'Mehr erfahren',
        'project.back': 'Alle Projekte',
        'project.overview': 'Über das Projekt',
        'project.demo': 'Demo',
        'project.demoHint': 'Ziehen, um die 3D-Ansicht zu drehen.',
        'exp.work': 'Berufserfahrung',
        'exp.education': 'Ausbildung',
        'contact.text': 'Ich suche eine Junior-Stelle in der Softwareentwicklung. Schreiben Sie mir eine E-Mail oder vernetzen Sie sich auf LinkedIn.',
        'contact.email': 'E-Mail',
        'contact.phone': 'Telefon',
        'form.title': 'Schreiben Sie mir eine Nachricht',
        'form.name': 'Ihr Name',
        'form.email': 'Ihre E-Mail-Adresse',
        'form.message': 'Ihre Nachricht',
        'form.send': 'Nachricht senden',
        'form.sending': 'Wird gesendet …',
        'form.success': 'Vielen Dank! Ihre Nachricht wurde gesendet. Ich antworte so schnell wie möglich.',
        'form.error': 'Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie mir direkt eine E-Mail.',
        'form.privacy': 'Ihre Nachricht wird über den Dienst Web3Forms an mich gesendet. Details finden Sie in der',
        'form.privacyLink': 'Datenschutzerklärung',
        'footer.built': 'Gebaut mit Astro. Projekte werden von GitHub synchronisiert.',
    },
} as const;

export type UIKey = keyof (typeof ui)['en'];

export function useUI(lang: Lang) {
    return (key: UIKey) => ui[lang][key];
}