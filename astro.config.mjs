// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://mohamedalikhalfallah.github.io',
    i18n: {
        locales: ['en', 'de'],
        defaultLocale: 'en',
        routing: {
            prefixDefaultLocale: true,
            redirectToDefaultLocale: false,
        },
    },
});