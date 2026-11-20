import type { Role } from './types';

/**
 * Career timeline, latest first. Not a résumé — one or two lines per role.
 * TODO(content): every entry below is a placeholder. Replace titles, companies, years and lines.
 */
export const experience: Role[] = [
  {
    role: 'Full Stack Engineer',
    company: 'Ziel Global',
    location: 'Islamabad',
    start: '2026',
    end: null,
    summary:
      'Architecture and delivery across the FLX logistics marketplace — services, data model and the web apps on top of them.',
  },
  {
    role: 'Associate Software Developer',
    company: 'Bikter Tech — Stanify.ai',
    location: 'Islamabad',
    start: '2024',
    end: '2026',
    summary: 'Full-stack engineer who shipped a multi-app B2B logistics platform end-to-end — from Figma-to-UI and Redux state management through REST API design, auth, and AWS deployment — in an Agile team.',
  },
  {
    role: 'Frontend Developer — React',
    company: 'Cyberify',
    location: 'Remote',
    start: '2023',
    end: '2024',
    summary: 'Built responsive React interfaces from design specs, with reusable components, REST API integration, and form/state management.',
  },
  {
    role: 'React Intern',
    company: 'Cyberify',
    location: 'Remote',
    start: '2023',
    end: '2023',
    summary: 'Interned as a React developer — built components from Figma designs, handled API integration and forms, and fixed UI issues alongside senior devs.',
  },
  {
    role: 'Freelance Graphics Designer',
    company: 'Fiverr',
    location: 'Remote',
    start: '2021',
    end: '2023',
    summary: 'Freelanced logo design and brand identity work on Fiverr using Illustrator, Photoshop, and Figma.',
  },
];
