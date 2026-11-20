export interface Social {
  label: 'GitHub' | 'LinkedIn' | 'X';
  href: string;
}

export interface Fact {
  label: string;
  value: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectImage {
  /** Path under /public, e.g. /work/flx.png. Rendered desaturated, per Tenebris imagery rules. */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Project {
  slug: string;
  name: string;
  /** One sentence of context, one of outcome. */
  summary: string;
  year: string;
  role: string;
  tags: string[];
  /** The flagship case study. Exactly one project should set this. */
  featured?: boolean;
  /** Problem → approach → outcome: one paragraph each. */
  problem: string;
  approach: string;
  outcome: string;
  facts?: Fact[];
  links?: ProjectLink[];
  image?: ProjectImage;
  /** Placeholder content: rendered, but left out of structured data. */
  draft?: boolean;
}

export interface Role {
  role: string;
  company: string;
  location?: string;
  /** Year, e.g. "2023". */
  start: string;
  /** Year, or null for the current role. */
  end: string | null;
  /** One or two lines. */
  summary: string;
}

export interface SkillGroup {
  name: string;
  items: string[];
}

export interface Article {
  title: string;
  /** ISO date, e.g. "2026-09-14". */
  date: string;
  source: 'LinkedIn' | 'Medium' | 'Blog';
  href: string;
}
