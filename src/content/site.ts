import type { Fact, Social } from './types';

/**
 * Identity and copy. Everything the page says lives in src/content — components only lay it out.
 * Lines marked TODO(content) are drafts or placeholders to replace before launch.
 */
export const site = {
  name: 'Tabish Jeelani',
  role: 'Full Stack Engineer',
  positioning: 'Systems-minded full-stack engineer',
  location: 'Islamabad',
  country: 'PK',
  coordinates: '33.6844° N, 73.0479° E',
  timeZone: 'Asia/Karachi',
  timeZoneLabel: 'PKT',
  email: 'tabishjeelani93@gmail.com',
  url: 'https://tabish0101.github.io/portfolio',
  /** Drop a PDF at public/resume.pdf and the download links appear. */
  resumePath: '/resume.pdf',
  description:
    'Tabish Jeelani is a systems-minded full-stack engineer in Islamabad who designs software from the data model up and builds it end to end.',
} as const;

// TODO(content): replace with your profile URLs. A link to a bare domain is still shown on
// the page, but left out of the structured data (schema.org sameAs).
export const socials: Social[] = [
  { label: 'GitHub', href: 'https://github.com/Tabish0101' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tabishjeelani/' },
  { label: 'X', href: 'https://x.com/JeelaniTabish' },
];

// TODO(content): draft copy in the Tenebris voice — confirm it is yours, especially the stack.
export const about = {
  title: 'I build software from the data model up.',
  paragraphs: [
    'I’m a full-stack engineer based in Islamabad. I work across the whole path of a request — interface, API, queue, database — and most of my attention goes to the seams between them.',
    'I care about architecture that survives contact with production: data models that absorb new requirements, services with explicit contracts, and failure modes chosen on purpose rather than discovered later.',
    'Day to day that means TypeScript on both sides of the wire, React and Next.js at the edge, Node.js services behind them and PostgreSQL underneath.',
  ],
  facts: [
    { label: 'Based in', value: 'Islamabad, Pakistan' },
    { label: 'Time zone', value: 'PKT · UTC+5' },
    { label: 'Focus', value: 'Systems architecture, full-stack product' },
    // TODO(content): your degree and institution.
    { label: 'Education', value: 'Computer Engineer — NUST' },
  ] satisfies Fact[],
};

export const contact = {
  title: 'Let’s talk.',
  intro: 'Hiring, collaborating, or comparing notes on architecture — email is the fastest way in.',
};
