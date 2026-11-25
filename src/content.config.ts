import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A text in both languages: { en: "...", de: "..." }
const text = z.object({ en: z.string().default(''), de: z.string().default('') });

// Your profile: photo, texts, contact, skills, experience, education, languages
const profile = defineCollection({
    loader: glob({ pattern: '*.yml', base: './src/content/profile' }),
    schema: z.object({
        name: z.string(),
        role: text,
        headline: text,
        about: text,
        available: z.boolean().default(true),
        availability: text,
        location: z.string(),
        email: z.string(),
        phone: z.string().default(''),
        github: z.string(),
        linkedin: z.string().default(''),
        photo: z.string(),
        skills: z.array(z.object({ group: text, items: z.array(z.string()) })).default([]),
        experience: z.array(z.object({
            title: text, org: z.string(), period: text,
            points: z.object({ en: z.array(z.string()).default([]), de: z.array(z.string()).default([]) }).optional(),
        })).default([]),
        education: z.array(z.object({
            degree: text, school: z.string(), period: text, details: text.optional(),
        })).default([]),
        languages: z.array(z.object({ name: text, level: text })).default([]),
    }),
});

// One file per GitHub project
const projects = defineCollection({
    loader: glob({ pattern: '*.yml', base: './src/content/projects' }),
    schema: z.object({
        repo: z.string(),
        title: z.string(),
        hidden: z.boolean().default(false),   // true = not shown on the website
        featured: z.boolean().default(false), // true = shown at the top
        order: z.number().default(100),       // smaller number = higher up
        description: text,
        tags: z.array(z.string()).default([]),
        image: z.string().default(''),
        demo: z.string().default(''),
        highlights: z.array(z.object({ label: text, value: z.string() })).default([]),
        body: text.optional(),
    }),
});

export const collections = { profile, projects };