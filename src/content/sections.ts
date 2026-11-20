import { writing } from './writing';

export interface SectionMeta {
  id: string;
  label: string;
  /** Editorial number: "02", "03" … */
  number: string;
}

const ORDER: Array<{ id: string; label: string; enabled?: boolean }> = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'writing', label: 'Writing', enabled: writing.length > 0 },
  { id: 'contact', label: 'Contact' },
];

/** The hero is 01, so sections count from 02. An omitted section leaves no gap in the numbering. */
export const sections: SectionMeta[] = ORDER.filter((s) => s.enabled !== false).map((s, i) => ({
  id: s.id,
  label: s.label,
  number: String(i + 2).padStart(2, '0'),
}));

export function sectionMeta(id: string): SectionMeta {
  const meta = sections.find((s) => s.id === id);
  if (!meta) throw new Error(`Unknown or disabled section: ${id}`);
  return meta;
}

export const hasSection = (id: string) => sections.some((s) => s.id === id);
