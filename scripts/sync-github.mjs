// ---------------------------------------------------------------------------
// GitHub → portfolio sync
//
// For every public repo of the GitHub account in profile.yml this script
//   1. creates src/content/projects/<repo>.yml if it doesn't exist yet,
//   2. writes a short description (from the repo description or the README),
//   3. translates texts to English and German,
//   4. keeps the project files up to date when the repo changes on GitHub.
//
// Your own edits are safe: the script remembers (in src/data/sync-state.json) what it
// wrote last time. If a text in a project file is different from that, YOU changed it,
// and the script never touches that text again. Files that the script did not create
// (like the hand-written thesis file) are never changed at all, except "updated".
//
// Run it with:  npm run sync
// Optional:     DEEPL_API_KEY=... npm run sync   (better translations, also for READMEs)
// ---------------------------------------------------------------------------
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import YAML from 'yaml';

const ROOT = new URL('..', import.meta.url);
const PROJECTS_DIR = new URL('src/content/projects/', ROOT);
const STATE_FILE = new URL('src/data/sync-state.json', ROOT);

const profile = YAML.parse(await readFile(new URL('src/content/profile/profile.yml', ROOT), 'utf8'));
const OWNER = profile.github.replace(/\/+$/, '').split('/').pop();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;   // set automatically in GitHub Actions
const DEEPL_API_KEY = process.env.DEEPL_API_KEY; // optional

// dates are written in quotes, so they stay text (not a date object) when the website reads them
const quoted = (value) => Object.assign(new YAML.Scalar(value), { type: 'QUOTE_DOUBLE' });
const hash = (value) => createHash('sha1').update(JSON.stringify(value ?? null)).digest('hex').slice(0, 12);
const log = (...args) => console.log('[sync]', ...args);

// ----------------------------- GitHub ---------------------------------------
async function github(path, raw = false) {
    const res = await fetch(`https://api.github.com${path}`, {
        headers: {
            Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
            'User-Agent': 'portfolio-sync',
            ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
        },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path}`);
    return raw ? res.text() : res.json();
}

// ----------------------------- README → texts -------------------------------
// Make the README usable on the website: remove the big title and badges,
// and turn relative links/images into full GitHub links.
function cleanReadme(md, repo) {
    const rawBase = `https://raw.githubusercontent.com/${OWNER}/${repo.name}/${repo.default_branch}/`;
    const blobBase = `https://github.com/${OWNER}/${repo.name}/blob/${repo.default_branch}/`;
    return md
        .replace(/\r\n/g, '\n')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/^\s*#\s+.*\n/, '')                                   // first "# Title" line
        .replace(/^\s*(\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*)+$/gm, '') // badge lines
        .replace(/^\s*(!\[[^\]]*\]\([^)]*shields\.io[^)]*\)\s*)+$/gm, '')
        .replace(/(!\[[^\]]*\]\()(?!https?:|data:)\.?\/?([^)\s]+)/g, (_, pre, url) => pre + rawBase + url)
        .replace(/((?<!!)\[[^\]]*\]\()(?!https?:|#|mailto:)\.?\/?([^)\s]+)/g, (_, pre, url) => pre + blobBase + url)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// The first real paragraph of the README, as plain text, max. ~280 characters.
function firstParagraph(md) {
    const text = md
        .replace(/```[\s\S]*?```/g, '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .find((p) => p.length > 40 && !/^(#|!\[|<|\||[-*+] |\d+\. |>)/.test(p));
    if (!text) return '';
    const plain = text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (plain.length <= 280) return plain;
    const cut = plain.slice(0, 280);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return end > 100 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + ' …';
}

// "occupancy-mapper-ios" → "Occupancy Mapper Ios"
const humanize = (name) => name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ----------------------------- Translation ----------------------------------
// Very simple language guess: count common German and English words.
function detectLanguage(text) {
    const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
    const de = new Set(['und', 'der', 'die', 'das', 'ist', 'mit', 'für', 'eine', 'ein', 'nicht', 'auf', 'von', 'zu', 'wird', 'werden', 'sich', 'auch', 'über', 'den', 'dem']);
    const en = new Set(['the', 'and', 'is', 'with', 'for', 'a', 'an', 'not', 'on', 'of', 'to', 'this', 'that', 'are', 'be', 'from', 'in', 'it']);
    let score = 0;
    for (const w of words) score += de.has(w) ? 1 : en.has(w) ? -1 : 0;
    return score > 0 ? 'de' : 'en';
}

async function deepl(texts, target) {
    const host = DEEPL_API_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    const res = await fetch(`https://${host}/v2/translate`, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texts, target_lang: target === 'en' ? 'EN-US' : 'DE' }),
    });
    if (!res.ok) throw new Error(`DeepL answered ${res.status}`);
    return (await res.json()).translations.map((t) => t.text);
}

async function mymemory(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}&de=${encodeURIComponent(profile.email)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory answered ${res.status}`);
    const data = await res.json();
    if (data.responseStatus !== 200) throw new Error(`MyMemory: ${data.responseDetails}`);
    return data.responseData.translatedText;
}

// Translate one text. Code blocks in Markdown are kept as they are.
// Without a DeepL key, only short texts (descriptions) are translated, with MyMemory.
async function translate(text, from, to, { long = false } = {}) {
    if (!text || from === to) return text;
    try {
        if (DEEPL_API_KEY) {
            const parts = text.split(/(```[\s\S]*?```)/g);
            const prose = parts.map((p, i) => (i % 2 === 0 && p.trim() ? p : null));
            const todo = prose.filter((p) => p !== null);
            const done = todo.length ? await deepl(todo, to) : [];
            let k = 0;
            return parts.map((p, i) => (prose[i] !== null ? done[k++] : p)).join('');
        }
        if (long || text.length > 450) return '';   // too long for the free service
        return await mymemory(text, from, to);
    } catch (err) {
        log(`  translation failed (${err.message}) – the website will show the original text`);
        return '';
    }
}

// { en, de } from a text in one language
async function bilingual(text, options) {
    if (!text) return { en: '', de: '' };
    const from = detectLanguage(text);
    const to = from === 'en' ? 'de' : 'en';
    const other = await translate(text, from, to, options);
    return from === 'en' ? { en: text, de: other } : { en: other, de: text };
}

// ----------------------------- Main -----------------------------------------
const state = existsSync(STATE_FILE) ? JSON.parse(await readFile(STATE_FILE, 'utf8')) : {};
await mkdir(new URL('src/data/', ROOT), { recursive: true });

log(`reading public repos of ${OWNER} …`);
const repos = (await github(`/users/${OWNER}/repos?per_page=100&type=owner&sort=pushed`)) ?? [];
const seen = new Set();
let created = 0, updated = 0;

for (const repo of repos) {
    if (repo.private) continue;
    seen.add(repo.name);
    const file = new URL(`${repo.name}.yml`, PROJECTS_DIR);
    const memory = state[repo.name];   // what the script wrote last time (undefined = hand-written file)

    const readme = cleanReadme((await github(`/repos/${OWNER}/${repo.name}/readme`, true)) ?? '', repo);
    const summary = repo.description?.trim() || firstParagraph(readme);
    const topics = repo.topics ?? [];
    const source = hash({ summary, readme, topics });

    if (!existsSync(file)) {
        // ---- new repo: create the project file ----
        const description = await bilingual(summary);
        const body = await bilingual(readme, { long: true });
        const isPortfolio = repo.name.toLowerCase() === `${OWNER}.github.io`.toLowerCase();
        const data = {
            repo: repo.name,
            title: humanize(repo.name),
            hidden: repo.fork || isPortfolio,   // forks and this website itself are hidden at first
            featured: false,
            order: 100,
            description,
            tags: topics,
            language: repo.language ?? '',
            demo3d: 'auto',
            demo: repo.homepage ?? '',
            updated: quoted(repo.pushed_at.slice(0, 10)),
            body,
        };
        const doc = new YAML.Document(data);
        doc.commentBefore =
            ' Created automatically from GitHub. You can change anything in this file.\n' +
            ' Texts you change are never overwritten by the sync. hidden: true removes the project from the website.';
        await writeFile(file, doc.toString({ lineWidth: 0 }));
        state[repo.name] = { source, description: hash(description), body: hash(body), tags: hash(topics) };
        log(`+ created ${repo.name}.yml${data.hidden ? ' (hidden)' : ''}`);
        created++;
        continue;
    }

    // ---- existing file: update only what you haven't changed yourself ----
    const doc = YAML.parseDocument(await readFile(file, 'utf8'));
    const current = doc.toJS();
    let changed = false;
    const set = (key, value) => {
        if (JSON.stringify(current[key]) !== JSON.stringify(value)) { doc.set(key, value); changed = true; }
    };

    if (current.updated !== repo.pushed_at.slice(0, 10)) { doc.set('updated', quoted(repo.pushed_at.slice(0, 10))); changed = true; }
    if (!current.language && repo.language) set('language', repo.language);

    if (memory) {
        const sourceChanged = memory.source !== source;
        // a translation that failed last time (one language empty) is tried again
        const missingTranslation = (v) => v && typeof v === 'object' && (!v.en || !v.de);

        const autoUpdate = async (key, make) => {
            const untouched = memory[key] === hash(current[key]);
            if (!sourceChanged && !(untouched && missingTranslation(current[key]))) return;
            if (!untouched) {
                if (sourceChanged) log(`  ${repo.name}: "${key}" was edited by you – kept`);
                return;
            }
            const value = await make();
            set(key, value);
            memory[key] = hash(value);
        };
        await autoUpdate('description', () => bilingual(summary));
        await autoUpdate('body', () => bilingual(readme, { long: true }));
        await autoUpdate('tags', async () => topics);
        memory.source = source;
    }

    if (changed) {
        await writeFile(file, doc.toString({ lineWidth: 0 }));
        log(`~ updated ${repo.name}.yml`);
        updated++;
    }
}

// repos that were deleted or made private on GitHub: hide their (automatic) project files
for (const name of Object.keys(state)) {
    if (seen.has(name)) continue;
    const file = new URL(`${name}.yml`, PROJECTS_DIR);
    if (!existsSync(file)) { delete state[name]; continue; }
    const doc = YAML.parseDocument(await readFile(file, 'utf8'));
    if (doc.get('hidden') !== true) {
        doc.set('hidden', true);
        await writeFile(file, doc.toString({ lineWidth: 0 }));
        log(`- ${name} is no longer public on GitHub – hidden`);
    }
}

const sorted = Object.fromEntries(Object.entries(state).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(STATE_FILE, JSON.stringify(sorted, null, 2) + '\n');
log(`done: ${created} created, ${updated} updated, ${repos.length} repos checked`);