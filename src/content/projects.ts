import tokens from '@design-system/tokens.json';
import type { Project } from './types';

const tenebris = {
  colors: tokens.color.tokens.length,
  themes: tokens.color.themes.length,
  type: tokens.type.groups.reduce((n, group) => n + group.styles.length, 0),
  spacing: tokens.spacing.tokens.length,
  radii: tokens.radius.tokens.length,
};

/**
 * Selected work, in display order. 3–5 projects: quality over quantity.
 * Add `image` (a real screenshot under /public) to show it in the card and the hover preview.
 */
export const projects: Project[] = [
  {
    slug: 'wikiaps',
    name: 'wikiAPS',
    featured: true,
    summary:
      'A Wikipedia-style knowledge base for every Army Public School in Pakistan — designed to scale from a static site to a community-driven wiki.',
    year: '2026',
    role: 'Architect · full stack',
    tags: ['Next.js', 'TypeScript', 'Supabase', 'MDX'],
    facts: [
      { label: 'Role', value: 'Architect · full stack' },
      { label: 'Surface', value: 'Web app · PWA · content platform' },
      { label: 'Status', value: 'In development' },
    ],
    problem:
      'Pakistan has 200+ Army Public Schools spread across the country, but there is no single, structured source of truth — no place where a student can compare schools, an alumnus can find classmates, or a parent can research options. Information is scattered across outdated school websites, Facebook groups, and word of mouth.',
    approach:
      'Designed a three-phase architecture where each phase is an addition, not a rewrite. Phase 1 is a statically generated Next.js site with MDX content and Zod-validated schemas — think of it like how Stripe's docs are built, but for school data. A data-access layer abstracts content sources so pages never touch the filesystem directly. Phase 2 swaps the layer to Supabase with Postgres, RLS-based authorization, and wiki features (revision history, moderation queues, role-based editing). The schema is DB-ready from day one — every entity carries IDs, slugs, relations, and revision fields even in the MDX phase.',
    outcome:
      'A platform that can serve 200+ schools and their alumni networks. At scale, alumni directories and verified profiles create a natural path to premium features — alumni networking, job boards, and school analytics — a model similar to how LinkedIn monetized professional identity, applied to an underserved network of 500,000+ APSACS graduates.',
  },
  {
    slug: 'flx',
    name: 'FLX',
    summary:
      'A B2B logistics marketplace for Saudi Arabia — warehousing, transport, and fleet management, built end to end.',
    year: '2024',
    role: 'Full stack · architecture',
    tags: ['TypeScript', 'Next.js', 'NestJS', 'PostgreSQL'],
    facts: [
      { label: 'Role', value: 'Full stack · architecture' },
      { label: 'Surface', value: '4 web apps · REST API · admin ops' },
      { label: 'Status', value: 'In production' },
    ],
    problem:
      'Saudi logistics operators — warehouses, transporters, and their customers — had no unified platform to discover, book, and manage storage and shipping. Each side of the market ran on phone calls, spreadsheets, and manual coordination, like how freight brokerage worked before Flexport or Convoy digitized it.',
    approach:
      'Built four interconnected apps (customer, warehouse partner, transporter, admin) on a shared NestJS API with TypeORM and PostgreSQL. Designed a transport module with a two-stage lifecycle — a bidding/selection phase (think Upwork-style proposals) followed by a shipment tracking phase (pickup → transit → delivery) — covering 10 cargo categories from dry goods to hazmat. Modeled drivers as first-class entities with compliance tracking, fleet assignment, and a 5-step registration flow. The frontend uses Redux Toolkit for multi-step booking flows and Clerk for auth with a fresh-token-per-request interceptor pattern.',
    outcome:
      'A production platform serving the Saudi market with 17 PRD documents written for the transport module alone, a full DBML schema, and a system spec pattern reusable across future modules. The architecture handles the complexity that platforms like Uber Freight solve — matching supply and demand across vehicle types, geographies, and compliance requirements — at the B2B level.',
  },
  {
    slug: 'ha-web-architecture',
    name: 'HA Web Architecture',
    summary:
      'A highly available AWS infrastructure — custom VPC, multi-AZ compute, and an ALB with automated failover.',
    year: '2026',
    role: 'Cloud engineering',
    tags: ['AWS', 'VPC', 'ALB', 'EC2'],
    facts: [
      { label: 'Role', value: 'Cloud engineering' },
      { label: 'Surface', value: 'Infrastructure · networking' },
      { label: 'Status', value: 'Architecture exercise' },
    ],
    problem:
      'Most developers deploy to a single server and hope for the best. Understanding how production systems survive failures — AZ outages, instance crashes, network misconfigurations — requires building the infrastructure from scratch, not just reading about it.',
    approach:
      'Provisioned a custom VPC (10.0.0.0/16) with public and private subnets across two Availability Zones — the same multi-AZ pattern that Netflix and other high-availability systems use. Configured defense-in-depth security: stateful Security Groups at the instance level (EC2 accepts traffic only from the ALB, never directly) and stateless NACLs at the subnet level. Added a NAT Gateway so private-subnet instances can pull updates without inbound exposure. Fronted everything with an Application Load Balancer doing round-robin distribution with health checks.',
    outcome:
      'Validated end to end: stopped Apache on one instance and confirmed the ALB rerouted 100% of traffic within 60 seconds, then brought it back after three consecutive health checks. Zero single points of failure at the network or compute layer — the same availability guarantee AWS recommends for production workloads.',
  },
  {
    slug: 'tenebris',
    name: 'Tenebris',
    summary:
      'The design system behind this site. One token file drives every color, type style and spacing step.',
    year: '2026',
    role: 'Design system · front end',
    tags: ['Design tokens', 'Tailwind CSS', 'Next.js', 'Three.js'],
    problem:
      'A portfolio needs an identity that does not compete with the work. Dark themes drift without one: ad-hoc greys, a different accent on every page, type that changes with each component.',
    approach: `Tenebris defines the surface as tokens — ${tenebris.colors} colors across ${tenebris.themes} themes, ${tenebris.type} type styles, ${tenebris.spacing} spacing steps and ${tenebris.radii} radii — each with a usage rule. A build step turns tokens.json into CSS custom properties and Tailwind utilities, and reports every text pair that falls under WCAG contrast.`,
    outcome:
      'One source of truth: a token change reaches every component with no hand-edited CSS, and the amber accent is rationed by rule rather than by taste.',
  },
];

export const featuredProject = projects.find((p) => p.featured) ?? projects[0];
export const otherProjects = projects.filter((p) => p !== featuredProject);