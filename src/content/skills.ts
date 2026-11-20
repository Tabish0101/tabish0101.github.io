import type { SkillGroup } from './types';

// TODO(content): trim to what you actually reach for. The frontend group is what this site runs on.
export const skills: SkillGroup[] = [
  { name: 'Languages', items: ['TypeScript', 'JavaScript', 'SQL'] },
  { name: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'Three.js', 'GSAP', 'ShadCN UI', 'Material UI (MUI)', 'Framer Motion', 'TanStack Query', 'Redux Toolkit', 'Context API'] },
  { name: 'Backend', items: ['Node.js', 'NestJS', 'REST APIs', 'PostgreSQL', 'MongoDB', 'Redis', 'Clerk',] },
  { name: 'Infrastructure', items: ['AWS', 'Vercel', 'Linux Server Administration', 'Netlify', 'Nginx', 'SSL/TLS'] },
  {
    name: 'Practice',
    items: ['System design', 'Data modeling', 'API design', 'Observability', 'Testing'],
  },
];


// , Material UI (MUI), Framer Motion, TanStack
// Query, Redux Toolkit, Context API.

// , Express.js, REST APIs, Clerk, 

// , , SSL/TLS
// (Certbot), , Vercel, , PM2.